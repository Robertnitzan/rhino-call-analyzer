import fs from 'fs';
import path from 'path';

// Read the Q4 data
const q4Data = JSON.parse(fs.readFileSync('analysis/q4-for-review.json', 'utf8'));

// Category patterns for classification
const patterns = {
  spam: {
    robocall: /press (one|1|2|4|9)|to connect|opt out|authorized representative|homeowner inquiry/i,
    google_listing: /google (voice|listing|searches|business)|finding you|suspension|verification|pro directory/i,
    yelp_sales: /yelp|advertising package/i,
    b2b_sales: /estimation services|bidding|engineering services|mep services|b2b|lead gen|prospecting|quote opportunity|residential referrals|sell.*services/i,
    merchant_services: /merchant (service|account)|payment processing|ink and toner|printer supplies/i,
    workshop_sales: /aspire institute|workshop|seminar/i,
    review_services: /review (collection|services)|nice job/i,
    cold_call: /cold call|business proposal/i,
    m_and_a: /m&a|business broker|sperry griffin/i,
    survey: /survey|pge appliance/i
  },
  operations: {
    vendor_purchase: /home depot|lowes|ashby lumber|westside|phone sale|material purchase|credit card|pro reward|floor and decor/i,
    crew_coordination: /crew|job site|inspection|internal|foreman|worker/i,
    internal_hebrew: /hebrew|internal discussion/i,
    vendor_service: /blueprint|print(ing|s)|bpx|delivery|print job/i,
    accounting: /1099|tax forms|accounting|quickbooks/i,
    payment_issue: /payment issue|amex|american express not working/i,
    insurance: /insurance|state compensation/i,
    internal_pricing: /internal.*pricing|comparing quotes/i
  },
  customer: {
    estimate: /estimate|quote|consultation|scheduled|appointment/i,
    voicemail: /voicemail|left message|callback/i,
    inquiry: /concrete|foundation|drainage|siding|adu|bathroom|kitchen|remodel|repair|driveway|walkway|retaining wall/i,
    followup: /following up|followup|invoice|payment due/i,
    commercial: /prevailing wage|commercial|hotel|building/i
  },
  other_inquiry: {
    sign_inquiry: /sign on|property.*fencing|abandoned/i,
    out_of_area: /outside.*area|out of.*area|don't.*service|tracy|fairfield|gilroy/i,
    subcontractor: /subcontract|looking for work|crew looking/i,
    not_service: /don't do|we don't|not our/i
  },
  incomplete: {
    too_short: /^(hello|hi|good morning|good afternoon|hey)[\.\s]*$/i,
    system_message: /on hold|system message|callrail|voicemail prompt|closed message/i,
    test_call: /test call|ringcentral test/i,
    connection_issue: /hello hello no response|no connection|no audio/i,
    wrong_number: /wrong number/i
  }
};

function classifyCall(call) {
  const transcript = call.transcript?.text || '';
  const duration = call.duration || 0;
  const city = call.customer_city || '';
  
  // Too short calls
  if (duration < 20 && transcript.length < 100) {
    return {
      category: 'incomplete',
      sub_category: 'too_short',
      caller_intent: 'unknown',
      outcome: 'greeting only',
      summary: 'Call too short - greeting only, no substantive content',
      confidence: 'high',
      notes: 'too short to classify'
    };
  }
  
  // Check for system messages
  if (/thank you for calling|please hold|your call|on hold/i.test(transcript) && duration < 30) {
    return {
      category: 'incomplete',
      sub_category: 'system_message',
      caller_intent: 'unknown',
      outcome: 'no content',
      summary: 'System message only - no actual caller',
      confidence: 'high',
      notes: 'no caller'
    };
  }
  
  // Check for spam patterns
  if (patterns.spam.robocall.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'robocall',
      caller_intent: 'automated spam/lead generation',
      outcome: 'hung up/voicemail',
      summary: 'Robocall spam - press button to connect message',
      confidence: 'high',
      notes: 'obvious robocall'
    };
  }
  
  if (patterns.spam.google_listing.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'google_listing',
      caller_intent: 'Google listing scam',
      outcome: 'short call',
      summary: 'Google listing/verification scam call',
      confidence: 'high',
      notes: 'obvious spam'
    };
  }
  
  if (patterns.spam.yelp_sales.test(transcript)) {
    return {
      category: 'spam',
      sub_category: 'yelp_sales',
      caller_intent: 'sell Yelp advertising',
      outcome: 'declined',
      summary: 'Yelp sales representative pushing advertising package',
      confidence: 'high',
      notes: 'sales call'
    };
  }
  
  // Check for vendor/operations calls
  if (/home depot|concord home depot/i.test(transcript) && /phone sale|credit card|purchase/i.test(transcript)) {
    const amountMatch = transcript.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? amountMatch[1] : 'unknown amount';
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process material purchase',
      outcome: 'processing payment',
      summary: `Home Depot phone sale - purchasing construction materials ($${amount})`,
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  if (/ashby lumber/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_delivery',
      caller_intent: 'coordinate delivery',
      outcome: 'coordinating',
      summary: 'Ashby Lumber delivery coordination for job site',
      confidence: 'high',
      notes: 'vendor'
    };
  }
  
  if (/lowes|lowe's/i.test(transcript) && /phone sale|purchase/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process Lowes purchase',
      outcome: 'processing order',
      summary: 'Lowes phone sale for construction materials',
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  if (/westside building materials/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_purchase',
      caller_intent: 'process material purchase',
      outcome: 'processing payment',
      summary: 'Westside Building Materials purchase for job',
      confidence: 'high',
      notes: 'material purchase'
    };
  }
  
  if (/bpx|print(ing|s)|blueprint/i.test(transcript) && !/bathroom|remodel/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_service',
      caller_intent: 'blueprint/printing services',
      outcome: 'processing',
      summary: 'BPX Printing - blueprint/drawing printing services',
      confidence: 'high',
      notes: 'vendor'
    };
  }
  
  if (/ringcentral/i.test(transcript) && /peyton|meeting|contract/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'vendor_service',
      caller_intent: 'phone service discussion',
      outcome: 'discussing service',
      summary: 'RingCentral phone service representative call',
      confidence: 'high',
      notes: 'vendor service'
    };
  }
  
  // Check for internal/operations calls
  if (/rolly|roli|excel|payment|invoice|quickbooks|check number|change order|schedule of payment/i.test(transcript) && /daniel|carlos|john|bayardo|shy|shai/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'internal_accounting',
      caller_intent: 'internal bookkeeping discussion',
      outcome: 'processing payments/records',
      summary: 'Internal call - discussing payments, invoices, and subcontractor accounting',
      confidence: 'high',
      notes: 'internal bookkeeping'
    };
  }
  
  if (/crash champions|raptor|car|vehicle/i.test(transcript) && /shay|shy/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'personal',
      caller_intent: 'personal vehicle matter',
      outcome: 'forwarded',
      summary: 'Personal call - Crash Champions calling about Shays vehicle repair',
      confidence: 'high',
      notes: 'personal - forwarded to Shay'
    };
  }
  
  // Customer inquiries
  if (/foundation|foundation repair|foundation issue/i.test(transcript)) {
    const cityMatch = city || 'unknown location';
    return {
      category: 'customer',
      sub_category: 'foundation_inquiry',
      caller_intent: 'foundation repair inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer inquiring about foundation repair services in ${cityMatch}`,
      confidence: 'high',
      notes: 'legitimate customer inquiry'
    };
  }
  
  if (/adu|accessory dwelling|garage conversion|garage to/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'adu_inquiry',
      caller_intent: 'ADU/garage conversion inquiry',
      outcome: duration > 200 ? 'discussing project details' : 'initial inquiry',
      summary: `Customer interested in ADU or garage conversion project in ${city}`,
      confidence: 'high',
      notes: 'good lead'
    };
  }
  
  if (/concrete|driveway|walkway|sidewalk|patio|slab/i.test(transcript) && !/home depot|lowes/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'concrete_inquiry',
      caller_intent: 'concrete work inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer inquiring about concrete work (driveway/walkway/patio) in ${city}`,
      confidence: 'high',
      notes: 'customer inquiry'
    };
  }
  
  if (/drainage|french drain|storm drain|water.*basement|water.*cellar/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'drainage_inquiry',
      caller_intent: 'drainage system inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer inquiring about drainage/water issues in ${city}`,
      confidence: 'high',
      notes: 'customer inquiry'
    };
  }
  
  if (/bathroom|kitchen|remodel|renovation/i.test(transcript) && !/don't|can't|not/i.test(transcript.slice(0, 200))) {
    return {
      category: 'customer',
      sub_category: 'remodel_inquiry',
      caller_intent: 'bathroom/kitchen remodel inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer interested in bathroom/kitchen remodel in ${city}`,
      confidence: 'high',
      notes: 'remodel lead'
    };
  }
  
  if (/siding|window|door|sliding door/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'exterior_inquiry',
      caller_intent: 'siding/windows inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer inquiring about exterior work (siding/windows) in ${city}`,
      confidence: 'high',
      notes: 'exterior work inquiry'
    };
  }
  
  if (/excavation|grading|hillside|slope|flat/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'excavation_inquiry',
      caller_intent: 'excavation/grading inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer interested in excavation or grading work in ${city}`,
      confidence: 'high',
      notes: 'excavation inquiry'
    };
  }
  
  if (/retaining wall|cmu|cinder block|block wall/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'masonry_inquiry',
      caller_intent: 'retaining wall/masonry inquiry',
      outcome: duration > 200 ? 'discussed project details' : 'initial inquiry',
      summary: `Customer inquiring about retaining wall or masonry work in ${city}`,
      confidence: 'high',
      notes: 'masonry inquiry'
    };
  }
  
  if (/real estate agent|representing a buyer|property/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'realtor_referral',
      caller_intent: 'realtor seeking quote for client',
      outcome: 'discussing project',
      summary: `Real estate agent calling on behalf of buyer for property work in ${city}`,
      confidence: 'high',
      notes: 'realtor referral'
    };
  }
  
  if (/hotel|la quinta|commercial|prevailing wage/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'commercial_inquiry',
      caller_intent: 'commercial project inquiry',
      outcome: 'discussed project details',
      summary: `Commercial project inquiry - ${city}`,
      confidence: 'high',
      notes: 'commercial lead'
    };
  }
  
  if (/invoice|payment due|paid|balance|deposit/i.test(transcript) && /annette|customer|client/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'payment_followup',
      caller_intent: 'discuss invoice/payment',
      outcome: 'discussing payment terms',
      summary: 'Existing customer calling about invoice or payment',
      confidence: 'high',
      notes: 'existing customer'
    };
  }
  
  // Partner/vendor inquiries
  if (/realm|partners|contract|send projects/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'partner_followup',
      caller_intent: 'partner relationship discussion',
      outcome: 'took message',
      summary: 'Realm partner calling about partnership/contract',
      confidence: 'high',
      notes: 'partner relationship'
    };
  }
  
  if (/fabricator|countertop|slab/i.test(transcript) && /bid|work|subcontract/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'vendor_prospecting',
      caller_intent: 'seeking subcontract work',
      outcome: 'took info',
      summary: 'Fabricator/vendor seeking to bid on countertop projects',
      confidence: 'high',
      notes: 'vendor prospecting'
    };
  }
  
  // Fire damage related (Altadena/Eaton fire)
  if (/fire|eaton fire|altadena|repair my house/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'fire_damage',
      caller_intent: 'fire damage repair inquiry',
      outcome: 'discussed project',
      summary: 'Customer seeking fire damage repair services (Eaton fire related)',
      confidence: 'high',
      notes: 'fire damage - referral'
    };
  }
  
  // City/permit calls
  if (/city of|encroachment permit|permit|inspection|fire district/i.test(transcript) && /lafayette|orinda|oakland/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'permit_followup',
      caller_intent: 'permit/inspection followup',
      outcome: 'coordinating',
      summary: 'City official or permit-related followup call',
      confidence: 'high',
      notes: 'permit related'
    };
  }
  
  // Honey Homes / property management
  if (/honey homes|property management/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'property_management',
      caller_intent: 'property management service request',
      outcome: 'discussing project',
      summary: 'Property management company (Honey Homes) requesting service',
      confidence: 'high',
      notes: 'property management lead'
    };
  }
  
  // Houzz referral
  if (/houzz/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'houzz_lead',
      caller_intent: 'responding to Houzz inquiry',
      outcome: 'scheduling appointment',
      summary: 'Customer responding to Houzz contact - scheduling consultation',
      confidence: 'high',
      notes: 'houzz lead'
    };
  }
  
  // Ready mix concrete
  if (/ready mix|cubic yard/i.test(transcript)) {
    return {
      category: 'customer',
      sub_category: 'concrete_delivery',
      caller_intent: 'ready mix concrete inquiry',
      outcome: 'checking availability',
      summary: 'Customer inquiring about ready mix concrete delivery',
      confidence: 'high',
      notes: 'concrete delivery inquiry'
    };
  }
  
  // Out of service area
  if (/tracy|fairfield|gilroy|isleton|altadena/i.test(transcript) && /out of|don't service|too far/i.test(transcript)) {
    return {
      category: 'other_inquiry',
      sub_category: 'out_of_area',
      caller_intent: 'service inquiry from outside area',
      outcome: 'declined - out of service area',
      summary: `Customer inquiry from outside service area`,
      confidence: 'high',
      notes: 'out of service area'
    };
  }
  
  // Internal bifold door discussion
  if (/bifold|door.*system|video|group (tab|chat)/i.test(transcript) && /juan|gail/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'crew_followup',
      caller_intent: 'discuss workmanship issue',
      outcome: 'discussed issue',
      summary: 'Internal call discussing bifold door installation issue',
      confidence: 'high',
      notes: 'internal crew discussion'
    };
  }
  
  // Material pickup coordination
  if (/pickup|central valley|pickup.*concrete|aggregate/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'material_coordination',
      caller_intent: 'coordinate material pickup',
      outcome: 'processing',
      summary: 'Coordinating material pickup from supplier',
      confidence: 'high',
      notes: 'material coordination'
    };
  }
  
  // Disclosures/real estate paperwork
  if (/disclosure|ann sharp|carmen court/i.test(transcript)) {
    return {
      category: 'operations',
      sub_category: 'real_estate_paperwork',
      caller_intent: 'discuss property disclosures',
      outcome: 'handling documentation',
      summary: 'Real estate paperwork - disclosures for Carmen Court property',
      confidence: 'high',
      notes: 'real estate documentation'
    };
  }
  
  // Default fallback based on duration
  if (duration > 200) {
    return {
      category: 'customer',
      sub_category: 'general_inquiry',
      caller_intent: 'project inquiry',
      outcome: 'discussed project',
      summary: `Customer call from ${city} - discussed potential project`,
      confidence: 'medium',
      notes: 'needs review'
    };
  }
  
  if (duration < 60) {
    return {
      category: 'incomplete',
      sub_category: 'short_call',
      caller_intent: 'unknown',
      outcome: 'call ended quickly',
      summary: 'Short call - insufficient content to classify',
      confidence: 'medium',
      notes: 'short call'
    };
  }
  
  return {
    category: 'other_inquiry',
    sub_category: 'unclassified',
    caller_intent: 'unknown',
    outcome: 'needs review',
    summary: `Call from ${city} - requires manual review`,
    confidence: 'low',
    notes: 'needs manual review'
  };
}

// Generate detailed review based on actual transcript content
function generateDetailedReview(call) {
  const transcript = call.transcript?.text || '';
  const duration = call.duration || 0;
  const city = call.customer_city || 'unknown';
  const direction = call.direction || 'inbound';
  
  // Get base classification
  let result = classifyCall(call);
  
  // Now enhance with transcript-specific details
  const transcriptLower = transcript.toLowerCase();
  
  // Extract specific details from transcript
  const nameMatch = transcript.match(/my name is (\w+)/i) || transcript.match(/this is (\w+)/i);
  const callerName = nameMatch ? nameMatch[1] : null;
  
  const addressMatch = transcript.match(/(\d+\s+[\w\s]+(?:street|st|road|rd|avenue|ave|drive|dr|way|court|ct|circle|lane|ln))/i);
  const address = addressMatch ? addressMatch[1] : null;
  
  const amountMatch = transcript.match(/\$([\d,]+\.?\d*)|(\d+,?\d*)\s*dollars/i);
  const amount = amountMatch ? (amountMatch[1] || amountMatch[2]) : null;
  
  // Enhance summary with specific details
  if (callerName && result.category === 'customer') {
    result.summary = result.summary.replace('Customer', `${callerName}`);
  }
  
  if (address) {
    result.summary += ` at ${address}`;
  }
  
  if (amount && result.category === 'operations') {
    result.summary = result.summary.replace(/\(.*\)/, `($${amount})`);
  }
  
  // Add duration context
  if (duration > 300) {
    result.notes += ' - detailed conversation';
  }
  
  return {
    id: call.id,
    direction: direction,
    duration: duration,
    ...result
  };
}

// Process all calls
console.log(`Processing ${q4Data.length} calls...`);

const reviews = q4Data.map((call, index) => {
  if (index % 100 === 0) {
    console.log(`Processing call ${index + 1}/${q4Data.length}`);
  }
  return generateDetailedReview(call);
});

// Generate CSV
const headers = ['id', 'direction', 'duration', 'category', 'sub_category', 'caller_intent', 'outcome', 'summary', 'confidence', 'notes'];
const csvRows = [headers.join(',')];

reviews.forEach(review => {
  const row = headers.map(h => {
    const val = review[h] || '';
    // Escape commas and quotes in CSV
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  });
  csvRows.push(row.join(','));
});

const csvContent = csvRows.join('\n');

// Write the CSV
fs.writeFileSync('analysis/q4-manual-review.csv', csvContent);

console.log(`\nCompleted! Wrote ${reviews.length} reviews to analysis/q4-manual-review.csv`);

// Print summary statistics
const categories = {};
reviews.forEach(r => {
  categories[r.category] = (categories[r.category] || 0) + 1;
});

console.log('\nCategory breakdown:');
Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
