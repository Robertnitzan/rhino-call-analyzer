import { readFileSync, writeFileSync } from 'fs';

// Parse CSV helper
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current); current = ''; }
      else current += char;
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

// Load classifications
const q4Class = parseCSV(readFileSync('q4-manual-review.csv', 'utf-8'));
const janClass = parseCSV(readFileSync('jan-manual-review.csv', 'utf-8'));

// Build Q4 classification map by ID
const q4ClassMap = {};
q4Class.forEach(c => { q4ClassMap[c.id] = c; });

// Load original Q4 data
const q4Raw = JSON.parse(readFileSync('../data/q4-2025-calls.json', 'utf-8'));
const q4Transcripts = JSON.parse(readFileSync('../data/q4-transcripts.json', 'utf-8'));
const q4TranscriptMap = {};
q4Transcripts.forEach(t => { if(t.call_id) q4TranscriptMap[t.call_id] = t; });

// Load January data (jan-for-review has the transcripts, use index to match with classification)
const janForReview = JSON.parse(readFileSync('jan-for-review.json', 'utf-8'));

console.log('Q4 raw calls:', q4Raw.length);
console.log('Q4 transcripts:', Object.keys(q4TranscriptMap).length);
console.log('Q4 classifications:', q4Class.length);
console.log('Jan for review:', janForReview.length);
console.log('Jan classifications:', janClass.length);

// Build combined calls array
const calls = [];

// Q4 calls with transcripts
q4Raw.forEach(rawCall => {
  const classification = q4ClassMap[rawCall.id];
  const transcript = q4TranscriptMap[rawCall.id];
  
  if (!classification) return; // Only include classified calls
  
  calls.push({
    id: rawCall.id,
    direction: rawCall.direction,
    duration: rawCall.duration,
    start_time: rawCall.start_time,
    customer_phone: rawCall.customer_phone || '',
    customer_name: rawCall.customer_name || '',
    customer_city: rawCall.customer_city || '',
    customer_state: rawCall.customer_state || '',
    answered: rawCall.answered,
    voicemail: rawCall.voicemail,
    recording_url: rawCall.recording_url || '',
    
    // Transcript
    transcript_full: transcript?.text || '',
    transcript_preview: (transcript?.text || '').substring(0, 200),
    utterances: transcript?.utterances || null,
    
    // Classification
    category: classification.category,
    sub_category: classification.sub_category,
    notes: classification.summary || '',
    confidence_classification: 0.95,
    
    period: 'Q4 2025'
  });
});

// January calls - use INDEX to match classification (same order verified)
janForReview.forEach((rawCall, index) => {
  const classification = janClass[index]; // Match by index!
  
  if (!classification) return;
  
  calls.push({
    id: rawCall.id,
    direction: rawCall.direction,
    duration: rawCall.duration,
    start_time: rawCall.start_time,
    customer_phone: rawCall.customer_phone || '',
    customer_name: rawCall.customer_name || '',
    customer_city: rawCall.customer_city || '',
    customer_state: '',
    answered: rawCall.answered,
    voicemail: rawCall.voicemail,
    recording_url: '', // January data doesn't have recording URLs
    
    // Transcript - it's a direct string in jan-for-review
    transcript_full: rawCall.transcript || '',
    transcript_preview: (rawCall.transcript || '').substring(0, 200),
    utterances: null,
    
    // Classification - use notes from CSV  
    category: classification.category,
    sub_category: classification.sub_category,
    notes: classification.summary || classification.caller_intent || '',
    confidence_classification: 0.95,
    
    period: 'Jan 2026'
  });
});

console.log('\nTotal combined calls:', calls.length);
console.log('Q4 calls:', calls.filter(c => c.period === 'Q4 2025').length);
console.log('Jan calls:', calls.filter(c => c.period === 'Jan 2026').length);
console.log('With transcript:', calls.filter(c => c.transcript_full).length);
console.log('With recording_url:', calls.filter(c => c.recording_url).length);

// Count stats
const stats = {
  total: calls.length,
  inbound: calls.filter(c => c.direction === 'inbound').length,
  outbound: calls.filter(c => c.direction === 'outbound').length,
  inbound_answered: calls.filter(c => c.category !== 'incomplete').length,
  inbound_unanswered: calls.filter(c => c.category === 'incomplete').length,
  inbound_voicemail: calls.filter(c => c.voicemail).length,
  with_recording: calls.filter(c => c.recording_url).length,
  with_transcript: calls.filter(c => c.transcript_full).length,
  
  inbound_answered_by_category: {
    customer: calls.filter(c => c.category === 'customer').length,
    spam: calls.filter(c => c.category === 'spam').length,
    operations: calls.filter(c => c.category === 'operations').length,
    incomplete: calls.filter(c => c.category === 'incomplete').length,
    other_inquiry: calls.filter(c => c.category === 'other_inquiry').length
  },
  
  spam_breakdown: {
    google_listing: calls.filter(c => c.sub_category === 'google_listing').length,
    robocall: calls.filter(c => c.sub_category === 'robocall' || c.sub_category === 'robocall_scam').length,
    b2b_sales: calls.filter(c => c.sub_category === 'b2b_sales').length,
    merchant_services: calls.filter(c => c.sub_category === 'merchant_services').length,
    workshop_sales: calls.filter(c => c.sub_category === 'workshop_sales').length,
    other: calls.filter(c => c.category === 'spam' && !['google_listing', 'robocall', 'robocall_scam', 'b2b_sales', 'merchant_services', 'workshop_sales'].includes(c.sub_category)).length
  },
  
  customer_breakdown: {
    adu_inquiry: calls.filter(c => c.sub_category?.includes('adu')).length,
    foundation: calls.filter(c => c.sub_category?.includes('foundation')).length,
    window: calls.filter(c => c.sub_category?.includes('window')).length,
    bathroom_kitchen: calls.filter(c => c.sub_category?.includes('bathroom') || c.sub_category?.includes('kitchen')).length,
    drainage: calls.filter(c => c.sub_category?.includes('drain')).length,
    driveway_walkway: calls.filter(c => c.sub_category?.includes('driveway') || c.sub_category?.includes('walkway')).length,
    concrete_wall: calls.filter(c => c.sub_category?.includes('concrete') || c.sub_category?.includes('wall')).length,
    voicemail: calls.filter(c => c.category === 'customer' && c.sub_category?.includes('voicemail')).length,
    general: calls.filter(c => c.sub_category === 'general_inquiry' || c.sub_category === 'estimate_inquiry').length
  },
  
  by_period: {
    q4_2025: {
      total: calls.filter(c => c.period === 'Q4 2025').length,
      customer: calls.filter(c => c.period === 'Q4 2025' && c.category === 'customer').length,
      spam: calls.filter(c => c.period === 'Q4 2025' && c.category === 'spam').length,
      operations: calls.filter(c => c.period === 'Q4 2025' && c.category === 'operations').length,
      incomplete: calls.filter(c => c.period === 'Q4 2025' && c.category === 'incomplete').length
    },
    jan_2026: {
      total: calls.filter(c => c.period === 'Jan 2026').length,
      customer: calls.filter(c => c.period === 'Jan 2026' && c.category === 'customer').length,
      spam: calls.filter(c => c.period === 'Jan 2026' && c.category === 'spam').length,
      operations: calls.filter(c => c.period === 'Jan 2026' && c.category === 'operations').length,
      incomplete: calls.filter(c => c.period === 'Jan 2026' && c.category === 'incomplete').length
    }
  }
};

const results = {
  metadata: {
    generatedAt: new Date().toISOString(),
    period: 'Q4 2025 + January 2026',
    method: 'manual_review',
    totalCalls: calls.length
  },
  stats,
  calls
};

writeFileSync('combined-results.json', JSON.stringify(results, null, 2));
console.log('\n✅ Created combined-results.json');
console.log('Stats:', JSON.stringify(stats.inbound_answered_by_category));
