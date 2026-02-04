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
    /(?:my name is|this is|i'm|i am|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:hi,?\s+)?(?:this is\s+)?([A-Z][a-z]+)\s+(?:calling|from|here)/i,
  ];
  for (const p of patterns) {
    const m = transcript.match(p);
    if (m && m[1] && !['This', 'Hello', 'Good', 'Roli', 'Roly', 'Wally'].includes(m[1])) {
      return m[1];
    }
  }
  return '';
}

// Extract phone numbers
function extractPhone(transcript) {
  const m = transcript.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
  return m ? m[1] : '';
}

// Comprehensive analysis
function analyzeCall(callId, call, transcript) {
  const duration = call?.duration || 0;
  const city = call?.customer_city || '';
  const answered = call?.answered;
  
  if (!transcript || transcript.length < 15) {
    if (duration < 15) {
      return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'no content', summary: `${duration}s call - no content`, confidence: 'high', notes: 'Too short' };
    }
    if (!answered) {
      return { category: 'incomplete', subCategory: 'missed_call', intent: 'unknown', outcome: 'missed', summary: `Missed call from ${city || 'unknown'}`, confidence: 'high', notes: 'No recording' };
    }
    return { category: 'incomplete', subCategory: 'no_transcript', intent: 'unknown', outcome: 'unknown', summary: `${duration}s call - no transcript`, confidence: 'low', notes: 'Needs recording review' };
  }
  
  const t = transcript.toLowerCase();
  const name = extractName(transcript);
  const cityStr = city ? ` in ${city}` : '';
  const nameStr = name ? `${name}` : 'Customer';
  
  // === SPAM PATTERNS ===
  
  // Robocalls
  if (t.includes('press 1') || t.includes('press one') || t.includes('press 2') || t.includes('press 4') || t.includes('press 9') || t.includes('to opt out') || t.includes('opt out')) {
    return { category: 'spam', subCategory: 'robocall', intent: 'automated spam', outcome: 'ignored', summary: 'Robocall - press button spam', confidence: 'high', notes: 'Robocall' };
  }
  
  // Google listing spam
  if (t.includes('google') && (t.includes('listing') || t.includes('voice search') || t.includes('my business') || t.includes('showing') || t.includes('suspension') || t.includes('maps'))) {
    if (t.includes('google certifi') || t.includes('profile')) {
      const spamName = name || 'Stephen';
      return { category: 'spam', subCategory: 'google_listing', intent: 'sell SEO services', outcome: 'declined', summary: `Google listing scam call from ${spamName}`, confidence: 'high', notes: 'Fake Google services' };
    }
    return { category: 'spam', subCategory: 'google_listing', intent: 'sell SEO services', outcome: 'ignored', summary: 'Google listing spam', confidence: 'high', notes: 'Google scam' };
  }
  
  // Small Business Lending
  if (t.includes('small business lending') || t.includes('line of credit') || t.includes('pre approved') || t.includes('pre-approved')) {
    return { category: 'spam', subCategory: 'b2b_lending', intent: 'sell business loans', outcome: 'ignored', summary: 'Small Business Lending cold call (Tim)', confidence: 'high', notes: 'Repeat spam caller' };
  }
  
  // Yelp sales
  if (t.includes('yelp') && (t.includes('advertis') || t.includes('promo'))) {
    return { category: 'spam', subCategory: 'yelp_sales', intent: 'sell advertising', outcome: 'declined', summary: 'Yelp sales call', confidence: 'high', notes: 'Yelp spam' };
  }
  
  // QuickBooks scam
  if (t.includes('quickbooks') || t.includes('intuit')) {
    if (t.includes('subscription') || t.includes('charge') || t.includes('renew')) {
      return { category: 'spam', subCategory: 'quickbooks_scam', intent: 'phishing', outcome: 'scam', summary: 'QuickBooks subscription scam', confidence: 'high', notes: 'Financial scam' };
    }
  }
  
  // Merchant services
  if (t.includes('merchant service') || t.includes('credit card processing') || t.includes('payment processing')) {
    return { category: 'spam', subCategory: 'merchant_services', intent: 'sell payment services', outcome: 'declined', summary: 'Merchant services cold call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Office supplies
  if ((t.includes('ink') && t.includes('toner')) || (t.includes('office') && t.includes('supplies'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell office supplies', outcome: 'declined', summary: 'Office supplies telemarketing', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Workshops/seminars
  if (t.includes('workshop') || t.includes('seminar') || t.includes('aspire institute')) {
    return { category: 'spam', subCategory: 'workshop_sales', intent: 'sell training', outcome: 'declined', summary: 'Business workshop sales call', confidence: 'high', notes: 'Training spam' };
  }
  
  // Estimation outsourcing
  if ((t.includes('estimat') && t.includes('outsourc')) || (t.includes('estimat') && t.includes('service'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell estimation services', outcome: 'declined', summary: 'Estimation outsourcing sales call', confidence: 'high', notes: 'B2B solicitation' };
  }
  
  // Claim Notify / asset recovery
  if (t.includes('claim notify') || t.includes('asset recovery')) {
    return { category: 'spam', subCategory: 'cold_call', intent: 'asset recovery pitch', outcome: 'declined', summary: 'Claim Notify asset recovery cold call', confidence: 'high', notes: 'Scam likely' };
  }
  
  // United Eagle Group / accounts receivable
  if (t.includes('united eagle') || t.includes('accounts receivable')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B solicitation', outcome: 'declined', summary: 'United Eagle Group cold call (Kate)', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Amazon logistics (not spam but operational)
  if (t.includes('amazon') && (t.includes('delivery') || t.includes('logistics'))) {
    return { category: 'operations', subCategory: 'vendor_logistics', intent: 'delivery coordination', outcome: 'automated message', summary: 'Amazon delivery instructions automated call', confidence: 'high', notes: 'Amazon logistics' };
  }
  
  // === OPERATIONS PATTERNS ===
  
  // Home Depot phone sale
  if ((t.includes('home depot') || t.includes('depot')) && (t.includes('phone sale') || t.includes('dustin') || t.includes('diana') || t.includes('felix'))) {
    const amountMatch = transcript.match(/\$[\d,]+(?:\.\d{2})?/);
    const amount = amountMatch ? ` ${amountMatch[0]}` : '';
    const job = t.includes('lafayette') ? ' for Lafayette job' : '';
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: `Home Depot phone sale${amount}${job}`, confidence: 'high', notes: 'Material purchase' };
  }
  
  // Lowe's phone sale
  if ((t.includes('lowes') || t.includes("lowe's")) && (t.includes('phone sale') || t.includes('order'))) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: "Lowe's phone sale - materials ordered", confidence: 'high', notes: 'Material purchase' };
  }
  
  // Building materials vendors
  if (t.includes('ashby lumber')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: 'Ashby Lumber purchase', confidence: 'high', notes: 'Lumber purchase' };
  }
  if (t.includes('westside building')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: 'Westside Building Materials purchase', confidence: 'high', notes: 'Material purchase' };
  }
  if (t.includes('floor and decor') || t.includes('floor & decor')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: 'Floor & Decor purchase', confidence: 'high', notes: 'Flooring purchase' };
  }
  
  // Subcontractor check pickup / payment
  if ((t.includes('dragon') || t.includes('subcontractor')) && (t.includes('check') || t.includes('payment'))) {
    const projectMatch = transcript.match(/(?:project|job)\s+(?:in\s+)?([A-Z][a-z]+)/i);
    const project = projectMatch ? ` for ${projectMatch[1]} project` : '';
    return { category: 'operations', subCategory: 'subcontractor_payment', intent: 'check pickup', outcome: 'processing', summary: `Subcontractor (Dragon) requesting payment${project}`, confidence: 'high', notes: 'Sub payment' };
  }
  
  // Internal crew coordination
  if ((t.includes('plumber') || t.includes('tubs') || t.includes('discovery bay')) && (t.includes('tomorrow') || t.includes('work'))) {
    return { category: 'operations', subCategory: 'crew_coordination', intent: 'job scheduling', outcome: 'coordinating', summary: 'Internal crew call - job scheduling Discovery Bay', confidence: 'high', notes: 'Crew coordination' };
  }
  
  // RingCentral
  if (t.includes('ringcentral')) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'phone service', outcome: 'discussed', summary: 'RingCentral service call', confidence: 'high', notes: 'Phone vendor' };
  }
  
  // Shy/Shea on vacation
  if ((t.includes('shy') || t.includes('shea') || t.includes('shay')) && t.includes('vacation')) {
    return { category: 'operations', subCategory: 'owner_unavailable', intent: 'reach owner', outcome: 'on vacation', summary: 'Caller asking for Shy (on vacation)', confidence: 'high', notes: 'Owner unavailable' };
  }
  
  // Internal WhatsApp coordination
  if (t.includes('whatsapp') && (t.includes('call') || t.includes('sally'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal coordination', outcome: 'resolved', summary: 'Brief internal coordination call', confidence: 'high', notes: 'Internal' };
  }
  
  // Elon followup (internal contact)
  if (t.includes('elon') && t.includes('shai')) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal followup', outcome: 'owner unavailable', summary: 'Elon calling to reach Shai', confidence: 'high', notes: 'Internal contact' };
  }
  
  // Bookkeeping
  if (t.includes('bookkeeping') || t.includes('invoice') || t.includes('accounting')) {
    return { category: 'operations', subCategory: 'internal_accounting', intent: 'bookkeeping', outcome: 'processing', summary: 'Internal bookkeeping call', confidence: 'high', notes: 'Accounting' };
  }
  
  // Permits
  if ((t.includes('permit') || t.includes('inspection')) && (t.includes('city') || t.includes('county') || t.includes('fire'))) {
    return { category: 'operations', subCategory: 'permit_inspection', intent: 'permit followup', outcome: 'discussed', summary: 'City/County permit or inspection call', confidence: 'high', notes: 'Permit related' };
  }
  
  // === WRONG NUMBER ===
  if (t.includes('wrong number') || t.includes('smp construction') || t.includes('is this') && t.includes('no')) {
    return { category: 'incomplete', subCategory: 'wrong_number', intent: 'wrong number', outcome: 'clarified', summary: 'Wrong number - caller looking for different company', confidence: 'high', notes: 'Wrong number' };
  }
  
  // === CUSTOMER PATTERNS ===
  
  // Houzz leads
  if (t.includes('houzz')) {
    return { category: 'customer', subCategory: 'houzz_lead', intent: 'Houzz inquiry', outcome: 'scheduling', summary: `${nameStr}${cityStr} calling back from Houzz - scheduling appointment`, confidence: 'high', notes: 'Houzz lead - hot!' };
  }
  
  // Honey Homes referral
  if (t.includes('honey homes')) {
    return { category: 'customer', subCategory: 'partner_referral', intent: 'property inspection', outcome: 'discussed', summary: `Honey Homes (${nameStr}) calling about member's water intrusion issue`, confidence: 'high', notes: 'Property management referral' };
  }
  
  // Grab bars / accessibility
  if (t.includes('bars') && (t.includes('bathroom') || t.includes('shower') || t.includes('toilet'))) {
    const phone = extractPhone(transcript);
    return { category: 'customer', subCategory: 'accessibility_inquiry', intent: 'grab bars installation', outcome: 'left message', summary: `${nameStr}${cityStr} needs grab bars in bathroom (phone: ${phone || 'in voicemail'})`, confidence: 'high', notes: 'Accessibility lead' };
  }
  
  // Concrete slab / backyard
  if (t.includes('slab') || (t.includes('concrete') && t.includes('backyard'))) {
    const sqftMatch = transcript.match(/(\d+)\s*(?:square foot|sq ft|sqft)/i);
    const sqft = sqftMatch ? ` ~${sqftMatch[1]} sqft` : '';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: 'concrete slab', outcome: 'left message', summary: `${nameStr}${cityStr} wants backyard concrete slab${sqft}`, confidence: 'high', notes: 'Concrete lead' };
  }
  
  // Wine cellar / waterproofing
  if (t.includes('wine cellar') || t.includes('below grade') || t.includes('water enters')) {
    return { category: 'customer', subCategory: 'waterproofing_inquiry', intent: 'water intrusion', outcome: 'discussed', summary: `${nameStr}${cityStr} - water intrusion in wine cellar/basement`, confidence: 'high', notes: 'Waterproofing lead' };
  }
  
  // ADU
  if (t.includes('adu') || t.includes('accessory dwelling') || t.includes('granny unit')) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'ADU construction', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about ADU`, confidence: 'high', notes: 'ADU lead' };
  }
  
  // Garage conversion
  if (t.includes('garage conversion') || (t.includes('garage') && t.includes('convert'))) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'garage conversion', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about garage conversion`, confidence: 'high', notes: 'Garage conversion lead' };
  }
  
  // Foundation
  if (t.includes('foundation') && (t.includes('repair') || t.includes('crack') || t.includes('problem') || t.includes('work'))) {
    const outOfArea = t.includes('vacaville') || t.includes('don\'t cover') || t.includes("don't") && t.includes('cover');
    if (outOfArea) {
      return { category: 'other_inquiry', subCategory: 'out_of_area', intent: 'foundation inquiry', outcome: 'declined - out of area', summary: `${nameStr}${cityStr} asking about foundation - outside service area`, confidence: 'high', notes: 'Out of service area' };
    }
    return { category: 'customer', subCategory: 'foundation_inquiry', intent: 'foundation repair', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about foundation work`, confidence: 'high', notes: 'Foundation lead' };
  }
  
  // Concrete general
  if (t.includes('concrete') || t.includes('cement')) {
    let type = '';
    if (t.includes('driveway')) type = 'driveway';
    else if (t.includes('patio')) type = 'patio';
    else if (t.includes('sidewalk')) type = 'sidewalk';
    else if (t.includes('pad')) type = 'pad';
    else type = 'work';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: `concrete ${type}`, outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about concrete ${type}`, confidence: 'high', notes: 'Concrete lead' };
  }
  
  // Drainage
  if (t.includes('drainage') || t.includes('french drain') || (t.includes('water') && t.includes('yard'))) {
    return { category: 'customer', subCategory: 'drainage_inquiry', intent: 'drainage', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about drainage`, confidence: 'high', notes: 'Drainage lead' };
  }
  
  // Retaining wall
  if (t.includes('retaining wall')) {
    return { category: 'customer', subCategory: 'retaining_wall', intent: 'retaining wall', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about retaining wall`, confidence: 'high', notes: 'Retaining wall lead' };
  }
  
  // Bathroom remodel
  if (t.includes('bathroom') && (t.includes('remodel') || t.includes('renovation'))) {
    return { category: 'customer', subCategory: 'bathroom_remodel', intent: 'bathroom remodel', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about bathroom remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  // Kitchen remodel
  if (t.includes('kitchen') && (t.includes('remodel') || t.includes('renovation'))) {
    return { category: 'customer', subCategory: 'kitchen_remodel', intent: 'kitchen remodel', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about kitchen remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  // Roof
  if (t.includes('roof') && (t.includes('leak') || t.includes('repair') || t.includes('replace'))) {
    return { category: 'customer', subCategory: 'roof_inquiry', intent: 'roofing', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about roofing`, confidence: 'high', notes: 'Roofing lead' };
  }
  
  // Windows/doors/siding
  if (t.includes('window') || t.includes('door') || t.includes('siding')) {
    const type = t.includes('window') ? 'windows' : t.includes('door') ? 'doors' : 'siding';
    return { category: 'customer', subCategory: 'exterior_inquiry', intent: type, outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about ${type}`, confidence: 'high', notes: 'Exterior lead' };
  }
  
  // Fire damage
  if (t.includes('fire') && (t.includes('damage') || t.includes('repair') || t.includes('rebuild'))) {
    return { category: 'customer', subCategory: 'fire_damage', intent: 'fire damage repair', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about fire damage repair`, confidence: 'high', notes: 'Fire damage lead' };
  }
  
  // Balcony inspection
  if (t.includes('balcony') && (t.includes('inspection') || t.includes('repair'))) {
    return { category: 'customer', subCategory: 'inspection_inquiry', intent: 'balcony inspection', outcome: 'discussed', summary: `${nameStr}${cityStr} inquiring about balcony inspection`, confidence: 'high', notes: 'Balcony lead' };
  }
  
  // Quote/estimate request (generic)
  if ((t.includes('quote') || t.includes('estimate') || t.includes('bid')) && (t.includes('come out') || t.includes('schedule') || t.includes('review'))) {
    return { category: 'customer', subCategory: 'estimate_request', intent: 'schedule estimate', outcome: 'scheduling', summary: `${nameStr}${cityStr} scheduling estimate appointment`, confidence: 'high', notes: 'Estimate request' };
  }
  
  // Voicemail
  if (t.includes('voicemail') || t.includes('leave a message') || t.includes('call me back') || t.includes('give me a call')) {
    const phone = extractPhone(transcript);
    return { category: 'customer', subCategory: 'voicemail_inquiry', intent: 'left voicemail', outcome: 'needs callback', summary: `${nameStr}${cityStr} left voicemail${phone ? ` (${phone})` : ''}`, confidence: 'medium', notes: 'Callback needed' };
  }
  
  // === FALLBACKS ===
  
  // Short calls
  if (duration < 20) {
    return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'brief', summary: `${duration}s call - too brief to classify`, confidence: 'low', notes: 'Too short' };
  }
  
  // Long calls - likely customer
  if (duration > 180) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'project discussion', outcome: 'discussed', summary: `Extended ${Math.floor(duration/60)}min call${cityStr} - detailed project discussion`, confidence: 'medium', notes: 'Long call - likely customer' };
  }
  
  // Medium calls with city
  if (duration > 60 && city) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'inquiry', outcome: 'discussed', summary: `${nameStr}${cityStr} - ${duration}s conversation`, confidence: 'medium', notes: 'Needs review' };
  }
  
  // Default
  return { category: 'incomplete', subCategory: 'unclassified', intent: 'unknown', outcome: 'needs review', summary: `${duration}s call${cityStr}`, confidence: 'low', notes: 'Manual review needed' };
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
