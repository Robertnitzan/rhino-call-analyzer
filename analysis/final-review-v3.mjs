import fs from 'fs';

// Load all data
const callsData = JSON.parse(fs.readFileSync('../data/q4-calls-merged.json', 'utf-8'));
const transcriptsData = JSON.parse(fs.readFileSync('../data/q4-transcripts.json', 'utf-8'));

// Build lookups
const transcriptLookup = {};
for (const t of transcriptsData) { transcriptLookup[t.call_id] = t.text || ''; }
const callLookup = {};
for (const c of callsData) { callLookup[c.id] = c; }

function escapeCSV(str) {
  if (!str) return '';
  str = String(str).replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str}"`;
  return str;
}

function extractName(transcript) {
  const patterns = [
    /(?:my name is|this is|i'm|name's)\s+([A-Z][a-z]+)/i,
    /(?:hi,?\s+)?this is\s+([A-Z][a-z]+)(?:\s+(?:calling|from|with|and|i))/i,
  ];
  for (const p of patterns) {
    const m = transcript.match(p);
    if (m && m[1] && !['This', 'Hello', 'Good', 'Roli', 'Roly', 'Wally', 'Yes', 'Yeah', 'Hi'].includes(m[1])) return m[1];
  }
  return '';
}

function isMinimalContent(transcript) {
  if (!transcript || transcript.length < 50) return true;
  const t = transcript.toLowerCase().replace(/[.,!?]/g, '').trim();
  const words = t.split(/\s+/).filter(w => w.length > 0);
  const briefWords = ['hello', 'good', 'morning', 'afternoon', 'hi', 'hey', 'okay', 'bye', 'yes', 'no', 'alright', 'all', 'right', 'thanks', 'thank', 'you', 'too', 'take', 'care', 'nice', 'day', 'later', 'have', 'a', 'great', 'weekend', 'wow', 'uptick', 'cannot', 'put', 'my', 'call', 'before', 'saying', 'rolly', 'making', 'refresh', 'roli', 'ready', 'pay', 'hold', 'on'];
  return words.length < 20 && words.every(w => briefWords.includes(w));
}

function analyzeCall(callId, call, transcript) {
  const duration = call?.duration || 0;
  const city = call?.customer_city || '';
  const answered = call?.answered;
  
  if (!transcript || transcript.length < 15) {
    if (duration < 15) return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'no content', summary: `${duration}s call - too short`, confidence: 'high', notes: 'Minimal' };
    if (!answered) return { category: 'incomplete', subCategory: 'missed_call', intent: 'unknown', outcome: 'missed', summary: `Missed call from ${city || 'unknown'}`, confidence: 'high', notes: 'No recording' };
    return { category: 'incomplete', subCategory: 'no_transcript', intent: 'unknown', outcome: 'unknown', summary: `${duration}s call - no transcript`, confidence: 'low', notes: 'Review recording' };
  }
  
  if (isMinimalContent(transcript)) {
    return { category: 'incomplete', subCategory: 'brief_exchange', intent: 'unknown', outcome: 'minimal', summary: 'Brief exchange - no substance', confidence: 'high', notes: 'Just greetings' };
  }
  
  const t = transcript.toLowerCase();
  const name = extractName(transcript);
  const cityStr = city ? ` in ${city}` : '';
  const nameStr = name || 'Customer';
  
  // === SPAM ===
  
  // Robocalls / EMG listings
  if (t.includes('press 1') || t.includes('press one') || t.includes('press 2') || t.includes('press 4') || t.includes('press 9') || t.includes('to opt out') || t.includes('opt out') || t.includes('suspension') || t.includes('suspended') || t.includes('emg listings') || t.includes('866-202-2034') || t.includes('press zero') || t.includes('press 0')) {
    return { category: 'spam', subCategory: 'robocall', intent: 'automated', outcome: 'ignored', summary: 'Robocall spam', confidence: 'high', notes: 'Automated' };
  }
  
  // Small Business Lending specific numbers
  if (t.includes('888-567-1880') || t.includes('confirm the details and go over your options')) {
    return { category: 'spam', subCategory: 'b2b_lending', intent: 'sell loans', outcome: 'ignored', summary: 'Small Business Lending voicemail', confidence: 'high', notes: 'Repeat caller' };
  }
  
  // Google spam
  if (t.includes('google') && (t.includes('listing') || t.includes('voice search') || t.includes('my business') || t.includes('profile') || t.includes('showing') || t.includes('maps') || t.includes('verified') || t.includes('visible') || t.includes('problems'))) {
    return { category: 'spam', subCategory: 'google_listing', intent: 'sell SEO', outcome: 'ignored', summary: 'Google listing scam', confidence: 'high', notes: 'Google spam' };
  }
  if (t.includes('google funding')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell financing', outcome: 'declined', summary: 'Google Funding cold call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // QuickBooks
  if (t.includes('quickbooks') || t.includes('figuration')) {
    if (t.includes('solutions provider') || t.includes('third party')) {
      return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell software', outcome: 'declined', summary: 'QuickBooks solutions provider call', confidence: 'high', notes: 'B2B spam' };
    }
    if (t.includes('subscription') || t.includes('charge') || t.includes('renew')) {
      return { category: 'spam', subCategory: 'quickbooks_scam', intent: 'phishing', outcome: 'scam', summary: 'QuickBooks scam', confidence: 'high', notes: 'Scam' };
    }
  }
  
  // Lending
  if (t.includes('small business lending') || t.includes('line of credit') || t.includes('pre approved') || t.includes('pre-approved')) {
    return { category: 'spam', subCategory: 'b2b_lending', intent: 'sell loans', outcome: 'ignored', summary: 'Small Business Lending', confidence: 'high', notes: 'Repeat' };
  }
  
  // Security services
  if (t.includes('alpha eagle security') || t.includes('american global security') || t.includes('security services') || t.includes('patrol coverage') || t.includes('camera monitoring')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell security', outcome: 'declined', summary: 'Security services sales', confidence: 'high', notes: 'Security spam' };
  }
  
  // Rank Orbit / SEO
  if (t.includes('rank orbit') || (t.includes('feedback call') && t.includes('profile'))) {
    return { category: 'spam', subCategory: 'seo_sales', intent: 'SEO pitch', outcome: 'declined', summary: 'Rank Orbit SEO', confidence: 'high', notes: 'SEO spam' };
  }
  
  // Modern Home Builders / media
  if (t.includes('modern home builders') || (t.includes('feature') && t.includes('edition')) || t.includes('pre interview')) {
    return { category: 'spam', subCategory: 'media_pitch', intent: 'media', outcome: 'screening', summary: 'Magazine feature pitch', confidence: 'high', notes: 'Paid media' };
  }
  
  // Workers compensation
  if (t.includes('workers compensation') || t.includes('republics')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell insurance', outcome: 'declined', summary: 'Workers comp sales', confidence: 'high', notes: 'Insurance spam' };
  }
  
  // T-shirts/promotional items
  if (t.includes('customized t shirts') || t.includes('customized t-shirts') || (t.includes('t shirts') && t.includes('hat'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell promo items', outcome: 'declined', summary: 'Promotional items sales', confidence: 'high', notes: 'Promo spam' };
  }
  
  // Business proposal / home renovation pitch
  if (t.includes('business proposal') && t.includes('home renovation')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B pitch', outcome: 'declined', summary: 'B2B business proposal pitch', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Generic construction services pitch
  if (t.includes('construction services') && t.includes('relevant to your services')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B pitch', outcome: 'declined', summary: 'Construction services pitch', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Storage containers
  if (t.includes('storage container') || t.includes('ally storage')) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'sell containers', outcome: 'voicemail', summary: 'Storage container rental pitch', confidence: 'high', notes: 'Vendor outreach' };
  }
  
  // Staffing
  if (t.includes('staffing') || t.includes('hiring needs') || t.includes('candidates') || (t.includes('spencer') && t.includes('trainer'))) {
    return { category: 'spam', subCategory: 'staffing_sales', intent: 'sell staffing', outcome: 'voicemail', summary: 'Staffing company call', confidence: 'high', notes: 'Recruiting spam' };
  }
  
  // Telehealth
  if (t.includes('restaurant service') || t.includes('healthcall pro') || t.includes('house cold pro')) {
    return { category: 'spam', subCategory: 'telemarketing', intent: 'telemarketing', outcome: 'declined', summary: 'Telemarketing', confidence: 'high', notes: 'B2C spam' };
  }
  
  // Newsletter
  if (t.includes('newsletter') || t.includes('pinion')) {
    return { category: 'spam', subCategory: 'newsletter_sales', intent: 'sell newsletter', outcome: 'declined', summary: 'Newsletter sales', confidence: 'high', notes: 'Newsletter spam' };
  }
  
  // Business owner cold calls
  if ((t.includes('business owner') || t.includes('speak with the owner') || t.includes('speak to the owner')) && t.length < 350 && !t.includes('scheduled')) {
    return { category: 'spam', subCategory: 'cold_call', intent: 'B2B solicitation', outcome: 'screened', summary: 'Cold call for business owner', confidence: 'high', notes: 'Screened' };
  }
  
  // Small business pitch
  if (t.includes('i own a small business') || (t.includes('small business') && t.includes('specialize'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B pitch', outcome: 'declined', summary: 'Small business cold call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Yelp
  if (t.includes('yelp')) {
    return { category: 'spam', subCategory: 'yelp_sales', intent: 'sell ads', outcome: 'declined', summary: 'Yelp sales', confidence: 'high', notes: 'Yelp spam' };
  }
  
  // Merchant services
  if (t.includes('merchant service') || t.includes('credit card processing') || t.includes('payment processing')) {
    return { category: 'spam', subCategory: 'merchant_services', intent: 'sell payment', outcome: 'declined', summary: 'Merchant services', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Office supplies
  if ((t.includes('ink') && t.includes('toner')) || t.includes('office supplies')) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell supplies', outcome: 'declined', summary: 'Office supplies', confidence: 'high', notes: 'B2B spam' };
  }
  
  // Workshops
  if (t.includes('workshop') || t.includes('seminar') || t.includes('aspire')) {
    return { category: 'spam', subCategory: 'workshop_sales', intent: 'sell training', outcome: 'declined', summary: 'Workshop sales', confidence: 'high', notes: 'Training spam' };
  }
  
  // Estimation
  if (t.includes('estimat') && (t.includes('outsourc') || t.includes('service'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'sell estimation', outcome: 'declined', summary: 'Estimation outsourcing', confidence: 'high', notes: 'B2B' };
  }
  
  // Claim Notify
  if (t.includes('claim notify') || t.includes('asset recovery')) {
    return { category: 'spam', subCategory: 'cold_call', intent: 'asset recovery', outcome: 'declined', summary: 'Claim Notify', confidence: 'high', notes: 'Scam likely' };
  }
  
  // United Eagle
  if (t.includes('united eagle') || (t.includes('accounts receivable') && t.includes('calling from'))) {
    return { category: 'spam', subCategory: 'b2b_sales', intent: 'B2B', outcome: 'declined', summary: 'Accounts receivable call', confidence: 'high', notes: 'B2B spam' };
  }
  
  // === VENDOR/OTHER ===
  
  // Engineering services (Innodes, structural)
  if (t.includes('innodes engineering') || (t.includes('structural') && t.includes('quote') && t.includes('last year'))) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'offering engineering', outcome: 'took info', summary: 'Innodes Engineering seeking structural work', confidence: 'high', notes: 'Vendor followup' };
  }
  
  // Property damage company
  if (t.includes('property damage company') || t.includes('pureclean')) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'offering services', outcome: 'took info', summary: 'Property damage company', confidence: 'high', notes: 'Vendor' };
  }
  
  // Landscape supplier
  if (t.includes('heritage landscape') || t.includes('imperial sprinkler') || (t.includes('irrigation') && t.includes('distributor'))) {
    return { category: 'other_inquiry', subCategory: 'vendor_seeking_work', intent: 'sell supplies', outcome: 'took info', summary: 'Landscape supply distributor', confidence: 'high', notes: 'Supplier' };
  }
  
  // Student research
  if (t.includes('student') && t.includes('research')) {
    return { category: 'other_inquiry', subCategory: 'research_request', intent: 'research', outcome: 'declined', summary: 'Student research call', confidence: 'high', notes: 'Declined' };
  }
  
  // Job seeker
  if (t.includes('hiring') || t.includes('apprentice') || t.includes('helper') || t.includes('position') && (t.includes('my number') || t.includes('call me'))) {
    return { category: 'other_inquiry', subCategory: 'job_seeker', intent: 'seeking employment', outcome: 'voicemail', summary: `${nameStr} seeking employment/apprentice position`, confidence: 'high', notes: 'Job inquiry' };
  }
  
  // === OPERATIONS ===
  
  // Credit card / 3% charge - payment processing
  if (t.includes('3% charge') || (t.includes('credit card') && t.includes('american express') && t.length < 150)) {
    return { category: 'operations', subCategory: 'internal_payment', intent: 'credit card processing', outcome: 'processed', summary: 'Credit card payment processing call', confidence: 'high', notes: 'Payment' };
  }
  
  // Charlie / Carmen material
  if ((t.includes('charlie') && t.includes('carmen')) || (t.includes('need a little material') && t.includes('carmen'))) {
    return { category: 'operations', subCategory: 'material_coordination', intent: 'material request', outcome: 'coordinating', summary: 'Internal - material request for Carmen job', confidence: 'high', notes: 'Materials' };
  }
  
  // Victor email/text
  if (t.includes('victor') && (t.includes('email') || t.includes('text message'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'communication preference', outcome: 'email sent', summary: 'Internal - Victor requesting email communication', confidence: 'high', notes: 'Internal' };
  }
  
  // Amazon
  if (t.includes('amazon') && (t.includes('delivery') || t.includes('logistics'))) {
    return { category: 'operations', subCategory: 'vendor_logistics', intent: 'delivery', outcome: 'automated', summary: 'Amazon delivery instructions', confidence: 'high', notes: 'Amazon' };
  }
  
  // PGE
  if (t.includes('pge') || t.includes('p g e') || t.includes('pacific gas')) {
    return { category: 'operations', subCategory: 'utility_coordination', intent: 'utility', outcome: 'resolved', summary: 'PGE utility call', confidence: 'high', notes: 'Utility' };
  }
  
  // Ledding / Dana / lighting
  if (t.includes('ledding') || (t.includes('dana') && (t.includes('order ready') || t.includes('troy lights')))) {
    return { category: 'operations', subCategory: 'vendor_order', intent: 'order confirmation', outcome: 'confirmed', summary: 'Ledding lighting order confirmation (Dana)', confidence: 'high', notes: 'Fixture order' };
  }
  
  // Home Depot
  if ((t.includes('home depot') || t.includes('depot')) && (t.includes('phone sale') || t.includes('dustin') || t.includes('diana') || t.includes('felix') || (t.includes('concord') && t.includes('card')))) {
    const amountMatch = transcript.match(/\$[\d,]+(?:\.\d{2})?/);
    const amount = amountMatch ? ` ${amountMatch[0]}` : '';
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: `Home Depot phone sale${amount}`, confidence: 'high', notes: 'Material purchase' };
  }
  
  // Lowe's
  if (t.includes('lowes') || t.includes("lowe's")) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'material purchase', outcome: 'processed', summary: "Lowe's purchase", confidence: 'high', notes: 'Materials' };
  }
  
  // Building materials
  if (t.includes('ashby lumber')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'lumber', outcome: 'processed', summary: 'Ashby Lumber purchase', confidence: 'high', notes: 'Lumber' };
  }
  if (t.includes('westside building')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'materials', outcome: 'processed', summary: 'Westside Building Materials', confidence: 'high', notes: 'Materials' };
  }
  if (t.includes('floor and decor') || t.includes('floor & decor')) {
    return { category: 'operations', subCategory: 'vendor_purchase', intent: 'flooring', outcome: 'processed', summary: 'Floor & Decor purchase', confidence: 'high', notes: 'Flooring' };
  }
  
  // Subcontractor payment
  if ((t.includes('dragon') || t.includes('subcontractor')) && (t.includes('check') || t.includes('payment'))) {
    return { category: 'operations', subCategory: 'subcontractor_payment', intent: 'check pickup', outcome: 'processing', summary: 'Subcontractor payment', confidence: 'high', notes: 'Sub payment' };
  }
  
  // Internal crew - shoring, Canyon View
  if ((t.includes('canyon view') || t.includes('shoring') || t.includes('orinda')) && (t.includes('schedule') || t.includes('saturday') || t.includes('pay') || t.includes('3800'))) {
    return { category: 'operations', subCategory: 'crew_coordination', intent: 'job confirmation', outcome: 'confirmed', summary: 'Internal crew - job scheduling', confidence: 'high', notes: 'Crew' };
  }
  
  // Bayardo payment
  if (t.includes('bayardo') || (t.includes('requested money') && t.includes('lido'))) {
    return { category: 'operations', subCategory: 'internal_payment', intent: 'payment request', outcome: 'processing', summary: 'Bayardo requesting payment', confidence: 'high', notes: 'Internal payment' };
  }
  
  // Fresh internal
  if (t.includes('fresh') && (t.includes('vivian') || t.includes('ms.') || t.includes('focusing'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal', outcome: 'brief', summary: 'Brief internal call (Fresh)', confidence: 'high', notes: 'Internal' };
  }
  
  // Efren / fireplace
  if (t.includes('efren') || (t.includes('fireplace') && t.includes('waiting'))) {
    return { category: 'operations', subCategory: 'crew_coordination', intent: 'crew on site', outcome: 'coordinating', summary: 'Crew call - Efren with fireplace guys', confidence: 'high', notes: 'Crew' };
  }
  
  // Address confirmation
  if (t.includes('greenfield drive') || (t.includes('fairfield') && t.includes('correct'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'address verify', outcome: 'confirmed', summary: 'Address verification', confidence: 'high', notes: 'Address confirm' };
  }
  
  // Plumber/Discovery Bay
  if ((t.includes('plumber') || t.includes('discovery bay')) && (t.includes('tomorrow') || t.includes('schedule'))) {
    return { category: 'operations', subCategory: 'crew_coordination', intent: 'scheduling', outcome: 'coordinating', summary: 'Discovery Bay job coordination', confidence: 'high', notes: 'Crew' };
  }
  
  // RingCentral
  if (t.includes('ringcentral')) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'phone service', outcome: 'discussed', summary: 'RingCentral service', confidence: 'high', notes: 'Phone vendor' };
  }
  
  // Shy/Shea on vacation
  if ((t.includes('shy') || t.includes('shea') || t.includes('shay') || t.includes('shai')) && (t.includes('vacation') || t.includes('back by') || t.includes('next week') || t.includes('22nd'))) {
    return { category: 'operations', subCategory: 'owner_unavailable', intent: 'reach owner', outcome: 'on vacation', summary: 'Caller asking for Shy (on vacation)', confidence: 'high', notes: 'Owner unavailable' };
  }
  
  // Clayton
  if (t.includes('clayton') && t.includes('no longer')) {
    return { category: 'operations', subCategory: 'personnel_inquiry', intent: 'reach Clayton', outcome: 'no longer employed', summary: 'Asking for Clayton - no longer with company', confidence: 'high', notes: 'Personnel' };
  }
  
  // Elon
  if (t.includes('elon') && (t.includes('shai') || t.includes('shy'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'reach owner', outcome: 'unavailable', summary: 'Elon calling for Shai', confidence: 'high', notes: 'Internal' };
  }
  
  // WhatsApp
  if (t.includes('whatsapp')) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'internal', outcome: 'resolved', summary: 'WhatsApp coordination', confidence: 'high', notes: 'Internal' };
  }
  
  // Bookkeeping
  if (t.includes('bookkeeping') || t.includes('accounting') || (t.includes('invoice') && t.includes('pay'))) {
    return { category: 'operations', subCategory: 'internal_accounting', intent: 'bookkeeping', outcome: 'processing', summary: 'Bookkeeping call', confidence: 'high', notes: 'Accounting' };
  }
  
  // Vivian payment
  if (t.includes('vivian') && (t.includes('send') || t.includes('sent') || t.includes('office'))) {
    return { category: 'operations', subCategory: 'internal_payment', intent: 'payment', outcome: 'processing', summary: 'Payment coordination with Vivian', confidence: 'high', notes: 'Payment' };
  }
  
  // Permits
  if ((t.includes('permit') || t.includes('inspection')) && (t.includes('city') || t.includes('county') || t.includes('fire'))) {
    return { category: 'operations', subCategory: 'permit_inspection', intent: 'permit', outcome: 'discussed', summary: 'Permit/inspection call', confidence: 'high', notes: 'Permit' };
  }
  
  // Blueprint
  if (t.includes('blueprint') || t.includes('bpx') || (t.includes('print') && t.includes('permit'))) {
    return { category: 'operations', subCategory: 'vendor_service', intent: 'printing', outcome: 'processed', summary: 'Blueprint printing', confidence: 'high', notes: 'Printing' };
  }
  
  // Brief internal check
  if ((t.includes("we're good") || t.includes('so we\'re good')) && t.length < 200) {
    return { category: 'operations', subCategory: 'internal_checkin', intent: 'status', outcome: 'confirmed', summary: 'Brief internal check-in', confidence: 'high', notes: 'Quick check' };
  }
  
  // Bill Harrison / type / tomorrow
  if (t.includes('bill harrison') || (t.includes('want you type') && t.includes('tomorrow'))) {
    return { category: 'operations', subCategory: 'internal_coordination', intent: 'scheduling', outcome: 'confirmed', summary: 'Brief internal scheduling', confidence: 'high', notes: 'Internal' };
  }
  
  // === WRONG NUMBER ===
  if (t.includes('wrong number') || t.includes('smp construction') || (t.includes('steve') && t.includes("don't have"))) {
    return { category: 'incomplete', subCategory: 'wrong_number', intent: 'wrong number', outcome: 'clarified', summary: 'Wrong number', confidence: 'high', notes: 'Wrong number' };
  }
  
  // Numbers only
  if (/^[\d\s\-\.]+$/.test(transcript.replace(/[.,thank you]/gi, '').trim())) {
    return { category: 'incomplete', subCategory: 'number_only', intent: 'unknown', outcome: 'no content', summary: 'Only numbers spoken', confidence: 'high', notes: 'Numbers only' };
  }
  
  // === CUSTOMER ===
  
  // Marianne Rollison - commercial bid - THIS IS A REAL LEAD!
  if (t.includes('marianne') || (t.includes('commercial building') && t.includes('wood') && t.includes('stucco'))) {
    return { category: 'customer', subCategory: 'commercial_inquiry', intent: 'bid request', outcome: 'voicemail', summary: 'Marianne Rollison - commercial building columns wood to stucco bid', confidence: 'high', notes: 'Commercial lead!' };
  }
  
  // Andrew - consultation followup
  if (t.includes('andrew') && t.includes('consultation') && t.includes('scheduled')) {
    return { category: 'customer', subCategory: 'scheduling', intent: 'confirm appointment', outcome: 'checking', summary: 'Andrew following up on scheduled consultation', confidence: 'high', notes: 'Scheduling followup' };
  }
  
  // Scheduling appointment
  if ((t.includes('appointment') && t.includes('scheduled') && t.includes('tomorrow')) || (t.includes('brendan') && t.includes('oakland hills'))) {
    return { category: 'customer', subCategory: 'scheduling', intent: 'confirm appointment', outcome: 'confirmed', summary: `${nameStr}${cityStr} confirming appointment`, confidence: 'high', notes: 'Confirmed' };
  }
  
  // Sebastian scheduling
  if (t.includes('sebastian') && (t.includes('friday') || t.includes('1:30'))) {
    return { category: 'customer', subCategory: 'scheduling', intent: 'schedule visit', outcome: 'scheduling', summary: 'Sebastian scheduling site visit', confidence: 'high', notes: 'Scheduling' };
  }
  
  // Houzz
  if (t.includes('houzz')) {
    return { category: 'customer', subCategory: 'houzz_lead', intent: 'Houzz', outcome: 'scheduling', summary: `${nameStr}${cityStr} from Houzz`, confidence: 'high', notes: 'Houzz lead!' };
  }
  
  // Honey Homes
  if (t.includes('honey homes')) {
    return { category: 'customer', subCategory: 'partner_referral', intent: 'inspection', outcome: 'discussed', summary: 'Honey Homes referral - water intrusion', confidence: 'high', notes: 'Property mgmt' };
  }
  
  // Grab bars
  if (t.includes('bars') && (t.includes('bathroom') || t.includes('shower') || t.includes('toilet'))) {
    return { category: 'customer', subCategory: 'accessibility_inquiry', intent: 'grab bars', outcome: 'voicemail', summary: `${nameStr}${cityStr} needs grab bars`, confidence: 'high', notes: 'Accessibility' };
  }
  
  // Concrete slab
  if (t.includes('slab') || (t.includes('concrete') && t.includes('backyard'))) {
    const sqftMatch = transcript.match(/(\d+)\s*(?:square foot|sq ft)/i);
    const sqft = sqftMatch ? ` ~${sqftMatch[1]} sqft` : '';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: 'concrete slab', outcome: 'voicemail', summary: `${nameStr}${cityStr} - backyard concrete${sqft}`, confidence: 'high', notes: 'Concrete' };
  }
  
  // Wine cellar
  if (t.includes('wine cellar') || t.includes('below grade') || t.includes('water enters')) {
    return { category: 'customer', subCategory: 'waterproofing_inquiry', intent: 'waterproofing', outcome: 'discussed', summary: `${nameStr}${cityStr} - water intrusion`, confidence: 'high', notes: 'Waterproofing' };
  }
  
  // ADU
  if (t.includes('adu') || t.includes('accessory dwelling') || t.includes('granny unit')) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'ADU', outcome: 'discussed', summary: `${nameStr}${cityStr} - ADU`, confidence: 'high', notes: 'ADU lead' };
  }
  
  // Garage conversion
  if (t.includes('garage conversion') || (t.includes('garage') && t.includes('convert'))) {
    return { category: 'customer', subCategory: 'adu_inquiry', intent: 'garage conversion', outcome: 'discussed', summary: `${nameStr}${cityStr} - garage conversion`, confidence: 'high', notes: 'Conversion' };
  }
  
  // Foundation
  if (t.includes('foundation') && (t.includes('repair') || t.includes('crack') || t.includes('problem') || t.includes('work'))) {
    if (t.includes("don't cover") || t.includes('vacaville')) {
      return { category: 'other_inquiry', subCategory: 'out_of_area', intent: 'foundation', outcome: 'declined', summary: `${nameStr}${cityStr} - outside service area`, confidence: 'high', notes: 'Out of area' };
    }
    return { category: 'customer', subCategory: 'foundation_inquiry', intent: 'foundation', outcome: 'discussed', summary: `${nameStr}${cityStr} - foundation`, confidence: 'high', notes: 'Foundation' };
  }
  
  // Concrete
  if (t.includes('concrete') || t.includes('cement')) {
    let type = 'work';
    if (t.includes('driveway')) type = 'driveway';
    else if (t.includes('patio')) type = 'patio';
    else if (t.includes('sidewalk')) type = 'sidewalk';
    else if (t.includes('pad')) type = 'pad';
    return { category: 'customer', subCategory: 'concrete_inquiry', intent: `concrete ${type}`, outcome: 'discussed', summary: `${nameStr}${cityStr} - concrete ${type}`, confidence: 'high', notes: 'Concrete' };
  }
  
  // Drainage
  if (t.includes('drainage') || t.includes('french drain') || (t.includes('water') && t.includes('yard'))) {
    return { category: 'customer', subCategory: 'drainage_inquiry', intent: 'drainage', outcome: 'discussed', summary: `${nameStr}${cityStr} - drainage`, confidence: 'high', notes: 'Drainage' };
  }
  
  // Retaining wall
  if (t.includes('retaining wall')) {
    return { category: 'customer', subCategory: 'retaining_wall', intent: 'retaining wall', outcome: 'discussed', summary: `${nameStr}${cityStr} - retaining wall`, confidence: 'high', notes: 'Retaining wall' };
  }
  
  // Bathroom remodel
  if (t.includes('bathroom') && (t.includes('remodel') || t.includes('renovation'))) {
    return { category: 'customer', subCategory: 'bathroom_remodel', intent: 'bathroom', outcome: 'discussed', summary: `${nameStr}${cityStr} - bathroom remodel`, confidence: 'high', notes: 'Remodel' };
  }
  
  // Kitchen remodel
  if (t.includes('kitchen') && (t.includes('remodel') || t.includes('renovation'))) {
    return { category: 'customer', subCategory: 'kitchen_remodel', intent: 'kitchen', outcome: 'discussed', summary: `${nameStr}${cityStr} - kitchen remodel`, confidence: 'high', notes: 'Remodel' };
  }
  
  // Roof
  if (t.includes('roof') && (t.includes('leak') || t.includes('repair') || t.includes('replace'))) {
    return { category: 'customer', subCategory: 'roof_inquiry', intent: 'roofing', outcome: 'discussed', summary: `${nameStr}${cityStr} - roofing`, confidence: 'high', notes: 'Roofing' };
  }
  
  // Windows/doors/siding
  if (t.includes('window') || t.includes('door') || t.includes('siding')) {
    const type = t.includes('window') ? 'windows' : t.includes('door') ? 'doors' : 'siding';
    return { category: 'customer', subCategory: 'exterior_inquiry', intent: type, outcome: 'discussed', summary: `${nameStr}${cityStr} - ${type}`, confidence: 'high', notes: 'Exterior' };
  }
  
  // Fire damage
  if (t.includes('fire') && (t.includes('damage') || t.includes('repair') || t.includes('rebuild'))) {
    return { category: 'customer', subCategory: 'fire_damage', intent: 'fire damage', outcome: 'discussed', summary: `${nameStr}${cityStr} - fire damage`, confidence: 'high', notes: 'Fire damage' };
  }
  
  // Balcony
  if (t.includes('balcony') && (t.includes('inspection') || t.includes('repair'))) {
    return { category: 'customer', subCategory: 'inspection_inquiry', intent: 'balcony', outcome: 'discussed', summary: `${nameStr}${cityStr} - balcony`, confidence: 'high', notes: 'Balcony' };
  }
  
  // Quote/estimate
  if ((t.includes('quote') || t.includes('estimate') || t.includes('bid')) && (t.includes('come out') || t.includes('schedule'))) {
    return { category: 'customer', subCategory: 'estimate_request', intent: 'estimate', outcome: 'scheduling', summary: `${nameStr}${cityStr} - scheduling estimate`, confidence: 'high', notes: 'Estimate' };
  }
  
  // Voicemail
  if (t.includes('voicemail') || t.includes('leave a message') || t.includes('call me back') || t.includes('give me a call')) {
    return { category: 'customer', subCategory: 'voicemail_inquiry', intent: 'voicemail', outcome: 'needs callback', summary: `${nameStr}${cityStr} left voicemail`, confidence: 'medium', notes: 'Callback' };
  }
  
  // Following up
  if (t.includes('calling back') || t.includes('following up') || t.includes('called earlier')) {
    return { category: 'customer', subCategory: 'followup', intent: 'followup', outcome: 'discussed', summary: `${nameStr}${cityStr} following up`, confidence: 'high', notes: 'Followup' };
  }
  
  // Generic rhino inquiry
  if ((t.includes('rhino builder') || t.includes('is this rhino')) && duration > 60) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'inquiry', outcome: 'discussed', summary: `${nameStr}${cityStr} - inquiry`, confidence: 'medium', notes: 'Review' };
  }
  
  // === FALLBACKS ===
  
  if (duration < 20) {
    return { category: 'incomplete', subCategory: 'too_short', intent: 'unknown', outcome: 'brief', summary: `${duration}s call`, confidence: 'low', notes: 'Short' };
  }
  
  if (duration > 180) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'discussion', outcome: 'discussed', summary: `Extended ${Math.floor(duration/60)}min call${cityStr}`, confidence: 'medium', notes: 'Long - likely customer' };
  }
  
  if (duration > 60 && city) {
    return { category: 'customer', subCategory: 'general_inquiry', intent: 'inquiry', outcome: 'discussed', summary: `${nameStr}${cityStr} - ${duration}s call`, confidence: 'medium', notes: 'Review' };
  }
  
  return { category: 'incomplete', subCategory: 'unclassified', intent: 'unknown', outcome: 'needs review', summary: `${duration}s call${cityStr}`, confidence: 'low', notes: 'Manual review' };
}

// Process
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

fs.writeFileSync('q4-manual-review.csv', outputLines.join('\n'));
console.log(`Processed ${outputLines.length - 1} calls`);
console.log('Categories:', stats);
