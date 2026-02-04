import fs from 'fs';

// Load all data
const callsData = JSON.parse(fs.readFileSync('../data/q4-calls-merged.json', 'utf-8'));
const transcriptsData = JSON.parse(fs.readFileSync('../data/q4-transcripts.json', 'utf-8'));

// Build transcript lookup
const transcriptLookup = {};
for (const t of transcriptsData) {
  transcriptLookup[t.call_id] = t.text || '';
}

// Build call data lookup
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

// Analyze transcript and generate detailed notes
function analyzeCall(callId, call, transcript) {
  const duration = call?.duration || 0;
  const city = call?.customer_city || '';
  const name = call?.customer_name?.trim() || '';
  const source = call?.source || '';
  const answered = call?.answered;
  const voicemail = call?.voicemail;
  
  const t = (transcript || '').toLowerCase();
  
  // Default values
  let category = 'incomplete';
  let subCategory = 'unclassified';
  let intent = 'unknown';
  let outcome = 'needs review';
  let summary = '';
  let confidence = 'low';
  let notes = '';
  
  // No transcript cases
  if (!transcript || transcript.length < 10) {
    if (duration < 15) {
      return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'no content', summary: 'Call too short - no meaningful content', confidence: 'high', notes: `${duration}s call with no transcript` };
    }
    if (!answered) {
      return { category: 'incomplete', subCategory: 'missed_call', intent: 'unknown', outcome: 'missed', summary: 'Missed call - no recording', confidence: 'high', notes: 'No transcript available' };
    }
    return { category: 'incomplete', subCategory: 'no_transcript', intent: 'unknown', outcome: 'unknown', summary: 'Call without transcript - cannot review', confidence: 'low', notes: 'Needs manual review of recording' };
  }
  
  // SPAM DETECTION
  if (t.includes('press 1') || t.includes('press one') || t.includes('press 4') || t.includes('press four') || t.includes('press 9')) {
    return { category: 'spam', subCategory: 'robocall', intent: 'automated spam', outcome: 'ignored', summary: 'Robocall - automated press button prompt', confidence: 'high', notes: 'Obvious robocall spam' };
  }
  
  if (t.includes('google') && (t.includes('listing') || t.includes('business profile') || t.includes('showing up') || t.includes('suspension') || t.includes('verification'))) {
    return { category: 'spam', subCategory: 'google_listing', intent: 'sell SEO/listing services', outcome: 'spam call', summary: 'Google listing/SEO spam call', confidence: 'high', notes: 'Fake Google services scam' };
  }
  
  if (t.includes('yelp') && (t.includes('advertising') || t.includes('ad') || t.includes('promotion'))) {
    return { category: 'spam', subCategory: 'yelp_sales', intent: 'sell Yelp advertising', outcome: 'declined', summary: 'Yelp sales rep pushing advertising', confidence: 'high', notes: 'Yelp sales call' };
  }
  
  if (t.includes('quickbooks') || t.includes('intuit')) {
    return { category: 'spam', subCategory: 'quickbooks_scam', intent: 'phishing/scam', outcome: 'scam identified', summary: 'QuickBooks/Intuit scam call', confidence: 'high', notes: 'Financial phishing attempt' };
  }
  
  if (t.includes('merchant service') || t.includes('payment processing') || t.includes('credit card processing')) {
    return { category: 'spam', subCategory: 'merchant_services', intent: 'sell payment processing', outcome: 'declined', summary: 'Merchant services sales call', confidence: 'high', notes: 'B2B telemarketing' };
  }
  
  if (t.includes('small business lending') || t.includes('business loan') || t.includes('line of credit') || t.includes('sba loan')) {
    return { category: 'spam', subCategory: 'b2b_lending', intent: 'sell business loans', outcome: 'declined', summary: 'Business lending cold call', confidence: 'high', notes: 'B2B loan telemarketing' };
  }
  
  if (t.includes('ink') && t.includes('toner')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell office supplies', outcome: 'declined', summary: 'Office supplies sales call', confidence: 'high', notes: 'B2B telemarketing' };
  }
  
  if (t.includes('workshop') || t.includes('seminar') || t.includes('aspire institute')) {
    return { category: 'spam', subCategory: 'workshop_sales', intent: 'sell business training', outcome: 'declined', summary: 'Business workshop/seminar sales call', confidence: 'high', notes: 'Training sales spam' };
  }
  
  if ((t.includes('estimation') || t.includes('estimating')) && (t.includes('service') || t.includes('outsource'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell estimation services', outcome: 'declined', summary: 'Estimation outsourcing sales call', confidence: 'high', notes: 'B2B services solicitation' };
  }
  
  if (t.includes('cold call') || t.includes('this is a sales call')) {
    return { category: 'spam', subCategory: 'cold_call', intent: 'B2B solicitation', outcome: 'declined', summary: 'Cold call solicitation', confidence: 'high', notes: 'At least they were upfront about it' };
  }
  
  // INTERNAL/OPERATIONS
  if (t.includes('home depot') && (t.includes('phone sale') || t.includes('purchase') || t.includes('card') || t.includes('materials'))) {
    const amountMatch = transcript.match(/\$[\d,]+\.?\d*/);
    const amount = amountMatch ? amountMatch[0] : '';
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'process material purchase', outcome: 'payment processed', summary: `Home Depot phone sale ${amount} - materials purchased`, confidence: 'high', notes: 'Material purchase' };
  }
  
  if (t.includes('lowes') || t.includes("lowe's")) {
    if (t.includes('phone sale') || t.includes('purchase') || t.includes('order')) {
      return { category: 'operations', subCategory: 'vendor_purchase', intent: 'process material purchase', outcome: 'payment processed', summary: "Lowe's phone sale - materials purchased", confidence: 'high', notes: 'Material purchase' };
    }
    if (t.includes('wrong number')) {
      return { category: 'incomplete', subCategory: 'wrong_number', intent: 'wrong number', outcome: 'hung up', summary: "Lowe's called wrong number", confidence: 'high', notes: 'Wrong number' };
    }
  }
  
  if (t.includes('ashby lumber') || t.includes('westside building') || t.includes('floor and decor') || t.includes('floor & decor')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'process material purchase', outcome: 'payment processed', summary: 'Building materials vendor purchase', confidence: 'high', notes: 'Material purchase' };
  }
  
  if (t.includes('blueprint') || t.includes('printing') || t.includes('permit drawing') || t.includes('bpx')) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'blueprint/permit printing', outcome: 'processed', summary: 'Blueprint/permit drawing printing order', confidence: 'high', notes: 'Printing vendor' };
  }
  
  if ((t.includes('hebrew') || /[\u0590-\u05FF]/.test(transcript)) && duration > 60) {
    return { category: 'operations', subCategory: 'internal_hebrew', intent: 'internal discussion', outcome: 'discussed', summary: 'Internal call in Hebrew - discussing operations', confidence: 'high', notes: 'Internal - Hebrew language' };
  }
  
  if (t.includes('shy') || t.includes('shay') || t.includes('itay')) {
    if (t.includes('production board') || t.includes('schedule') || t.includes('job') || t.includes('estimate')) {
      return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal coordination', outcome: 'discussed', summary: 'Internal team coordination call', confidence: 'high', notes: 'Internal operations' };
    }
  }
  
  if (t.includes('bookkeeping') || t.includes('quickbooks') || t.includes('invoice') || t.includes('subcontractor pay')) {
    return { category: 'operations', subCategory: 'internal_accounting', intent: 'accounting/bookkeeping', outcome: 'processing', summary: 'Internal bookkeeping/accounting discussion', confidence: 'high', notes: 'Internal accounting' };
  }
  
  if (t.includes('ringcentral')) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'phone service discussion', outcome: 'discussed', summary: 'RingCentral account/service call', confidence: 'high', notes: 'Phone service vendor' };
  }
  
  if (t.includes('permit') && (t.includes('city') || t.includes('county') || t.includes('inspection'))) {
    return { category: 'operations', subCategory: 'permit_inspection', intent: 'permit/inspection followup', outcome: 'discussed', summary: 'Permit or inspection related call', confidence: 'high', notes: 'Permit related' };
  }
  
  if (t.includes('fire district') || t.includes('fire department')) {
    return { category: 'operations', subCategory: 'permit_inspection', intent: 'fire inspection followup', outcome: 'discussed', summary: 'Fire district inspection/permit call', confidence: 'high', notes: 'Fire district' };
  }
  
  if (t.includes('disclosures') || t.includes('real estate') || t.includes('escrow')) {
    return { category: 'operations', subCategory: 'real_estate_paperwork', intent: 'documentation followup', outcome: 'discussed', summary: 'Real estate disclosure/documentation call', confidence: 'high', notes: 'Real estate paperwork' };
  }
  
  // CUSTOMER INQUIRIES
  if (t.includes('adu') || t.includes('accessory dwelling') || t.includes('granny unit') || t.includes('in-law')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'ADU construction inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about ADU construction`, confidence: 'high', notes: 'ADU lead' };
  }
  
  if (t.includes('garage conversion') || t.includes('convert my garage') || t.includes('garage to')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'garage conversion inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about garage conversion`, confidence: 'high', notes: 'Garage conversion lead' };
  }
  
  if (t.includes('foundation') && (t.includes('repair') || t.includes('crack') || t.includes('settle') || t.includes('problem'))) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'foundation_inquiry', intent: 'foundation repair inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about foundation repair`, confidence: 'high', notes: 'Foundation lead' };
  }
  
  if (t.includes('concrete') && (t.includes('driveway') || t.includes('patio') || t.includes('sidewalk') || t.includes('slab') || t.includes('pour'))) {
    const locationInfo = city ? ` in ${city}` : '';
    let details = '';
    if (t.includes('driveway')) details = 'driveway';
    else if (t.includes('patio')) details = 'patio';
    else if (t.includes('sidewalk')) details = 'sidewalk';
    else if (t.includes('slab')) details = 'slab';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: `concrete ${details} inquiry`, outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about concrete ${details} work`, confidence: 'high', notes: 'Concrete lead' };
  }
  
  if (t.includes('drainage') || t.includes('french drain') || t.includes('water') && t.includes('yard')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'drainage_inquiry', intent: 'drainage system inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about drainage/French drain`, confidence: 'high', notes: 'Drainage lead' };
  }
  
  if (t.includes('retaining wall')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'retaining_wall', intent: 'retaining wall inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about retaining wall`, confidence: 'high', notes: 'Retaining wall lead' };
  }
  
  if (t.includes('bathroom') && (t.includes('remodel') || t.includes('renovation') || t.includes('update'))) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'bathroom_remodel', intent: 'bathroom remodel inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about bathroom remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  if (t.includes('kitchen') && (t.includes('remodel') || t.includes('renovation') || t.includes('update'))) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'kitchen_remodel', intent: 'kitchen remodel inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about kitchen remodel`, confidence: 'high', notes: 'Remodel lead' };
  }
  
  if (t.includes('balcony') && (t.includes('inspection') || t.includes('repair') || t.includes('waterproof'))) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'inspection_inquiry', intent: 'balcony inspection/repair', outcome: 'discussed', summary: `Customer${locationInfo} inquiring about balcony inspection/repair`, confidence: 'high', notes: 'Balcony inspection lead' };
  }
  
  if (t.includes('fire damage') || t.includes('fire repair')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'fire_damage', intent: 'fire damage repair', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about fire damage repair`, confidence: 'high', notes: 'Fire damage lead' };
  }
  
  if (t.includes('window') || t.includes('door') || t.includes('siding')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'exterior_inquiry', intent: 'exterior work inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about window/door/siding work`, confidence: 'high', notes: 'Exterior work lead' };
  }
  
  if (t.includes('roof') && (t.includes('leak') || t.includes('repair') || t.includes('replace'))) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'roof_inquiry', intent: 'roofing inquiry', outcome: 'discussed project', summary: `Customer${locationInfo} inquiring about roofing work`, confidence: 'high', notes: 'Roofing lead' };
  }
  
  if (t.includes('houzz')) {
    const locationInfo = city ? ` from ${city}` : '';
    return { category: 'customer', subCategory: 'houzz_lead', intent: 'respond to Houzz inquiry', outcome: 'scheduling', summary: `Houzz lead${locationInfo} - scheduling consultation`, confidence: 'high', notes: 'Houzz lead' };
  }
  
  if (t.includes('voicemail') || t.includes('leave a message') || t.includes('please call me back')) {
    const locationInfo = city ? ` from ${city}` : '';
    return { category: 'customer', subCategory: 'voicemail_inquiry', intent: 'left voicemail for callback', outcome: 'awaiting callback', summary: `Customer${locationInfo} left voicemail requesting callback`, confidence: 'medium', notes: 'Voicemail - needs callback' };
  }
  
  if (t.includes('quote') || t.includes('estimate') || t.includes('bid') || t.includes('how much')) {
    const locationInfo = city ? ` from ${city}` : '';
    return { category: 'customer', subCategory: 'estimate_request', intent: 'requesting estimate', outcome: 'discussed', summary: `Customer${locationInfo} requesting quote/estimate`, confidence: 'medium', notes: 'Estimate request' };
  }
  
  if (t.includes('appointment') || t.includes('schedule') || t.includes('come out') || t.includes('site visit')) {
    const locationInfo = city ? ` in ${city}` : '';
    return { category: 'customer', subCategory: 'scheduling', intent: 'schedule appointment', outcome: 'scheduling', summary: `Customer${locationInfo} scheduling site visit`, confidence: 'high', notes: 'Scheduling' };
  }
  
  if (t.includes('following up') || t.includes('follow up') || t.includes('checking in') || t.includes('called before')) {
    const locationInfo = city ? ` from ${city}` : '';
    return { category: 'customer', subCategory: 'followup', intent: 'following up on inquiry', outcome: 'discussed', summary: `Customer${locationInfo} following up on previous inquiry`, confidence: 'high', notes: 'Customer followup' };
  }
  
  // OUT OF AREA
  if (t.includes('out of') && (t.includes('area') || t.includes('service'))) {
    return { category: 'other_inquiry', subCategory: 'out_of_area', intent: 'inquiry from outside service area', outcome: 'declined - out of area', summary: 'Customer outside service area - declined', confidence: 'high', notes: 'Out of service area' };
  }
  
  // OTHER INQUIRIES
  if (t.includes('sign') && (t.includes('property') || t.includes('why') || t.includes('abandoned'))) {
    return { category: 'other_inquiry', subCategory: 'sign_inquiry', intent: 'asking about Rhino sign', outcome: 'explained', summary: 'Person asking about Rhino sign on property', confidence: 'high', notes: 'Sign inquiry - not a customer' };
  }
  
  if (t.includes('countertop') || t.includes('fabricator') || t.includes('subcontractor')) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'offering services', outcome: 'took info', summary: 'Vendor/subcontractor offering services', confidence: 'high', notes: 'Vendor seeking work' };
  }
  
  if (t.includes('engineering') || t.includes('inspection service')) {
    return { category: 'spam', subCategory: 'b2b_engineering', intent: 'sell engineering services', outcome: 'took info', summary: 'Engineering/inspection services sales call', confidence: 'high', notes: 'B2B prospecting' };
  }
  
  // DEFAULT - needs manual review
  if (duration < 20) {
    return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'too brief', summary: `Brief ${duration}s call - insufficient content`, confidence: 'low', notes: 'Too short to classify' };
  }
  
  // Look for any location/project hints
  const locationInfo = city ? ` from ${city}` : '';
  if (duration > 120) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'project discussion', outcome: 'discussed', summary: `Extended call${locationInfo} (${duration}s) - potential customer inquiry`, confidence: 'medium', notes: 'Long call - likely customer, needs detailed review' };
  }
  
  return { category: 'incomplete', subCategory: 'unclassified', intent: 'unknown', outcome: 'needs review', summary: `Call${locationInfo} requires manual transcript review`, confidence: 'low', notes: 'Needs manual review' };
}

// Process all calls
const currentCSV = fs.readFileSync('q4-manual-review.csv', 'utf-8');
const lines = currentCSV.trim().split('\n');
const header = 'id,direction,duration,category,sub_category,caller_intent,outcome,summary,confidence,notes';

const outputLines = [header];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^([^,]+),([^,]+),(\d+)/);
  if (!match) continue;
  
  const callId = match[1];
  const direction = match[2];
  const duration = parseInt(match[3]);
  
  const call = callLookup[callId];
  const transcript = transcriptLookup[callId] || (call?.assemblyai_text) || '';
  
  const analysis = analyzeCall(callId, call, transcript);
  
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
fs.writeFileSync('q4-manual-review-detailed.csv', outputLines.join('\n'));
console.log(`Processed ${outputLines.length - 1} calls`);
console.log('Output written to q4-manual-review-detailed.csv');
