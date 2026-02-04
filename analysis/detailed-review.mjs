import fs from 'fs';

// Load all data
const callsData = JSON.parse(fs.readFileSync('../data/q4-calls-merged.json', 'utf-8'));
const transcriptsData = JSON.parse(fs.readFileSync('../data/q4-transcripts.json', 'utf-8'));

// Build lookups
const transcriptLookup = {};
for (const t of transcriptsData) {
  transcriptLookup[t.call_id] = {
    text: t.text || '',
    utterances: t.utterances || []
  };
}

const callLookup = {};
for (const c of callsData) {
  callLookup[c.id] = c;
}

// Extract names from transcript
function extractNames(transcript) {
  const names = [];
  // Common patterns for names
  const patterns = [
    /(?:this is|my name is|i'm|i am|speaking with|name's|call me)\s+([A-Z][a-z]+)/gi,
    /(?:hi|hello|hey),?\s+(?:this is\s+)?([A-Z][a-z]+)/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      const name = match[1];
      if (name && name.length > 2 && !['This', 'That', 'What', 'Where', 'When', 'Hello', 'Good', 'Just', 'Here', 'There', 'Very'].includes(name)) {
        names.push(name);
      }
    }
  }
  return [...new Set(names)];
}

// Extract addresses/locations
function extractLocations(transcript) {
  const locations = [];
  // Street addresses
  const addressPattern = /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl))/gi;
  const matches = transcript.matchAll(addressPattern);
  for (const match of matches) {
    locations.push(match[1]);
  }
  return [...new Set(locations)];
}

// Extract dollar amounts
function extractAmounts(transcript) {
  const amounts = [];
  const pattern = /\$[\d,]+(?:\.\d{2})?/g;
  const matches = transcript.matchAll(pattern);
  for (const match of matches) {
    amounts.push(match[0]);
  }
  return amounts;
}

// Detailed analysis with specifics
function analyzeCallDetailed(callId, call, transcriptData) {
  const duration = call?.duration || 0;
  const city = call?.customer_city || '';
  const customerName = call?.customer_name?.trim() || '';
  const source = call?.source || '';
  const answered = call?.answered;
  const voicemail = call?.voicemail;
  
  const transcript = transcriptData?.text || call?.assemblyai_text || '';
  const t = transcript.toLowerCase();
  
  // Extract specific details
  const names = extractNames(transcript);
  const locations = extractLocations(transcript);
  const amounts = extractAmounts(transcript);
  
  let category = 'incomplete';
  let subCategory = 'unclassified';
  let intent = 'unknown';
  let outcome = 'needs review';
  let summary = '';
  let confidence = 'low';
  let notes = '';
  
  // Build name string
  const nameStr = names.length > 0 ? names[0] : '';
  const locationStr = locations.length > 0 ? ` at ${locations[0]}` : '';
  const amountStr = amounts.length > 0 ? ` (${amounts[0]})` : '';
  const cityStr = city ? ` in ${city}` : '';
  
  // No transcript cases
  if (!transcript || transcript.length < 10) {
    if (duration < 15) {
      return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'no content', summary: `${duration}s call - too short for content`, confidence: 'high', notes: 'No meaningful content' };
    }
    if (!answered) {
      return { category: 'incomplete', subCategory: 'missed_call', intent: 'unknown', outcome: 'missed', summary: `Missed call from ${city || 'unknown location'} (${duration}s)`, confidence: 'high', notes: 'No recording' };
    }
    return { category: 'incomplete', subCategory: 'no_transcript', intent: 'unknown', outcome: 'unknown', summary: `${duration}s call without transcript`, confidence: 'low', notes: 'Recording needs manual review' };
  }
  
  // SPAM - Robocalls
  if (t.includes('press 1') || t.includes('press one') || t.includes('press 4') || t.includes('press four') || t.includes('press 9') || t.includes('opt out')) {
    return { category: 'spam', subCategory: 'robocall', intent: 'automated spam', outcome: 'ignored', summary: 'Robocall - automated press button spam', confidence: 'high', notes: 'Obvious robocall' };
  }
  
  // SPAM - Google listing
  if (t.includes('google') && (t.includes('listing') || t.includes('business profile') || t.includes('showing up') || t.includes('suspension') || t.includes('verification') || t.includes('voice') || t.includes('maps'))) {
    return { category: 'spam', subCategory: 'google_listing', intent: 'sell SEO services', outcome: 'spam', summary: 'Google listing scam call', confidence: 'high', notes: 'Fake Google services spam' };
  }
  
  // SPAM - Yelp
  if (t.includes('yelp') && (t.includes('advertising') || t.includes('ad ') || t.includes('promotion') || t.includes('business'))) {
    return { category: 'spam', subCategory: 'yelp_sales', intent: 'sell Yelp advertising', outcome: 'declined', summary: 'Yelp sales rep pushing advertising package', confidence: 'high', notes: 'Yelp sales call' };
  }
  
  // SPAM - QuickBooks scam
  if (t.includes('quickbooks') && (t.includes('subscription') || t.includes('payment') || t.includes('renew') || t.includes('charge'))) {
    return { category: 'spam', subCategory: 'quickbooks_scam', intent: 'phishing scam', outcome: 'scam', summary: 'QuickBooks/Intuit subscription scam call', confidence: 'high', notes: 'Financial phishing attempt' };
  }
  
  // SPAM - Business lending
  if (t.includes('small business lending') || t.includes('business loan') || t.includes('line of credit') || t.includes('sba ') || (t.includes('lending') && t.includes('follow up'))) {
    return { category: 'spam', subCategory: 'b2b_lending', intent: 'sell business loans', outcome: 'declined', summary: `Business lending cold call${nameStr ? ` from ${nameStr}` : ''}`, confidence: 'high', notes: 'B2B loan telemarketing' };
  }
  
  // SPAM - Merchant services
  if (t.includes('merchant service') || t.includes('payment processing') || t.includes('credit card processing') || t.includes('credit card machine')) {
    return { category: 'spam', subCategory: 'merchant_services', intent: 'sell payment processing', outcome: 'declined', summary: 'Merchant services sales call', confidence: 'high', notes: 'B2B telemarketing' };
  }
  
  // SPAM - Office supplies
  if ((t.includes('ink') && t.includes('toner')) || t.includes('office supplies')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell office supplies', outcome: 'declined', summary: 'Office supplies telemarketing call', confidence: 'high', notes: 'B2B sales' };
  }
  
  // SPAM - Workshop/seminar
  if (t.includes('workshop') || t.includes('seminar') || t.includes('aspire institute') || t.includes('business training')) {
    return { category: 'spam', subCategory: 'workshop_sales', intent: 'sell business training', outcome: 'declined', summary: `Business workshop sales call${nameStr ? ` from ${nameStr}` : ''}`, confidence: 'high', notes: 'Training spam' };
  }
  
  // SPAM - Estimation services
  if ((t.includes('estimation') || t.includes('estimating')) && (t.includes('service') || t.includes('outsource') || t.includes('team'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell estimation services', outcome: 'declined', summary: 'Estimation outsourcing sales call', confidence: 'high', notes: 'B2B solicitation' };
  }
  
  // SPAM - Engineering services
  if (t.includes('prv engineer') || (t.includes('engineering') && t.includes('services') && t.includes('offer'))) {
    return { category: 'spam', subCategory: 'b2b_engineering', intent: 'sell engineering services', outcome: 'took info', summary: 'Engineering services sales call', confidence: 'high', notes: 'B2B prospecting' };
  }
  
  // OPERATIONS - Home Depot
  if (t.includes('home depot') && (t.includes('phone sale') || t.includes('purchase') || t.includes('card') || t.includes('materials') || t.includes('order'))) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'process material purchase', outcome: 'payment processed', summary: `Home Depot phone sale${amountStr} - materials purchased`, confidence: 'high', notes: 'Material purchase' };
  }
  
  // OPERATIONS - Lowe's
  if (t.includes('lowes') || t.includes("lowe's")) {
    if (t.includes('phone sale') || t.includes('purchase') || t.includes('order') || t.includes('card')) {
      return { category: 'operations', subCategory: 'vendor_purchase', intent: 'process material purchase', outcome: 'payment processed', summary: `Lowe's phone sale${amountStr} - materials ordered`, confidence: 'high', notes: 'Material purchase' };
    }
    if (t.includes('wrong number')) {
      return { category: 'incomplete', subCategory: 'wrong_number', intent: 'wrong number', outcome: 'hung up', summary: "Lowe's called wrong number", confidence: 'high', notes: 'Wrong number' };
    }
  }
  
  // OPERATIONS - Building materials
  if (t.includes('ashby lumber') || t.includes('westside building') || t.includes('floor and decor') || t.includes('floor & decor')) {
    const vendor = t.includes('ashby') ? 'Ashby Lumber' : t.includes('westside') ? 'Westside Building Materials' : 'Floor & Decor';
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'process material purchase', outcome: 'payment processed', summary: `${vendor} purchase${amountStr}`, confidence: 'high', notes: 'Material purchase' };
  }
  
  // OPERATIONS - Blueprint printing
  if (t.includes('blueprint') || t.includes('bpx') || (t.includes('printing') && t.includes('permit'))) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'blueprint printing', outcome: 'processed', summary: `Blueprint/permit printing${locationStr}`, confidence: 'high', notes: 'Printing vendor' };
  }
  
  // OPERATIONS - Hebrew internal
  if ((t.includes('hebrew') || /[\u0590-\u05FF]/.test(transcript)) && duration > 60) {
    return { category: 'operations', subCategory: 'internal_hebrew', intent: 'internal discussion', outcome: 'discussed', summary: 'Internal call in Hebrew - operations discussion', confidence: 'high', notes: 'Internal - Hebrew' };
  }
  
  // OPERATIONS - Internal coordination (Shy/Itay mentions)
  if ((t.includes('shy') || t.includes('shay') || t.includes('itay')) && (t.includes('job') || t.includes('estimate') || t.includes('schedule') || t.includes('production'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal coordination', outcome: 'discussed', summary: 'Internal team coordination call', confidence: 'high', notes: 'Internal operations' };
  }
  
  // OPERATIONS - Bookkeeping
  if ((t.includes('bookkeeping') || t.includes('accounting')) || (t.includes('invoice') && t.includes('pay')) || t.includes('subcontractor pay') || (t.includes('quickbooks') && !t.includes('scam') && !t.includes('subscription'))) {
    return { category: 'operations', subCategory: 'internal_accounting', intent: 'bookkeeping discussion', outcome: 'processing', summary: 'Internal bookkeeping/accounting call', confidence: 'high', notes: 'Internal accounting' };
  }
  
  // OPERATIONS - RingCentral
  if (t.includes('ringcentral')) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'phone service discussion', outcome: 'discussed', summary: 'RingCentral account service call', confidence: 'high', notes: 'Phone vendor' };
  }
  
  // OPERATIONS - Permits
  if ((t.includes('permit') || t.includes('inspection')) && (t.includes('city') || t.includes('county') || t.includes('fire district'))) {
    const entity = t.includes('fire district') ? 'Fire District' : t.includes('city') ? 'City' : 'County';
    return { category: 'operations', subCategory: 'permit_inspection', intent: 'permit/inspection followup', outcome: 'discussed', summary: `${entity} permit/inspection call${locationStr}`, confidence: 'high', notes: 'Permit related' };
  }
  
  // OPERATIONS - Real estate
  if (t.includes('disclosures') || t.includes('escrow') || (t.includes('real estate') && t.includes('paperwork'))) {
    return { category: 'operations', subCategory: 'real_estate_paperwork', intent: 'documentation followup', outcome: 'discussed', summary: `Real estate documentation call${locationStr}`, confidence: 'high', notes: 'Real estate paperwork' };
  }
  
  // OPERATIONS - Vehicle/personal
  if (t.includes('crash champions') || t.includes('body shop') || (t.includes('vehicle') && t.includes('repair'))) {
    return { category: 'operations', subCategory: 'personal', intent: 'vehicle update', outcome: 'forwarded', summary: 'Vehicle repair update call', confidence: 'high', notes: 'Personal - forwarded' };
  }
  
  // CUSTOMER - ADU
  if (t.includes('adu') || t.includes('accessory dwelling') || t.includes('granny unit') || t.includes('in-law unit')) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'ADU construction inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about ADU construction${locationStr}`, confidence: 'high', notes: 'ADU lead' };
  }
  
  // CUSTOMER - Garage conversion
  if (t.includes('garage conversion') || t.includes('convert my garage') || t.includes('garage to living') || t.includes('garage into')) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'garage conversion inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about garage conversion${locationStr}`, confidence: 'high', notes: 'Garage conversion lead' };
  }
  
  // CUSTOMER - Foundation
  if (t.includes('foundation') && (t.includes('repair') || t.includes('crack') || t.includes('settle') || t.includes('problem') || t.includes('issue'))) {
    return { category: 'customer', subCategory: 'foundation_inquiry', intent: 'foundation repair inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about foundation repair${locationStr}`, confidence: 'high', notes: 'Foundation lead' };
  }
  
  // CUSTOMER - Concrete
  if (t.includes('concrete') || t.includes('cement')) {
    let workType = 'work';
    if (t.includes('driveway')) workType = 'driveway';
    else if (t.includes('patio')) workType = 'patio';
    else if (t.includes('sidewalk')) workType = 'sidewalk';
    else if (t.includes('slab')) workType = 'slab';
    else if (t.includes('balcony')) workType = 'balcony';
    else if (t.includes('pad')) workType = 'pad';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: `concrete ${workType} inquiry`, outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about concrete ${workType}${locationStr}`, confidence: 'high', notes: 'Concrete lead' };
  }
  
  // CUSTOMER - Drainage
  if (t.includes('drainage') || t.includes('french drain') || (t.includes('water') && (t.includes('yard') || t.includes('basement') || t.includes('backyard')))) {
    return { category: 'customer', subCategory: 'drainage_inquiry', intent: 'drainage system inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about drainage/French drain${locationStr}`, confidence: 'high', notes: 'Drainage lead' };
  }
  
  // CUSTOMER - Retaining wall
  if (t.includes('retaining wall')) {
    return { category: 'customer', subCategory: 'retaining_wall', intent: 'retaining wall inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about retaining wall${locationStr}`, confidence: 'high', notes: 'Retaining wall lead' };
  }
  
  // CUSTOMER - Bathroom remodel
  if (t.includes('bathroom') && (t.includes('remodel') || t.includes('renovation') || t.includes('update') || t.includes('redo'))) {
    return { category: 'customer', subCategory: 'bathroom_remodel', intent: 'bathroom remodel inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about bathroom remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  // CUSTOMER - Kitchen remodel
  if (t.includes('kitchen') && (t.includes('remodel') || t.includes('renovation') || t.includes('update') || t.includes('redo'))) {
    return { category: 'customer', subCategory: 'kitchen_remodel', intent: 'kitchen remodel inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about kitchen remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  // CUSTOMER - Balcony inspection
  if (t.includes('balcony') && (t.includes('inspection') || t.includes('sb 326') || t.includes('sb326') || t.includes('compliance'))) {
    return { category: 'customer', subCategory: 'inspection_inquiry', intent: 'balcony inspection inquiry', outcome: 'discussed', summary: `${nameStr || 'Customer'}${cityStr} inquiring about balcony inspection${locationStr}`, confidence: 'high', notes: 'Balcony inspection lead' };
  }
  
  // CUSTOMER - Fire damage
  if (t.includes('fire damage') || t.includes('fire repair') || (t.includes('fire') && t.includes('rebuild'))) {
    return { category: 'customer', subCategory: 'fire_damage', intent: 'fire damage repair inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about fire damage repair`, confidence: 'high', notes: 'Fire damage lead' };
  }
  
  // CUSTOMER - Windows/doors/siding
  if (t.includes('window') || t.includes('door') || t.includes('siding')) {
    let workType = t.includes('window') ? 'window' : t.includes('door') ? 'door' : 'siding';
    return { category: 'customer', subCategory: 'exterior_inquiry', intent: `${workType} inquiry`, outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about ${workType} work`, confidence: 'high', notes: 'Exterior work lead' };
  }
  
  // CUSTOMER - Roofing
  if (t.includes('roof') && (t.includes('leak') || t.includes('repair') || t.includes('replace') || t.includes('damage'))) {
    return { category: 'customer', subCategory: 'roof_inquiry', intent: 'roofing inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about roofing work`, confidence: 'high', notes: 'Roofing lead' };
  }
  
  // CUSTOMER - Deck
  if (t.includes('deck') && (t.includes('build') || t.includes('repair') || t.includes('replace') || t.includes('new'))) {
    return { category: 'customer', subCategory: 'deck_inquiry', intent: 'deck inquiry', outcome: 'discussed project', summary: `${nameStr || 'Customer'}${cityStr} inquiring about deck work`, confidence: 'high', notes: 'Deck lead' };
  }
  
  // CUSTOMER - Commercial
  if (t.includes('commercial') || t.includes('prevailing wage') || t.includes('business property') || t.includes('hotel') || t.includes('la quinta') || t.includes('apartment complex')) {
    return { category: 'customer', subCategory: 'commercial_inquiry', intent: 'commercial project inquiry', outcome: 'discussed project', summary: `Commercial project inquiry${cityStr}${locationStr}`, confidence: 'high', notes: 'Commercial lead' };
  }
  
  // CUSTOMER - Houzz lead
  if (t.includes('houzz')) {
    return { category: 'customer', subCategory: 'houzz_lead', intent: 'Houzz inquiry response', outcome: 'scheduling', summary: `Houzz lead${cityStr} - scheduling consultation`, confidence: 'high', notes: 'Houzz lead' };
  }
  
  // CUSTOMER - Voicemail
  if (t.includes('voicemail') || t.includes('leave a message') || t.includes('please call me back') || t.includes('give me a call')) {
    return { category: 'customer', subCategory: 'voicemail_inquiry', intent: 'left voicemail', outcome: 'awaiting callback', summary: `${nameStr || 'Customer'}${cityStr} left voicemail requesting callback`, confidence: 'medium', notes: 'Needs callback' };
  }
  
  // CUSTOMER - Estimate/quote request
  if (t.includes('quote') || t.includes('estimate') || t.includes('bid') || t.includes('how much') || t.includes('price')) {
    return { category: 'customer', subCategory: 'estimate_request', intent: 'requesting estimate', outcome: 'discussed', summary: `${nameStr || 'Customer'}${cityStr} requesting quote/estimate`, confidence: 'medium', notes: 'Estimate request' };
  }
  
  // CUSTOMER - Scheduling
  if (t.includes('appointment') || t.includes('schedule') || t.includes('come out') || t.includes('site visit') || t.includes('available')) {
    return { category: 'customer', subCategory: 'scheduling', intent: 'schedule appointment', outcome: 'scheduling', summary: `${nameStr || 'Customer'}${cityStr} scheduling site visit`, confidence: 'high', notes: 'Scheduling' };
  }
  
  // CUSTOMER - Followup
  if (t.includes('following up') || t.includes('follow up') || t.includes('checking in') || t.includes('called before') || t.includes('spoke earlier')) {
    return { category: 'customer', subCategory: 'followup', intent: 'following up', outcome: 'discussed', summary: `${nameStr || 'Customer'}${cityStr} following up on previous inquiry`, confidence: 'high', notes: 'Customer followup' };
  }
  
  // OTHER - Out of area
  if (t.includes('out of') && (t.includes('area') || t.includes('service'))) {
    return { category: 'other_inquiry', subCategory: 'out_of_area', intent: 'inquiry from outside service area', outcome: 'declined', summary: `Customer${cityStr} outside service area - declined`, confidence: 'high', notes: 'Out of service area' };
  }
  
  // OTHER - Sign inquiry
  if (t.includes('sign') && (t.includes('property') || t.includes('why') || t.includes('abandoned') || t.includes('yard'))) {
    return { category: 'other_inquiry', subCategory: 'sign_inquiry', intent: 'asking about Rhino sign', outcome: 'explained', summary: 'Person asking about Rhino sign on property', confidence: 'high', notes: 'Sign inquiry - not customer' };
  }
  
  // OTHER - Vendor seeking work
  if (t.includes('subcontractor') || t.includes('fabricator') || (t.includes('services') && t.includes('offer'))) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'offering services', outcome: 'took info', summary: `Vendor/subcontractor${nameStr ? ` (${nameStr})` : ''} offering services`, confidence: 'high', notes: 'Vendor seeking work' };
  }
  
  // SHORT CALLS
  if (duration < 20) {
    return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'too brief', summary: `Brief ${duration}s call - insufficient content`, confidence: 'low', notes: 'Too short to classify' };
  }
  
  // LONG CALLS - likely customer
  if (duration > 120) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'project discussion', outcome: 'discussed', summary: `Extended ${Math.floor(duration/60)}min call${cityStr} - potential customer inquiry`, confidence: 'medium', notes: 'Long call - likely customer' };
  }
  
  // DEFAULT
  return { category: 'incomplete', subCategory: 'unclassified', intent: 'unknown', outcome: 'needs review', summary: `${duration}s call${cityStr} - requires transcript review`, confidence: 'low', notes: 'Needs manual review' };
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

// Process all calls
const currentCSV = fs.readFileSync('q4-manual-review.csv', 'utf-8');
const lines = currentCSV.trim().split('\n');
const header = 'id,direction,duration,category,sub_category,caller_intent,outcome,summary,confidence,notes';

const outputLines = [header];
let stats = { spam: 0, customer: 0, operations: 0, other: 0, incomplete: 0 };

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^([^,]+),([^,]+),(\d+)/);
  if (!match) continue;
  
  const callId = match[1];
  const direction = match[2];
  const duration = parseInt(match[3]);
  
  const call = callLookup[callId];
  const transcriptData = transcriptLookup[callId];
  
  const analysis = analyzeCallDetailed(callId, call, transcriptData);
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
console.log('Updated q4-manual-review.csv');
