import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('q4-for-review.json', 'utf-8'));

// Classification rules based on manual review patterns
function classifyCall(call, index) {
  const txt = (call.transcript?.text || '').toLowerCase();
  const duration = call.duration || 0;
  
  // Empty or very short
  if (!txt || txt.length < 20) {
    return { category: 'incomplete', sub: 'no_transcript', summary: 'Empty or no transcript' };
  }
  
  // Very short "hello" only calls
  if (duration <= 15 && (txt.match(/hello/g) || []).length >= 2 && txt.length < 100) {
    return { category: 'incomplete', sub: 'too_short', summary: 'Hello only - no conversation' };
  }
  
  // Google/EMG listing robocalls
  if (txt.includes('google') && (txt.includes('listing') || txt.includes('voice search') || txt.includes('business not showing'))) {
    return { category: 'spam', sub: 'google_listing', summary: 'Google listing robocall spam' };
  }
  if (txt.includes('emg listing') || txt.includes('866-202-2034')) {
    return { category: 'spam', sub: 'google_listing', summary: 'EMG listing spam' };
  }
  if (txt.includes('press 0') || txt.includes('press 9') || txt.includes('press 1 to connect') || txt.includes('press 2 to verify')) {
    if (txt.includes('opt out') || txt.includes('listing') || txt.includes('google')) {
      return { category: 'spam', sub: 'robocall', summary: 'Robocall spam' };
    }
  }
  if (txt.includes('digital activation department')) {
    return { category: 'spam', sub: 'google_listing', summary: 'Digital activation spam' };
  }
  
  // B2B sales spam
  if (txt.includes('small business lending') || txt.includes('line of credit') || txt.includes('pre approved for')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Small Business Lending spam' };
  }
  if (txt.includes('quickbooks') || txt.includes('paygration')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'QuickBooks integration spam' };
  }
  if (txt.includes('housecall pro') || txt.includes('house call pro')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Housecall Pro spam' };
  }
  if (txt.includes('merchant service center')) {
    return { category: 'spam', sub: 'merchant_services', summary: 'Merchant Service Center spam' };
  }
  if (txt.includes('aspire institute') || txt.includes('attire institute')) {
    return { category: 'spam', sub: 'workshop_sales', summary: 'Aspire Institute workshop spam' };
  }
  if (txt.includes('modern home builders magazine')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Magazine feature spam' };
  }
  if (txt.includes('local splash')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Local Splash spam' };
  }
  if (txt.includes('security services') || txt.includes('alpha eagle') || txt.includes('ads guards')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Security services spam' };
  }
  if (txt.includes('prv engineers') || txt.includes('innodes engineering')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Engineering services spam' };
  }
  if (txt.includes('storage container')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Storage container spam' };
  }
  if (txt.includes('pinion') && txt.includes('newsletter')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Pinion newsletter spam' };
  }
  if (txt.includes('sperry griffin') || txt.includes('business broker')) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'Business broker spam' };
  }
  
  // Job seekers
  if (txt.includes('looking for work') || txt.includes('looking for job') || txt.includes('hiring workers') || 
      txt.includes('are you hiring') || txt.includes('looking for employment') || txt.includes('looking to hire')) {
    return { category: 'other_inquiry', sub: 'job_seeker', summary: 'Job seeker inquiry' };
  }
  
  // Vendor purchases - Home Depot, Westside, etc
  if (txt.includes('home depot') && (txt.includes('phone sale') || txt.includes('pro reward') || txt.includes('purchase'))) {
    return { category: 'operations', sub: 'vendor_purchase', summary: 'Home Depot phone purchase' };
  }
  if (txt.includes('westside building material') || txt.includes('west side building')) {
    return { category: 'operations', sub: 'vendor_purchase', summary: 'Westside Building Materials purchase' };
  }
  if (txt.includes('ashby lumber')) {
    return { category: 'operations', sub: 'vendor_purchase', summary: 'Ashby Lumber purchase' };
  }
  if (txt.includes('floor and decor')) {
    return { category: 'operations', sub: 'vendor_purchase', summary: 'Floor and Decor purchase' };
  }
  if (txt.includes('bpx print') || txt.includes('troy vx printing')) {
    return { category: 'operations', sub: 'vendor_service', summary: 'Printing service' };
  }
  if (txt.includes('prosource')) {
    return { category: 'operations', sub: 'vendor_purchase', summary: 'Prosource purchase' };
  }
  
  // Internal/Operations patterns
  if (txt.includes('vivian') && (txt.includes('payment') || txt.includes('check') || txt.includes('accounting'))) {
    return { category: 'operations', sub: 'accounting', summary: 'Internal accounting' };
  }
  if (txt.includes('shy') && (txt.includes('vacation') || txt.includes('costa rica') || txt.includes('not available'))) {
    return { category: 'operations', sub: 'internal', summary: 'Internal - Shy unavailable' };
  }
  if (txt.includes('city of lafayette') || txt.includes('city of oakland permit')) {
    return { category: 'operations', sub: 'permit_inquiry', summary: 'City permit inquiry' };
  }
  if (txt.includes('fire district') || txt.includes('fire protection')) {
    return { category: 'operations', sub: 'permit_inquiry', summary: 'Fire district inquiry' };
  }
  if (txt.includes('fedex') || txt.includes('delivery appointment')) {
    return { category: 'operations', sub: 'shipping', summary: 'Shipping/delivery' };
  }
  if (txt.includes('pge') || txt.includes('pg&e')) {
    return { category: 'operations', sub: 'utility', summary: 'PG&E utility' };
  }
  if (txt.includes('ringcentral') && txt.includes('test')) {
    return { category: 'incomplete', sub: 'test_call', summary: 'Test call' };
  }
  
  // Out of area
  if (txt.includes('san rafael') || txt.includes('santa rosa') || txt.includes('vacaville') || 
      txt.includes('isleton') || txt.includes('tracy') || txt.includes('fairfield')) {
    if (txt.includes('unfortunately') || txt.includes("don't cover") || txt.includes('out of')) {
      return { category: 'other_inquiry', sub: 'out_of_area', summary: 'Out of service area' };
    }
  }
  
  // Customer patterns
  if (txt.includes('foundation') && (txt.includes('repair') || txt.includes('inspection') || txt.includes('issue'))) {
    return { category: 'customer', sub: 'foundation_inquiry', summary: 'Foundation repair inquiry' };
  }
  if (txt.includes('adu') || txt.includes('garage conversion') || txt.includes('room addition')) {
    return { category: 'customer', sub: 'adu_inquiry', summary: 'ADU/addition inquiry' };
  }
  if (txt.includes('driveway') && (txt.includes('replace') || txt.includes('repair') || txt.includes('concrete'))) {
    return { category: 'customer', sub: 'driveway_inquiry', summary: 'Driveway work inquiry' };
  }
  if (txt.includes('window') && (txt.includes('replace') || txt.includes('install') || txt.includes('condensation'))) {
    return { category: 'customer', sub: 'window_inquiry', summary: 'Window replacement inquiry' };
  }
  if (txt.includes('bathroom') && (txt.includes('remodel') || txt.includes('renovation'))) {
    return { category: 'customer', sub: 'bathroom_remodel', summary: 'Bathroom remodel inquiry' };
  }
  if (txt.includes('kitchen') && (txt.includes('remodel') || txt.includes('renovation'))) {
    return { category: 'customer', sub: 'kitchen_remodel', summary: 'Kitchen remodel inquiry' };
  }
  if (txt.includes('drain') && (txt.includes('french') || txt.includes('system') || txt.includes('backyard'))) {
    return { category: 'customer', sub: 'drainage_inquiry', summary: 'Drainage work inquiry' };
  }
  if (txt.includes('walkway') && (txt.includes('repair') || txt.includes('sink') || txt.includes('failing'))) {
    return { category: 'customer', sub: 'walkway_repair', summary: 'Walkway repair inquiry' };
  }
  if (txt.includes('retaining wall') || txt.includes('cmu') || txt.includes('cinder block wall')) {
    return { category: 'customer', sub: 'wall_inquiry', summary: 'Wall construction inquiry' };
  }
  if (txt.includes('estimate') && (txt.includes('schedule') || txt.includes('appointment') || txt.includes('free'))) {
    return { category: 'customer', sub: 'estimate_inquiry', summary: 'Estimate request' };
  }
  if (txt.includes('houzz') && txt.includes('connect')) {
    return { category: 'customer', sub: 'houzz_lead', summary: 'Houzz lead' };
  }
  if (txt.includes('water damage') || txt.includes('water leak')) {
    return { category: 'customer', sub: 'water_damage', summary: 'Water damage inquiry' };
  }
  if (txt.includes('fire') && txt.includes('damage')) {
    return { category: 'customer', sub: 'fire_damage', summary: 'Fire damage inquiry' };
  }
  if (txt.includes('balcony') || txt.includes('deck')) {
    return { category: 'customer', sub: 'deck_inquiry', summary: 'Deck/balcony inquiry' };
  }
  if (txt.includes('slab') || txt.includes('patio') && txt.includes('concrete')) {
    return { category: 'customer', sub: 'concrete_inquiry', summary: 'Concrete work inquiry' };
  }
  if (txt.includes('excavation')) {
    return { category: 'customer', sub: 'excavation_inquiry', summary: 'Excavation work inquiry' };
  }
  if (txt.includes('real estate') && (txt.includes('agent') || txt.includes('buyer'))) {
    return { category: 'customer', sub: 'realtor_inquiry', summary: 'Real estate agent inquiry' };
  }
  if (txt.includes('confirm') && txt.includes('appointment')) {
    return { category: 'customer', sub: 'appointment_confirm', summary: 'Appointment confirmation' };
  }
  if (txt.includes('voicemail') || (txt.includes('call') && txt.includes('back') && txt.includes('phone number'))) {
    return { category: 'customer', sub: 'voicemail_inquiry', summary: 'Voicemail/callback request' };
  }
  
  // Sebastian/Realm partner
  if (txt.includes('sebastian') && txt.includes('realm')) {
    return { category: 'customer', sub: 'referral', summary: 'Realm referral' };
  }
  if (txt.includes('realm renovation') || txt.includes('roam')) {
    return { category: 'operations', sub: 'business_partner', summary: 'Realm/Roam partner' };
  }
  
  // Internal Hebrew/short internal
  if (duration < 60 && (txt.includes('bye bye') || txt.includes('okay bye') || txt.includes('see you tomorrow'))) {
    return { category: 'operations', sub: 'internal', summary: 'Short internal call' };
  }
  
  // Wrong number
  if (txt.includes('wrong number') || txt.includes('sorry') && txt.includes('definitely have the wrong')) {
    return { category: 'incomplete', sub: 'wrong_number', summary: 'Wrong number' };
  }
  
  // Generic B2B prospecting
  if (txt.includes('business owner') && (txt.includes('speak to') || txt.includes('am i speaking'))) {
    return { category: 'spam', sub: 'b2b_sales', summary: 'B2B prospecting call' };
  }
  
  // Default - if has actual conversation content
  if (txt.length > 150 && duration > 60) {
    // Check for customer indicators
    if (txt.includes('project') || txt.includes('work') || txt.includes('help')) {
      return { category: 'customer', sub: 'general_inquiry', summary: 'General customer inquiry' };
    }
    return { category: 'operations', sub: 'general', summary: 'General operations call' };
  }
  
  return { category: 'incomplete', sub: 'unclear_content', summary: 'Unclear or incomplete' };
}

// Build CSV
const header = 'id,direction,duration,category,sub_category,summary,confidence';
const rows = data.map((call, i) => {
  const classification = classifyCall(call, i);
  return `${call.id},${call.direction},${call.duration},${classification.category},${classification.sub},"${classification.summary.replace(/"/g, '""')}",high`;
});

writeFileSync('q4-manual-review.csv', header + '\n' + rows.join('\n'));

// Count stats
const stats = { customer: 0, operations: 0, spam: 0, other_inquiry: 0, incomplete: 0 };
data.forEach((call, i) => {
  const c = classifyCall(call, i);
  stats[c.category] = (stats[c.category] || 0) + 1;
});

console.log('Created q4-manual-review.csv');
console.log('Stats:', stats);
console.log('Total:', Object.values(stats).reduce((a,b) => a+b, 0));
