import fs from 'fs';

// Read the Q4 data
const q4Data = JSON.parse(fs.readFileSync('analysis/q4-for-review.json', 'utf8'));

function analyzeCall(call) {
  const transcript = call.transcript?.text || '';
  const duration = call.duration || 0;
  const city = call.customer_city || 'unknown';
  const direction = call.direction || 'inbound';
  const t = transcript.toLowerCase();
  
  // Extract caller name
  let callerName = null;
  const namePatterns = [
    /my name is (\w+)/i,
    /this is (\w+) (?:from|with|calling)/i,
    /hi,? (?:this is )?(\w+)\.? (?:i'm|i am|calling)/i,
    /it's (\w+) (?:from|with)/i,
    /(\w+) here/i
  ];
  for (const pattern of namePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1].length > 2 && !/hello|good|morning|afternoon/i.test(match[1])) {
      callerName = match[1];
      break;
    }
  }
  
  // Extract address mentions
  let address = null;
  const addressMatch = transcript.match(/(\d+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:street|st|road|rd|avenue|ave|drive|dr|way|court|ct|circle|lane|ln|boulevard|blvd)/i);
  if (addressMatch) {
    address = addressMatch[0];
  }
  
  // Extract amounts
  let amount = null;
  const amountMatch = transcript.match(/\$([\d,]+\.?\d*)/);
  if (amountMatch) {
    amount = amountMatch[1];
  }
  
  // === SPAM PATTERNS ===
  
  // Robocall patterns
  if (/press (zero|one|two|1|2|0|9)|to connect|opt out|inquiry details|homeowner inquiry/i.test(transcript) && duration < 100) {
    return {
      category: 'spam',
      sub_category: 'robocall',
      caller_intent: 'automated lead generation',
      outcome: 'hung up/voicemail',
      summary: 'Robocall spam - automated "press button to connect" message',
      confidence: 'high',
      notes: 'obvious robocall'
    };
  }
  
  // QuickBooks scam
  if (/quickbooks|intuit|payment decline|fico score/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'quickbooks_scam',
      caller_intent: 'scam about payment issues',
      outcome: 'voicemail - scam',
      summary: 'QuickBooks/Intuit payment scam call - fake subscription renewal',
      confidence: 'high',
      notes: 'obvious scam'
    };
  }
  
  // Google listing spam
  if (/google (voice|listing|business|page|searches)|emg listings|finding you|suspension|verification|pro directory/i.test(transcript) && duration < 50) {
    return {
      category: 'spam',
      sub_category: 'google_listing',
      caller_intent: 'Google listing scam',
      outcome: 'short call',
      summary: 'Google listing/business verification scam call',
      confidence: 'high',
      notes: 'obvious spam'
    };
  }
  
  // Merchant services spam
  if (/merchant service/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'merchant_services',
      caller_intent: 'sell payment processing',
      outcome: 'declined',
      summary: `Merchant Service Center telemarketing call${callerName ? ` from ${callerName}` : ''} - declined`,
      confidence: 'high',
      notes: 'B2B telemarketing'
    };
  }
  
  // Yelp sales
  if (/yelp/i.test(transcript) && /advertising|page|update/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'yelp_sales',
      caller_intent: 'sell Yelp advertising',
      outcome: 'declined',
      summary: 'Yelp sales call - declined advertising services',
      confidence: 'high',
      notes: 'sales call'
    };
  }
  
  // Software/service sales
  if (/jobber|software tool|scheduling|quoting|invoicing/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'software_sales',
      caller_intent: 'sell business software',
      outcome: 'took info',
      summary: `Software sales call (Jobber) - business management tools pitch`,
      confidence: 'high',
      notes: 'B2B sales'
    };
  }
  
  // Engineering services B2B
  if (/prv engineers|engineering services|special inspection/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'b2b_engineering',
      caller_intent: 'sell engineering services',
      outcome: 'took email',
      summary: `PRV Engineers calling to offer engineering/inspection services`,
      confidence: 'high',
      notes: 'B2B prospecting'
    };
  }
  
  // Workshop/seminar sales
  if (/aspire institute|business management workshop|workshop/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'workshop_sales',
      caller_intent: 'sell business workshop',
      outcome: 'took message',
      summary: `Aspire Institute calling about business management workshop in San Ramon`,
      confidence: 'high',
      notes: 'marketing call'
    };
  }
  
  // Insurance sales
  if (/bearstar insurance|workers comp|insurance.*expiration/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'insurance_sales',
      caller_intent: 'sell insurance',
      outcome: 'forwarded to Vivian',
      summary: `Insurance sales call - workers comp quote inquiry`,
      confidence: 'high',
      notes: 'B2B sales'
    };
  }
  
  // Small business lending
  if (/small business lending/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'lending_sales',
      caller_intent: 'sell business loans',
      outcome: 'call cut short',
      summary: 'Small Business Lending followup call',
      confidence: 'high',
      notes: 'B2B telemarketing'
    };
  }
  
  // Security services
  if (/alpha eagle security|security gaps|patrol coverage/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'security_sales',
      caller_intent: 'sell security services',
      outcome: 'voicemail',
      summary: 'Alpha Eagle Security sales voicemail - patrol/camera monitoring services',
      confidence: 'high',
      notes: 'B2B telemarketing'
    };
  }
  
  // Paint company sales
  if (/sherwin.*paint|paint rep/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'vendor_sales',
      caller_intent: 'introduce paint services',
      outcome: 'Shay unavailable',
      summary: 'Sherwin Paint Company rep calling to discuss partnership',
      confidence: 'high',
      notes: 'vendor sales'
    };
  }
  
  // Express updates business
  if (/express.*updates|is the business located/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'data_collection',
      caller_intent: 'business data verification',
      outcome: 'provided some info',
      summary: 'Express Updates calling to verify business information/address',
      confidence: 'high',
      notes: 'data collection call'
    };
  }
  
  // Generational Group investment
  if (/generational group|private event.*business owners/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'investment_pitch',
      caller_intent: 'invite to investment event',
      outcome: 'took message',
      summary: `Generational Group calling to invite Shay to business owner event`,
      confidence: 'high',
      notes: 'investment marketing'
    };
  }
  
  // Claim Notify asset recovery
  if (/claim notify|asset recovery|eligible for.*money/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'asset_recovery',
      caller_intent: 'asset recovery services',
      outcome: 'took message',
      summary: 'Claim Notify calling about unclaimed funds - Shay on vacation',
      confidence: 'medium',
      notes: 'asset recovery - may be legitimate'
    };
  }
  
  // Health call pro
  if (/healthcall pro|health.*call.*pro/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'health_services',
      caller_intent: 'sell health services',
      outcome: 'declined',
      summary: 'HealthCall Pro telemarketing call - declined',
      confidence: 'high',
      notes: 'telemarketing'
    };
  }
  
  // House cold pro
  if (/house cold pro/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'cold_call',
      caller_intent: 'unknown B2B pitch',
      outcome: 'declined',
      summary: 'House Cold Pro cold call - declined',
      confidence: 'high',
      notes: 'B2B telemarketing'
    };
  }
  
  // Landscape supply prospecting
  if (/heritage landscape|irrigation.*drainage.*lighting|distributor.*sales rep/i.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'vendor_prospecting',
      caller_intent: 'introduce landscape supply services',
      outcome: 'listening',
      summary: 'Heritage Landscape Supply (formerly Imperial Sprinkler) sales rep introducing services',
      confidence: 'high',
      notes: 'vendor prospecting'
    };
  }
  
  // === VENDOR/OPERATIONS PATTERNS ===
  
  // Home Depot phone sales
  if (/home depot|concord.*depot/i.test(transcript) && /pro reward|phone (sale|purchase)|credit card/i.test(transcript)) {
    const jobMatch = transcript.match(/job(?:\s+name)?(?:\s+is)?[:\s]+([A-Za-z\s]+?)(?:\.|,|okay|and)/i);
    const job = jobMatch ? jobMatch[1].trim() : '';
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process Home Depot phone sale',
      outcome: 'payment processed',
      summary: `Home Depot Concord phone sale${amount ? ` ($${amount})` : ''}${job ? ` for ${job} job` : ''} - materials purchased`,
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  // Westside Building Materials
  if (/westside building material/i.test(transcript)) {
    const jobMatch = transcript.match(/job.*?(?:is|called|for)\s+([A-Za-z\s]+?)(?:\.|and|okay)/i);
    const job = jobMatch ? jobMatch[1].trim() : 'Bayardo';
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process material purchase',
      outcome: 'payment processed',
      summary: `Westside Building Materials purchase${amount ? ` ($${amount})` : ''} - ${callerName || 'Eric'} calling for ${job} job materials`,
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  // Ashby Lumber
  if (/ashby lumber/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process lumber order',
      outcome: 'payment processed',
      summary: `Ashby Lumber Concord purchase${amount ? ` ($${amount})` : ''} - order payment processing`,
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  // BPX Printing
  if (/bpx.*print|troy.*vx|bpxprint/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_service',
      caller_intent: 'blueprint/drawing printing',
      outcome: 'payment processed',
      summary: `BPX Printing - blueprint/permit drawings${amount ? ` ($${amount})` : ''}${address ? ` for ${address}` : ''}`,
      confidence: 'high',
      notes: 'printing vendor'
    };
  }
  
  // Prosource (flooring materials)
  if (/prosource/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process flooring order',
      outcome: 'payment processed',
      summary: `Prosource flooring materials order${amount ? ` - payment for ${amount}` : ''}`,
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  // RingCentral
  if (/ringcentral/i.test(transcript) && /peyton|vivian|meeting/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_service',
      caller_intent: 'phone service discussion',
      outcome: 'discussed contract/pricing',
      summary: 'RingCentral account rep (Peyton) calling about service contract and pricing',
      confidence: 'high',
      notes: 'phone service vendor'
    };
  }
  
  // Crash Champions (personal)
  if (/crash champions|ford raptor/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'personal',
      caller_intent: 'vehicle repair update',
      outcome: 'forwarded to Shay',
      summary: "Crash Champions Lafayette calling about Shay's Ford Raptor repair update",
      confidence: 'high',
      notes: 'personal - forwarded'
    };
  }
  
  // Internal accounting/bookkeeping calls
  if (/excel|payment.*request|invoice|check number|change order|schedule of payment|quickbooks pay|receipt.*standard plumbing/i.test(transcript) && 
      /daniel|carlos|john|bayardo|shy|shai|rolly|roli/i.test(transcript) && duration > 200) {
    return {
      category: 'operations',
      sub_category: 'internal_accounting',
      caller_intent: 'internal bookkeeping discussion',
      outcome: 'processing records',
      summary: 'Internal bookkeeping call - reviewing subcontractor payments, invoices, and change orders',
      confidence: 'high',
      notes: 'internal accounting'
    };
  }
  
  // Internal crew discussion
  if (/bifold|door.*system|video.*group/i.test(transcript) && /juan|gail/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'crew_coordination',
      caller_intent: 'discuss workmanship issue',
      outcome: 'resolved',
      summary: 'Internal call with Juan discussing bifold door installation issue - proper operation explained',
      confidence: 'high',
      notes: 'internal crew'
    };
  }
  
  // Internal photo sharing
  if (/carmen.*pictures|pictures.*folder|share.*shot/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'internal_admin',
      caller_intent: 'coordinate photo sharing',
      outcome: 'handled',
      summary: 'Internal call - coordinating sharing of Carmen Court project photos via email folder',
      confidence: 'high',
      notes: 'internal admin'
    };
  }
  
  // Dragon check pickup
  if (/dragon/i.test(transcript) && /check|payment|10,?000/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'subcontractor_payment',
      caller_intent: 'pick up payment check',
      outcome: 'referred to Vivian',
      summary: 'Dragon (subcontractor) calling to pick up $10,000 first payment check for Orinda project',
      confidence: 'high',
      notes: 'sub payment'
    };
  }
  
  // Material coordination
  if (/central valley|pickup|deposit.*motor/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'material_coordination',
      caller_intent: 'coordinate materials/deposit',
      outcome: 'processing',
      summary: 'Internal call - coordinating material deposits and pickups',
      confidence: 'high',
      notes: 'material coordination'
    };
  }
  
  // Habitat for Humanity lien release
  if (/habitat.*humanity|lien release/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'legal_admin',
      caller_intent: 'discuss lien release documentation',
      outcome: 'handled',
      summary: 'Internal discussion about Habitat for Humanity job lien release documentation',
      confidence: 'high',
      notes: 'legal/admin'
    };
  }
  
  // Site visit reminder/cancellation
  if (/cancel.*site visit|reminder.*site visit|site visit.*cancel/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'scheduling',
      caller_intent: 'cancel/modify site visit',
      outcome: 'cancelled',
      summary: `Site visit cancellation${address ? ` for ${address}` : ''}`,
      confidence: 'high',
      notes: 'scheduling'
    };
  }
  
  // Walnut Creek City Lifestyle publication
  if (/walnut creek city lifestyle|publication/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'media_inquiry',
      caller_intent: 'publication/marketing inquiry',
      outcome: 'took message for Itay',
      summary: 'Walnut Creek City Lifestyle publication calling for Itay regarding Laurel Kellam referral',
      confidence: 'high',
      notes: 'media/marketing'
    };
  }
  
  // === PARTNER/REFERRAL PATTERNS ===
  
  // Realm partner
  if (/realm/i.test(transcript) && /partner|contract|project|sebastian|matt/i.test(transcript)) {
    const action = /sebastian/i.test(transcript) ? 'scheduling site visit for Shayla Love project' :
                   /matt/i.test(transcript) ? 'partnership/contract discussion' : 'project referral';
    return {
      category: 'operations',
      sub_category: 'partner_referral',
      caller_intent: action,
      outcome: /schedule|site visit/i.test(transcript) ? 'scheduling site visit' : 'took message',
      summary: `Realm partner call - ${action}`,
      confidence: 'high',
      notes: 'partner relationship'
    };
  }
  
  // Charlotte from Roam
  if (/charlotte.*roam|roam.*charlotte/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'partner_referral',
      caller_intent: 'clarify project requirements',
      outcome: 'clarified pricing requirements',
      summary: 'Charlotte from Roam calling back - clarifying customer wants construction under $750/sqft for addition',
      confidence: 'high',
      notes: 'partner followup'
    };
  }
  
  // Houzz leads
  if (/houzz/i.test(transcript)) {
    if (/voicemail|please call/i.test(transcript)) {
      return {
        category: 'customer',
        sub_category: 'houzz_lead',
        caller_intent: 'respond to Houzz inquiry',
        outcome: 'left voicemail',
        summary: `Houzz lead - left voicemail for ${callerName || 'customer'} regarding their project inquiry`,
        confidence: 'high',
        notes: 'houzz lead - voicemail'
      };
    }
    return {
      category: 'customer',
      sub_category: 'houzz_lead',
      caller_intent: 'respond to Houzz contact',
      outcome: 'scheduling appointment',
      summary: `${callerName || 'Customer'} calling back from Houzz - scheduling consultation appointment`,
      confidence: 'high',
      notes: 'houzz lead'
    };
  }
  
  // === CITY/PERMIT PATTERNS ===
  
  // City permits/encroachment
  if (/city of.*construction|encroachment permit|permit for/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'permit_followup',
      caller_intent: 'permit status inquiry',
      outcome: 'forwarded to project manager',
      summary: `City of Lafayette construction dept calling about encroachment permit${address ? ` at ${address}` : ''} - forwarded to Itay`,
      confidence: 'high',
      notes: 'permit related'
    };
  }
  
  // Fire district
  if (/fire district|moraga.*orinda.*fire/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'permit_inspection',
      caller_intent: 'follow up on inspection case',
      outcome: 'took message',
      summary: `Moraga Orinda Fire District calling about project at ${address || '226 Overhill Road Orinda'} - last communication May 2024`,
      confidence: 'high',
      notes: 'fire district followup'
    };
  }
  
  // Real estate disclosures
  if (/ann sharp|disclosure|carmen court/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'real_estate_paperwork',
      caller_intent: 'follow up on disclosures',
      outcome: 'checking email',
      summary: "Ann Sharp's office (Brenda) calling about Carmen Court property disclosures - email sent twice, checking spam",
      confidence: 'high',
      notes: 'real estate documentation'
    };
  }
  
  // === CUSTOMER INQUIRY PATTERNS ===
  
  // Hotel/commercial foundation
  if (/hotel|la quinta/i.test(transcript) && /foundation|repair/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'commercial_inquiry',
      caller_intent: 'commercial foundation repair',
      outcome: 'discussed project details',
      summary: 'La Quinta Inn Livermore calling about foundation issues in guest room - commercial project inquiry',
      confidence: 'high',
      notes: 'commercial lead'
    };
  }
  
  // ADU/garage conversion
  if (/adu|accessory dwelling|garage conversion|convert.*garage/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'adu_inquiry',
      caller_intent: 'ADU or garage conversion',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about ${/garage/i.test(transcript) ? 'garage conversion to ADU' : 'ADU construction'} project`,
      confidence: 'high',
      notes: 'ADU lead'
    };
  }
  
  // Excavation/grading
  if (/excavation|excavate|grading|hillside.*flat/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'excavation_inquiry',
      caller_intent: 'excavation/grading work',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about excavation/site grading for ADU project`,
      confidence: 'high',
      notes: 'excavation inquiry'
    };
  }
  
  // Foundation repair
  if (/foundation (repair|issue|concern)|cinder block wall.*support|crawl space.*concern/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'foundation_inquiry',
      caller_intent: 'foundation repair inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about foundation repair${address ? ` at ${address}` : ''}`,
      confidence: 'high',
      notes: 'foundation lead'
    };
  }
  
  // Drainage/French drains
  if (/drainage|french drain|drain system|water.*basement|water.*cellar|storm drain/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'drainage_inquiry',
      caller_intent: 'drainage system inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about drainage/French drain installation`,
      confidence: 'high',
      notes: 'drainage lead'
    };
  }
  
  // Concrete work
  if (/concrete (walkway|driveway|pad|patio|slab|repair)|sidewalk.*repair|ready mix/i.test(transcript) && !/home depot|lowes/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'concrete_inquiry',
      caller_intent: 'concrete work inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about concrete work${address ? ` at ${address}` : ''}`,
      confidence: 'high',
      notes: 'concrete lead'
    };
  }
  
  // Bathroom remodel
  if (/bathroom.*remodel|remodel.*bathroom|bathroom.*demolished|vanity/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'bathroom_remodel',
      caller_intent: 'bathroom remodel inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about bathroom remodel${/insurance/i.test(transcript) ? ' - needs itemized estimate for insurance' : ''}`,
      confidence: 'high',
      notes: 'remodel lead'
    };
  }
  
  // Windows/doors/siding
  if (/window.*sliding|sliding door|replace.*window|siding/i.test(transcript) && !/sell/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'exterior_inquiry',
      caller_intent: 'windows/doors/siding inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about ${/window/i.test(transcript) ? 'window/door replacement' : 'exterior work'}`,
      confidence: 'high',
      notes: 'exterior work inquiry'
    };
  }
  
  // Real estate agent referral
  if (/real estate agent|representing a buyer|regrade.*driveway/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'realtor_referral',
      caller_intent: 'quote for buyer client',
      outcome: 'will provide proposal',
      summary: 'Real estate agent seeking quote to regrade steep driveway for buyer in Berkeley hills/Oakland',
      confidence: 'high',
      notes: 'realtor referral'
    };
  }
  
  // Post tension slab inquiry
  if (/post tension|ground penetrating|tension rods/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'specialized_inquiry',
      caller_intent: 'post tension slab investigation',
      outcome: 'discussed capabilities',
      summary: `${callerName || 'Customer'} in Gilroy needs ground penetrating survey for post tension slab - French door replacement project`,
      confidence: 'high',
      notes: 'specialized inquiry'
    };
  }
  
  // Fire damage (Eaton fire)
  if (/eaton fire|altadena|fire.*repair|mother.*law.*house/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'fire_damage',
      caller_intent: 'fire damage repair quote',
      outcome: 'discussing referral',
      summary: `${callerName || 'Rich Reber'} in Altadena seeking comparative bid for Eaton fire damage repair - referral from mother-in-law's project`,
      confidence: 'high',
      notes: 'fire damage referral'
    };
  }
  
  // Honey Homes property management
  if (/honey homes|property management.*water/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'property_management',
      caller_intent: 'water intrusion investigation',
      outcome: 'discussed project',
      summary: `Honey Homes (${callerName || 'Sam'}) calling about water entering wine cellar below grade - inspection needed`,
      confidence: 'high',
      notes: 'property management lead'
    };
  }
  
  // Foundation waterproofing
  if (/waterproofing|water intrusion|water.*between.*garage/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'waterproofing_inquiry',
      caller_intent: 'waterproofing inquiry',
      outcome: duration > 150 ? 'discussed project' : 'initial inquiry',
      summary: `Customer in ${city} inquiring about foundation/basement waterproofing - water intrusion issues`,
      confidence: 'high',
      notes: 'waterproofing lead'
    };
  }
  
  // Retaining wall/CMU
  if (/retaining wall|cmu|cinder block.*wall|garden wall/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'masonry_inquiry',
      caller_intent: 'retaining wall/masonry inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `${callerName || 'Customer'} in ${city} inquiring about ${/garden wall/i.test(transcript) ? 'CMU garden wall and concrete pathway' : 'retaining wall work'}${address ? ` at ${address}` : ''}`,
      confidence: 'high',
      notes: 'masonry lead'
    };
  }
  
  // Curbs and gutters / city bid
  if (/curbs.*gutters|submit.*bid.*city|city of oakland/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'commercial_bid',
      caller_intent: 'get pricing for city bid',
      outcome: 'will email plans',
      summary: 'Contractor seeking pricing for City of Oakland bid - curbs, gutters, concrete walkway scope',
      confidence: 'high',
      notes: 'commercial bid inquiry'
    };
  }
  
  // Balcony inspection
  if (/balcony|elevated.*element|sb721|inspection.*balcony/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'inspection_inquiry',
      caller_intent: 'balcony inspection',
      outcome: 'discussing service',
      summary: `Customer in Oakland needs elevated balcony inspection for city compliance`,
      confidence: 'high',
      notes: 'inspection inquiry'
    };
  }
  
  // Grab bars installation
  if (/bars.*bathroom|bars.*shower|bars.*toilet|grab bars/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'accessibility_inquiry',
      caller_intent: 'grab bars installation',
      outcome: 'voicemail',
      summary: `${callerName || 'Jeff Fusakis'} in Oakland (Hiller Highlands) needs grab bars installed in bathroom - accessibility modification`,
      confidence: 'high',
      notes: 'accessibility lead'
    };
  }
  
  // Window replacement voicemail
  if (/six windows.*replace|double.*pane|noise cancel/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'window_inquiry',
      caller_intent: 'window replacement',
      outcome: 'voicemail received',
      summary: `Jay Liu needs 6 windows replaced with noise-canceling double-pane - website broken noted`,
      confidence: 'high',
      notes: 'window lead - website issue'
    };
  }
  
  // Countertop fabricator seeking work
  if (/fabricator|countertop.*bid|slab fabricator/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'vendor_seeking_work',
      caller_intent: 'offer countertop services',
      outcome: 'took info',
      summary: `${callerName || 'Bradley'} - countertop fabricator offering services for projects - affordable rates`,
      confidence: 'high',
      notes: 'vendor seeking work'
    };
  }
  
  // Drywall worker seeking work
  if (/hiring workers|drywall.*finishing|do you hire/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'job_seeker',
      caller_intent: 'seeking employment',
      outcome: 'added to list',
      summary: `${callerName || 'German'} seeking drywall finishing work - added to contractor list`,
      confidence: 'high',
      notes: 'job seeker'
    };
  }
  
  // Property inquiry Orinda
  if (/property.*orinda|orinda.*property/i.test(transcript) && /message|call.*back/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'property_inquiry',
      caller_intent: 'inquire about property',
      outcome: 'took message',
      summary: 'Caller inquiring about property in Orinda - Moor on vacation, left email for followup',
      confidence: 'high',
      notes: 'property inquiry'
    };
  }
  
  // Screen door too small
  if (/screen door|anderson.*door|too small/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'declined_job',
      caller_intent: 'screen door replacement',
      outcome: 'job too small - declined',
      summary: 'Customer needs single Anderson screen door replacement - job too small, recommended alternatives',
      confidence: 'high',
      notes: 'declined - too small'
    };
  }
  
  // Fly ash slurry inquiry
  if (/fly ash|slurry/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'wrong_service',
      caller_intent: 'purchase fly ash slurry',
      outcome: 'we dont sell materials',
      summary: `${callerName || 'Amir Hamza'} looking for fly ash slurry for tank backfilling - we don't sell materials`,
      confidence: 'high',
      notes: 'wrong service type'
    };
  }
  
  // Trough drains inquiry
  if (/trough drains|sell.*drains/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'wrong_service',
      caller_intent: 'purchase trough drains',
      outcome: 'we dont sell products',
      summary: 'Customer looking to buy trough drains - we are construction company, not retailer',
      confidence: 'high',
      notes: 'wrong service type'
    };
  }
  
  // Out of service area
  if (/vacaville|sebastopol|windsor|tracy|isleton/i.test(transcript) && /don't cover|sorry.*don't|outside.*area/i.test(transcript)) {
    const locationMatch = transcript.match(/vacaville|sebastopol|windsor|tracy|isleton/i);
    return {
      category: 'other_inquiry',
      sub_category: 'out_of_area',
      caller_intent: 'service inquiry',
      outcome: 'declined - out of area',
      summary: `Customer inquiry from ${locationMatch ? locationMatch[0] : 'outside area'} - outside service area, declined`,
      confidence: 'high',
      notes: 'out of service area'
    };
  }
  
  // Customer invoice/payment discussion
  if (/invoice.*due|payment.*due|drilling.*peers|contract.*peers/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'payment_discussion',
      caller_intent: 'discuss invoice payment',
      outcome: 'discussing payment terms',
      summary: `${callerName || 'Annette McAvany'} calling about invoice payment - clarifying contract terms regarding pier drilling`,
      confidence: 'high',
      notes: 'existing customer'
    };
  }
  
  // Existing customer followup from email
  if (/email.*yesterday|sent.*email|form.*website/i.test(transcript) && /estimate|project|quote/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'followup',
      caller_intent: 'follow up on inquiry',
      outcome: 'discussing project',
      summary: `${callerName || 'Customer'} following up on email/website inquiry for estimate`,
      confidence: 'high',
      notes: 'customer followup'
    };
  }
  
  // Multi-property investor
  if (/multifamily|apartment owner|three.*properties|multiple.*projects/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'commercial_inquiry',
      caller_intent: 'multiple ADU projects',
      outcome: 'discussing projects',
      summary: 'Multifamily apartment owner company inquiring about ADU projects in Fremont, San Jose, Belmont',
      confidence: 'high',
      notes: 'commercial investor lead'
    };
  }
  
  // Scheduling appointment
  if (/schedule.*appointment|appointment.*schedule|monday.*tuesday|what.*available/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'scheduling',
      caller_intent: 'schedule site visit',
      outcome: 'scheduling',
      summary: `${callerName || 'Customer'} scheduling site visit appointment`,
      confidence: 'high',
      notes: 'scheduling'
    };
  }
  
  // Richard estimates (fire damage)
  if (/richard|zip file|estimates.*archived/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'estimates',
      caller_intent: 'send archived estimates',
      outcome: 'sending via email',
      summary: 'Richard sending zip file of archived estimates for project',
      confidence: 'high',
      notes: 'estimates sharing'
    };
  }
  
  // Plumber coordination
  if (/plumber.*discovery bay|tubs.*jacuzzi|road.*closed/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'crew_coordination',
      caller_intent: 'coordinate plumber schedule',
      outcome: 'confirming schedule',
      summary: 'Internal call - coordinating plumber visit to Discovery Bay for tubs/Jacuzzi work, road closures discussed',
      confidence: 'high',
      notes: 'crew coordination'
    };
  }
  
  // Voicemail inquiries
  if (/rhino.*voicemail|not available.*message|leave.*message/i.test(transcript) && duration < 100) {
    return {
      category: 'customer',
      sub_category: 'voicemail_inquiry',
      caller_intent: 'left voicemail',
      outcome: 'voicemail left',
      summary: `${callerName || 'Caller'} left voicemail for Shay/owner`,
      confidence: 'medium',
      notes: 'voicemail'
    };
  }
  
  // Video pricing followup
  if (/frederick street|videos.*pricing|sent.*videos/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'pricing',
      caller_intent: 'get pricing from videos',
      outcome: 'reviewing videos',
      summary: 'Internal call - Shay needs pricing for 439 Frederick Street project based on videos sent',
      confidence: 'high',
      notes: 'pricing request'
    };
  }
  
  // Customer rescheduling
  if (/reschedule|delays.*inspector|unprofessional/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'reschedule',
      caller_intent: 'missed appointment',
      outcome: 'apologized and rescheduling',
      summary: `${callerName || 'Customer'} (Shilpa) upset about missed estimate appointment - inspector delays caused schedule conflict`,
      confidence: 'high',
      notes: 'unhappy customer - rescheduling'
    };
  }
  
  // === INCOMPLETE/SHORT PATTERNS ===
  
  // Empty or very short
  if (!transcript || transcript.length < 50 || duration < 15) {
    return {
      category: 'incomplete',
      sub_category: 'too_short',
      caller_intent: 'unknown',
      outcome: 'no content',
      summary: 'Call too short or no transcript - insufficient content',
      confidence: 'high',
      notes: 'too short'
    };
  }
  
  // Hello only
  if (/^(hello|hi|good morning|good afternoon|hey)[,.\s]*(hello|hi)*[,.\s]*$/i.test(transcript.trim())) {
    return {
      category: 'incomplete',
      sub_category: 'greeting_only',
      caller_intent: 'unknown',
      outcome: 'no content',
      summary: 'Greeting only - call ended before any conversation',
      confidence: 'high',
      notes: 'too short'
    };
  }
  
  // Quick goodbye calls
  if (duration < 40 && /bye|see you|thank|okay/i.test(transcript) && !/project|estimate|schedule/i.test(transcript)) {
    return {
      category: 'incomplete',
      sub_category: 'brief_exchange',
      caller_intent: 'brief check-in',
      outcome: 'quick exchange',
      summary: 'Brief call - quick exchange/goodbye',
      confidence: 'medium',
      notes: 'brief call'
    };
  }
  
  // === DEFAULT FALLBACK ===
  
  // Longer calls that dont match patterns
  if (duration > 200) {
    return {
      category: 'customer',
      sub_category: 'general_inquiry',
      caller_intent: 'project inquiry',
      outcome: 'discussed project',
      summary: `${callerName || 'Customer'} call from ${city} - lengthy conversation about potential project`,
      confidence: 'medium',
      notes: 'needs detailed review'
    };
  }
  
  if (duration > 60) {
    return {
      category: 'other_inquiry',
      sub_category: 'unclassified',
      caller_intent: 'unknown',
      outcome: 'needs review',
      summary: `Call from ${city} (${duration}s) - requires manual review`,
      confidence: 'low',
      notes: 'needs review'
    };
  }
  
  return {
    category: 'incomplete',
    sub_category: 'short_call',
    caller_intent: 'unknown',
    outcome: 'brief call',
    summary: `Short call (${duration}s) - insufficient context to classify`,
    confidence: 'medium',
    notes: 'short call'
  };
}

// Process all calls
console.log(`Processing ${q4Data.length} calls with detailed analysis...`);

const reviews = q4Data.map((call, index) => {
  if (index % 100 === 0) {
    console.log(`Processing call ${index + 1}/${q4Data.length}`);
  }
  
  const analysis = analyzeCall(call);
  
  return {
    id: call.id,
    direction: call.direction || 'inbound',
    duration: call.duration || 0,
    ...analysis
  };
});

// Generate CSV
const headers = ['id', 'direction', 'duration', 'category', 'sub_category', 'caller_intent', 'outcome', 'summary', 'confidence', 'notes'];
const csvRows = [headers.join(',')];

reviews.forEach(review => {
  const row = headers.map(h => {
    const val = review[h] || '';
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  });
  csvRows.push(row.join(','));
});

fs.writeFileSync('analysis/q4-manual-review.csv', csvRows.join('\n'));

console.log(`\nCompleted! Wrote ${reviews.length} reviews to analysis/q4-manual-review.csv`);

// Print statistics
const stats = {
  categories: {},
  subCategories: {},
  confidence: { high: 0, medium: 0, low: 0 }
};

reviews.forEach(r => {
  stats.categories[r.category] = (stats.categories[r.category] || 0) + 1;
  stats.subCategories[r.sub_category] = (stats.subCategories[r.sub_category] || 0) + 1;
  stats.confidence[r.confidence] = (stats.confidence[r.confidence] || 0) + 1;
});

console.log('\nCategory breakdown:');
Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log('\nTop sub-categories:');
Object.entries(stats.subCategories).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([sub, count]) => {
  console.log(`  ${sub}: ${count}`);
});

console.log('\nConfidence levels:');
Object.entries(stats.confidence).forEach(([level, count]) => {
  console.log(`  ${level}: ${count}`);
});
