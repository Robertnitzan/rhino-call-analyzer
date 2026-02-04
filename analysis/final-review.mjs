import fs from 'fs';

// Load all data
const callsData = JSON.parse(fs.readFileSync('../data/q4-calls-merged.json', 'utf-8'));
const transcriptsData = JSON.parse(fs.readFileSync('../data/q4-transcripts.json', 'utf-8'));

// Build lookups
const transcriptLookup = {};
for (const t of transcriptsData) {
  transcriptLookup[t.call_id] = t.text || '';
}

const callLookup = {};
for (const c of callsData) {
  callLookup[c.id] = c;
}

// Helper to escape CSV
function escapeCSV(str) {
  if (!str) return '';
  str = String(str).replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }
  return str;
}

// Extract customer name from transcript
function extractName(transcript) {
  const patterns = [
    /(?:my name is|this is|i'm|name's)\s+([A-Z][a-z]+)/i,
    /(?:hi,?\s+)?this is\s+([A-Z][a-z]+)(?:\s+(?:calling|from|with))/i,
  ];
  for (const p of patterns) {
    const m = transcript.match(p);
    if (m && m[1] && !['This', 'Hello', 'Good', 'Roli', 'Roly', 'Wally', 'Yes', 'Yeah'].includes(m[1])) {
      return m[1];
    }
  }
  return '';
}

// Check if transcript is just greetings
function isJustGreeting(transcript) {
  const t = transcript.toLowerCase().replace(/[.,!?]/g, '').trim();
  const greetingWords = ['hello', 'good morning', 'good afternoon', 'hi', 'hey'];
  const words = t.split(/\s+/).filter(w => w.length > 0);
  // If all words are greetings, it's just a greeting
  return words.every(w => greetingWords.includes(w) || w === 'good');
}

// Comprehensive analysis
function analyzeCall(callId, call, transcript) {
  const duration = call?.duration || 0;
  const city = call?.customer_city || '';
  const answered = call?.answered;
  
  // No transcript
  if (!transcript || transcript.length < 15) {
    if (duration < 15) {
      return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'no content', summary: `${duration}s call - too short`, confidence: 'high', notes: 'Minimal content' };
    }
    if (!answered) {
      return { category: 'incomplete', subCategory: 'missed_call', intent: 'unknown', outcome: 'missed', summary: `Missed call from ${city || 'unknown'}`, confidence: 'high', notes: 'No recording' };
    }
    return { category: 'incomplete', subCategory: 'no_transcript', intent: 'unknown', outcome: 'unknown', summary: `${duration}s call - no transcript`, confidence: 'low', notes: 'Review recording' };
  }
  
  // Just greetings
  if (isJustGreeting(transcript)) {
    return { category: 'incomplete', subCategory: 'greeting_only', intent: 'unknown', outcome: 'no content', summary: 'Call with only greetings - no substance', confidence: 'high', notes: 'Just hello/goodbye' };
  }
  
  const t = transcript.toLowerCase();
  const name = extractName(transcript);
  const cityStr = city ? ` in ${city}` : '';
  const nameStr = name || 'Customer';
  
  // === SPAM PATTERNS ===
  
  // Robocalls
  if (t.includes('press 1') || t.includes('press one') || t.includes('press 2') || t.includes('press 4') || t.includes('press 9') || t.includes('to opt out') || t.includes('opt out') || t.includes('suspension') || t.includes('suspended')) {
    return { category: 'spam', subCategory: 'robocall', intent: 'automated spam', outcome: 'ignored', summary: 'Robocall spam', confidence: 'high', notes: 'Automated' };
  }
  
  // Google listing spam
  if (t.includes('google') && (t.includes('listing') || t.includes('voice search') || t.includes('my business') || t.includes('showing') || t.includes('maps') || t.includes('verified') || t.includes('visible'))) {
    return { category: 'spam', subCategory: 'google_listing', intent: 'sell SEO', outcome: 'ignored', summary: 'Google listing scam', confidence: 'high', notes: 'Google spam' };
  }
  
  // Google funding (different from listing)
  if (t.includes('google funding')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell financing', outcome: 'declined', summary: 'Google Funding cold call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Small Business Lending / Tim
  if (t.includes('small business lending') || t.includes('line of credit') || t.includes('pre approved') || t.includes('pre-approved') || (t.includes('tim') && t.includes('lending'))) {
    return { category: 'spam', subCategory: 'b2b_lending', intent: 'sell loans', outcome: 'ignored', summary: 'Small Business Lending cold call (Tim)', confidence: 'high', notes: 'Repeat caller' };
  }
  
  // Staffing/recruiting
  if (t.includes('staffing') || t.includes('hiring needs') || t.includes('candidates') || t.includes('spencer') && t.includes('trainer')) {
    return { category: 'spam', subCategory: 'staffing_sales', intent: 'sell staffing services', outcome: 'voicemail', summary: `Staffing company cold call${name ? ` (${name})` : ''}`, confidence: 'high', notes: 'Recruiting spam' };
  }
  
  // Restaurant service / telehealth spam
  if (t.includes('restaurant service') || t.includes('healthcall pro') || t.includes('house cold pro') || t.includes('health call')) {
    return { category: 'spam', subCategory: 'telemarketing', intent: 'telemarketing', outcome: 'declined', summary: 'Telemarketing cold call', confidence: 'high', notes: 'B2C spam' };
  }
  
  // Newsletter spam
  if (t.includes('newsletter') || t.includes('pinion')) {
    return { category: 'spam', subCategory: 'newsletter_sales', intent: 'sell newsletter', outcome: 'declined', summary: 'Newsletter sales call', confidence: 'high', notes: 'Newsletter spam' };
  }
  
  // Student research
  if (t.includes('student') && t.includes('research')) {
    return { category: 'other_inquiry', subCategory: 'research_request', intent: 'student research', outcome: 'declined - busy', summary: 'Student calling for research project questions', confidence: 'high', notes: 'Declined politely' };
  }
  
  // "Business owner" cold calls
  if ((t.includes('business owner') || t.includes('speak with the owner') || t.includes('speak to the owner')) && t.length < 250) {
    return { category: 'spam', subCategory: 'cold_call', intent: 'B2B solicitation', outcome: 'screened', summary: 'Cold caller asking for business owner', confidence: 'high', notes: 'Screened by assistant' };
  }
  
  // Small business / I own a small business
  if (t.includes('i own a small business') || (t.includes('william') && t.includes('small business')) || (t.includes('peter') && t.includes('small business'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B pitch', outcome: 'declined', summary: 'Small business owner cold call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Yelp
  if (t.includes('yelp')) {
    return { category: 'spam', subCategory: 'yelp_sales', intent: 'sell advertising', outcome: 'declined', summary: 'Yelp sales call', confidence: 'high', notes: 'Yelp spam' };
  }
  
  // QuickBooks scam
  if (t.includes('quickbooks') || t.includes('intuit')) {
    if (t.includes('subscription') || t.includes('charge') || t.includes('renew')) {
      return { category: 'spam', subCategory: 'quickbooks_scam', intent: 'phishing', outcome: 'scam', summary: 'QuickBooks scam call', confidence: 'high', notes: 'Financial scam' };
    }
  }
  
  // Merchant services
  if (t.includes('merchant service') || t.includes('credit card processing') || t.includes('payment processing')) {
    return { category: 'spam', subCategory: 'merchant_services', intent: 'sell payment services', outcome: 'declined', summary: 'Merchant services call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Office supplies
  if ((t.includes('ink') && t.includes('toner')) || t.includes('office supplies')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell supplies', outcome: 'declined', summary: 'Office supplies telemarketing', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Workshops
  if (t.includes('workshop') || t.includes('seminar') || t.includes('aspire')) {
    return { category: 'spam', subCategory: 'workshop_sales', intent: 'sell training', outcome: 'declined', summary: 'Business workshop sales', confidence: 'high', notes: 'Training spam' };
  }
  
  // Estimation services
  if (t.includes('estimat') && (t.includes('outsourc') || t.includes('service'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell estimation', outcome: 'declined', summary: 'Estimation outsourcing pitch', confidence: 'high', notes: 'B2B solicitation' };
  }
  
  // Claim Notify
  if (t.includes('claim notify') || t.includes('asset recovery')) {
    return { category: 'spam', subCategory: 'cold_call', intent: 'asset recovery pitch', outcome: 'declined', summary: 'Claim Notify cold call', confidence: 'high', notes: 'Scam likely' };
  }
  
  // United Eagle / accounts receivable
  if (t.includes('united eagle') || (t.includes('accounts receivable') && t.includes('calling from'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B solicitation', outcome: 'declined', summary: 'Accounts receivable cold call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Property damage company seeking work
  if (t.includes('property damage company') || t.includes('pureclean')) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'offering services', outcome: 'took info', summary: 'Property damage/cleanup company seeking work', confidence: 'high', notes: 'Vendor outreach' };
  }
  
  // Landscape/irrigation supplier
  if (t.includes('heritage landscape') || t.includes('imperial sprinkler') || t.includes('irrigation') && t.includes('distributor')) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'sell supplies', outcome: 'took info', summary: 'Landscape supply distributor sales call', confidence: 'high', notes: 'Supplier outreach' };
  }
  
  // === OPERATIONS PATTERNS ===
  
  // Amazon logistics
  if (t.includes('amazon') && (t.includes('delivery') || t.includes('logistics'))) {
    return { category: 'operations', subCategory: 'vendor_logistics', intent: 'delivery info', outcome: 'automated', summary: 'Amazon delivery instructions', confidence: 'high', notes: 'Amazon logistics' };
  }
  
  // PGE utility
  if (t.includes('pge') || t.includes('p g e') || t.includes('pacific gas')) {
    return { category: 'operations', subCategory: 'utility_coordination', intent: 'utility followup', outcome: 'resolved', summary: 'PGE returning call - utility coordination', confidence: 'high', notes: 'Utility' };
  }
  
  // Home Depot phone sale
  if ((t.includes('home depot') || t.includes('depot')) && (t.includes('phone sale') || t.includes('dustin') || t.includes('diana') || t.includes('felix') || t.includes('card'))) {
    const amountMatch = transcript.match(/\$[\d,]+(?:\.\d{2})?/);
    const amount = amountMatch ? ` ${amountMatch[0]}` : '';
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: `Home Depot phone sale${amount}`, confidence: 'high', notes: 'Material purchase' };
  }
  
  // Lowe's
  if (t.includes('lowes') || t.includes("lowe's")) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: "Lowe's purchase", confidence: 'high', notes: 'Material purchase' };
  }
  
  // Building materials
  if (t.includes('ashby lumber')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'lumber purchase', outcome: 'processed', summary: 'Ashby Lumber purchase', confidence: 'high', notes: 'Lumber' };
  }
  if (t.includes('westside building')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: 'Westside Building Materials purchase', confidence: 'high', notes: 'Materials' };
  }
  if (t.includes('floor and decor') || t.includes('floor & decor')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'flooring purchase', outcome: 'processed', summary: 'Floor & Decor purchase', confidence: 'high', notes: 'Flooring' };
  }
  
  // Subcontractor payment
  if ((t.includes('dragon') || t.includes('subcontractor')) && (t.includes('check') || t.includes('payment'))) {
    return { category: 'operations', subCategory: 'subcontractor_payment', intent: 'check pickup', outcome: 'processing', summary: 'Subcontractor (Dragon) requesting payment', confidence: 'high', notes: 'Sub payment' };
  }
  
  // Internal job confirmation - shoring, Canyon View
  if ((t.includes('canyon view') || t.includes('shoring') || t.includes('orinda')) && (t.includes('schedule') || t.includes('saturday') || t.includes('pay'))) {
    return { category: 'operations', subCategory: 'crew_coordination', intent: 'job scheduling', outcome: 'confirmed', summary: 'Internal crew call - job scheduling/payment confirmation', confidence: 'high', notes: 'Crew coordination' };
  }
  
  // Internal address confirmation
  if (t.includes('greenfield drive') || t.includes('fairfield') && t.includes('correct')) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'address verification', outcome: 'confirmed', summary: 'Internal call - verifying job address', confidence: 'high', notes: 'Address confirm' };
  }
  
  // Plumber/Discovery Bay coordination
  if ((t.includes('plumber') || t.includes('discovery bay')) && (t.includes('tomorrow') || t.includes('schedule'))) {
    return { category: 'operations', subCategory: 'crew_coordination', intent: 'crew scheduling', outcome: 'coordinating', summary: 'Internal crew call - Discovery Bay job', confidence: 'high', notes: 'Crew coordination' };
  }
  
  // RingCentral
  if (t.includes('ringcentral')) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'phone service', outcome: 'discussed', summary: 'RingCentral service call', confidence: 'high', notes: 'Phone vendor' };
  }
  
  // Shy/Shea on vacation
  if ((t.includes('shy') || t.includes('shea') || t.includes('shay') || t.includes('shai')) && (t.includes('vacation') || t.includes('back by') || t.includes('next week'))) {
    return { category: 'operations', subCategory: 'owner_unavailable', intent: 'reach owner', outcome: 'on vacation', summary: 'Caller asking for Shy (on vacation)', confidence: 'high', notes: 'Owner unavailable' };
  }
  
  // Elon followup
  if (t.includes('elon') && (t.includes('shai') || t.includes('shy'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal followup', outcome: 'owner unavailable', summary: 'Elon calling to reach Shai', confidence: 'high', notes: 'Internal contact' };
  }
  
  // WhatsApp coordination
  if (t.includes('whatsapp')) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal', outcome: 'resolved', summary: 'Brief internal coordination call', confidence: 'high', notes: 'Internal' };
  }
  
  // Bookkeeping
  if (t.includes('bookkeeping') || t.includes('invoice') || t.includes('accounting')) {
    return { category: 'operations', subCategory: 'internal_accounting', intent: 'bookkeeping', outcome: 'processing', summary: 'Internal bookkeeping call', confidence: 'high', notes: 'Accounting' };
  }
  
  // Permits
  if ((t.includes('permit') || t.includes('inspection')) && (t.includes('city') || t.includes('county') || t.includes('fire'))) {
    return { category: 'operations', subCategory: 'permit_inspection', intent: 'permit followup', outcome: 'discussed', summary: 'Permit/inspection call', confidence: 'high', notes: 'Permit related' };
  }
  
  // Blueprint/printing
  if (t.includes('blueprint') || t.includes('bpx') || (t.includes('print') && t.includes('permit'))) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'printing', outcome: 'processed', summary: 'Blueprint printing order', confidence: 'high', notes: 'Printing' };
  }
  
  // === WRONG NUMBER ===
  if (t.includes('wrong number') || t.includes('smp construction') || (t.includes('steve') && t.includes("don't have"))) {
    return { category: 'incomplete', subCategory: 'wrong_number', intent: 'wrong number', outcome: 'clarified', summary: 'Wrong number call', confidence: 'high', notes: 'Wrong number' };
  }
  
  // === CUSTOMER PATTERNS ===
  
  // Houzz leads
  if (t.includes('houzz')) {
    return { category: 'customer', subCategory: 'houzz_lead', intent: 'Houzz inquiry', outcome: 'scheduling', summary: `${nameStr}${cityStr} calling back from Houzz - scheduling`, confidence: 'high', notes: 'Houzz lead - hot!' };
  }
  
  // Honey Homes referral
  if (t.includes('honey homes')) {
    return { category: 'customer', subCategory: 'partner_referral', intent: 'inspection request', outcome: 'discussed', summary: `Honey Homes referral - water intrusion issue`, confidence: 'high', notes: 'Property mgmt referral' };
  }
  
  // Grab bars / accessibility
  if (t.includes('bars') && (t.includes('bathroom') || t.includes('shower') || t.includes('toilet'))) {
    return { category: 'customer', subCategory: 'accessibility_inquiry', intent: 'grab bars', outcome: 'voicemail', summary: `${nameStr}${cityStr} needs grab bars in bathroom`, confidence: 'high', notes: 'Accessibility lead' };
  }
  
  // Concrete slab
  if (t.includes('slab') || (t.includes('concrete') && t.includes('backyard'))) {
    const sqftMatch = transcript.match(/(\d+)\s*(?:square foot|sq ft|sqft)/i);
    const sqft = sqftMatch ? ` ~${sqftMatch[1]} sqft` : '';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: 'concrete slab', outcome: 'voicemail', summary: `${nameStr}${cityStr} wants backyard concrete${sqft}`, confidence: 'high', notes: 'Concrete lead' };
  }
  
  // Wine cellar / waterproofing
  if (t.includes('wine cellar') || t.includes('below grade') || t.includes('water enters')) {
    return { category: 'customer', subCategory: 'waterproofing_inquiry', intent: 'waterproofing', outcome: 'discussed', summary: `${nameStr}${cityStr} - water intrusion issue`, confidence: 'high', notes: 'Waterproofing lead' };
  }
  
  // ADU
  if (t.includes('adu') || t.includes('accessory dwelling') || t.includes('granny unit')) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'ADU', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about ADU`, confidence: 'high', notes: 'ADU lead' };
  }
  
  // Garage conversion
  if (t.includes('garage conversion') || (t.includes('garage') && t.includes('convert'))) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'garage conversion', outcome: 'discussed', summary: `${nameStr}${cityStr} - garage conversion`, confidence: 'high', notes: 'Conversion lead' };
  }
  
  // Foundation
  if (t.includes('foundation') && (t.includes('repair') || t.includes('crack') || t.includes('problem') || t.includes('work'))) {
    // Check if out of area
    if (t.includes("don't cover") || t.includes('don\'t') && t.includes('cover') || t.includes('vacaville')) {
      return { category: 'other_inquiry', subCategory: 'out_of_area', intent: 'foundation', outcome: 'declined - out of area', summary: `${nameStr}${cityStr} - foundation inquiry outside service area`, confidence: 'high', notes: 'Out of area' };
    }
    return { category: 'customer', subCategory: 'foundation_inquiry', intent: 'foundation', outcome: 'discussed', summary: `${nameStr}${cityStr} - foundation work`, confidence: 'high', notes: 'Foundation lead' };
  }
  
  // Concrete general
  if (t.includes('concrete') || t.includes('cement')) {
    let type = 'work';
    if (t.includes('driveway')) type = 'driveway';
    else if (t.includes('patio')) type = 'patio';
    else if (t.includes('sidewalk')) type = 'sidewalk';
    else if (t.includes('pad')) type = 'pad';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: `concrete ${type}`, outcome: 'discussed', summary: `${nameStr}${cityStr} - concrete ${type}`, confidence: 'high', notes: 'Concrete lead' };
  }
  
  // Drainage
  if (t.includes('drainage') || t.includes('french drain') || (t.includes('water') && t.includes('yard'))) {
    return { category: 'customer', subCategory: 'drainage_inquiry', intent: 'drainage', outcome: 'discussed', summary: `${nameStr}${cityStr} - drainage`, confidence: 'high', notes: 'Drainage lead' };
  }
  
  // Retaining wall
  if (t.includes('retaining wall')) {
    return { category: 'customer', subCategory: 'retaining_wall', intent: 'retaining wall', outcome: 'discussed', summary: `${nameStr}${cityStr} - retaining wall`, confidence: 'high', notes: 'Retaining wall lead' };
  }
  
  // Bathroom remodel
  if (t.includes('bathroom') && (t.includes('remodel') || t.includes('renovation'))) {
    return { category: 'customer', subCategory: 'bathroom_remodel', intent: 'bathroom', outcome: 'discussed', summary: `${nameStr}${cityStr} - bathroom remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  // Kitchen remodel
  if (t.includes('kitchen') && (t.includes('remodel') || t.includes('renovation'))) {
    return { category: 'customer', subCategory: 'kitchen_remodel', intent: 'kitchen', outcome: 'discussed', summary: `${nameStr}${cityStr} - kitchen remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  // Roof
  if (t.includes('roof') && (t.includes('leak') || t.includes('repair') || t.includes('replace'))) {
    return { category: 'customer', subCategory: 'roof_inquiry', intent: 'roofing', outcome: 'discussed', summary: `${nameStr}${cityStr} - roofing`, confidence: 'high', notes: 'Roofing lead' };
  }
  
  // Windows/doors/siding
  if (t.includes('window') || t.includes('door') || t.includes('siding')) {
    const type = t.includes('window') ? 'windows' : t.includes('door') ? 'doors' : 'siding';
    return { category: 'customer', subCategory: 'exterior_inquiry', intent: type, outcome: 'discussed', summary: `${nameStr}${cityStr} - ${type}`, confidence: 'high', notes: 'Exterior lead' };
  }
  
  // Fire damage
  if (t.includes('fire') && (t.includes('damage') || t.includes('repair') || t.includes('rebuild'))) {
    return { category: 'customer', subCategory: 'fire_damage', intent: 'fire damage', outcome: 'discussed', summary: `${nameStr}${cityStr} - fire damage repair`, confidence: 'high', notes: 'Fire damage lead' };
  }
  
  // Balcony inspection
  if (t.includes('balcony') && (t.includes('inspection') || t.includes('repair'))) {
    return { category: 'customer', subCategory: 'inspection_inquiry', intent: 'balcony inspection', outcome: 'discussed', summary: `${nameStr}${cityStr} - balcony inspection`, confidence: 'high', notes: 'Balcony lead' };
  }
  
  // Quote/estimate request
  if ((t.includes('quote') || t.includes('estimate') || t.includes('bid')) && (t.includes('come out') || t.includes('schedule'))) {
    return { category: 'customer', subCategory: 'estimate_request', intent: 'schedule estimate', outcome: 'scheduling', summary: `${nameStr}${cityStr} - scheduling estimate`, confidence: 'high', notes: 'Estimate request' };
  }
  
  // Voicemail
  if (t.includes('voicemail') || t.includes('leave a message') || t.includes('call me back') || t.includes('give me a call')) {
    return { category: 'customer', subCategory: 'voicemail_inquiry', intent: 'voicemail', outcome: 'needs callback', summary: `${nameStr}${cityStr} left voicemail`, confidence: 'medium', notes: 'Callback needed' };
  }
  
  // Project inquiry / calling back
  if (t.includes('calling back') || t.includes('called earlier') || t.includes('following up')) {
    return { category: 'customer', subCategory: 'followup', intent: 'followup', outcome: 'discussed', summary: `${nameStr}${cityStr} following up`, confidence: 'high', notes: 'Customer followup' };
  }
  
  // Generic "rhino builders" / "is this rhino"
  if ((t.includes('rhino builder') || t.includes('is this rhino')) && duration > 60) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'inquiry', outcome: 'discussed', summary: `${nameStr}${cityStr} - general inquiry`, confidence: 'medium', notes: 'Needs review' };
  }
  
  // === FALLBACKS ===
  
  // Very short
  if (duration < 20) {
    return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'brief', summary: `${duration}s call - too brief`, confidence: 'low', notes: 'Too short' };
  }
  
  // Long calls
  if (duration > 180) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'project discussion', outcome: 'discussed', summary: `Extended ${Math.floor(duration/60)}min call${cityStr}`, confidence: 'medium', notes: 'Long call - likely customer' };
  }
  
  // Medium calls with city
  if (duration > 60 && city) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'inquiry', outcome: 'discussed', summary: `${nameStr}${cityStr} - ${duration}s call`, confidence: 'medium', notes: 'Needs review' };
  }
  
  // Default
  return { category: 'incomplete', subCategory: 'unclassified', intent: 'unknown', outcome: 'needs review', summary: `${duration}s call${cityStr}`, confidence: 'low', notes: 'Manual review' };
}

// Process all calls
const currentCSV = fs.readFileSync('q4-manual-review.csv', 'utf-8');
const lines = currentCSV.trim().split('\n');
const header = 'id,direction,duration,category,sub_category,caller_intent,outcome,summary,confidence,notes';

const outputLines = [header];
let stats = { spam: 0, customer: 0, operations: 0, other_inquiry: 0, incomplete: 0 };

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^([^,]+),([^,]+),(\d+)/);
  if (!match) continue;
  
  const callId = match[1];
  const direction = match[2];
  const duration = parseInt(match[3]);
  
  const call = callLookup[callId];
  const transcript = transcriptLookup[callId] || call?.assemblyai_text || '';
  
  const analysis = analyzeCall(callId, call, transcript);
  stats[analysis.category] = (stats[analysis.category] || 0) + 1;
  
  const row = [
    callId,
    direction,
    duration,
    analysis.category,
    analysis.subCategory,
    escapeCSV(analysis.intent),
    escapeCSV(analysis.outcome),
    escapeCSV(analysis.summary),
    analysis.confidence,
    escapeCSV(analysis.notes)
  ].join(',');
  
  outputLines.push(row);
}

// Write output
fs.writeFileSync('q4-manual-review.csv', outputLines.join('\n'));
console.log(`Processed ${outputLines.length - 1} calls`);
console.log('Categories:', stats);
