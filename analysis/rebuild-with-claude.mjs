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

// Load Claude's classification
const claudeClass = parseCSV(readFileSync('claude-final-classification.csv', 'utf-8'));
console.log('Claude classifications:', claudeClass.length);

// Build classification map by ID
const classMap = {};
claudeClass.forEach(c => { classMap[c.id] = c; });

// Load original Q4 data for metadata
const q4Raw = JSON.parse(readFileSync('../data/q4-2025-calls.json', 'utf-8'));
const q4RawMap = {};
q4Raw.forEach(c => { q4RawMap[c.id] = c; });

// Load Q4 transcripts
const q4Transcripts = JSON.parse(readFileSync('../data/q4-transcripts.json', 'utf-8'));
const q4TranscriptMap = {};
q4Transcripts.forEach(t => { if(t.call_id) q4TranscriptMap[t.call_id] = t; });

// Load January data with AssemblyAI
const callsMerged = JSON.parse(readFileSync('../data/calls-merged.json', 'utf-8'));
const mergedMap = {};
callsMerged.forEach(c => { mergedMap[c.id] = c; });

// Load January recording URLs
const janRecordings = JSON.parse(readFileSync('jan-recording-urls.json', 'utf-8'));

console.log('Q4 raw calls:', q4Raw.length);
console.log('Q4 transcripts:', Object.keys(q4TranscriptMap).length);
console.log('January merged:', callsMerged.length);
console.log('January recordings:', Object.keys(janRecordings).length);

// Map Claude categories to dashboard format
function mapCategory(cat) {
  const mapping = {
    'CUSTOMER': 'customer',
    'SPAM': 'spam',
    'OPERATIONS': 'operations',
    'INCOMPLETE': 'incomplete',
    'NOT_FIT': 'not_fit',
    'SYSTEM': 'system',
    'OUTBOUND': 'outbound'
  };
  return mapping[cat] || cat.toLowerCase();
}

// Build combined calls array
const calls = [];

claudeClass.forEach(classification => {
  const id = classification.id;
  const q4Data = q4RawMap[id];
  const transcript = q4TranscriptMap[id];
  const janData = mergedMap[id];
  
  // Determine if this is Q4 or January based on date
  const isJanuary = classification.date && classification.date.startsWith('2026-01');
  
  // Get raw data from appropriate source
  const rawCall = q4Data || janData;
  if (!rawCall) {
    console.log('Missing raw data for:', id);
    return;
  }
  
  // Get transcript - Q4 from transcripts file, Jan from merged
  let transcriptText = '';
  let utterances = null;
  let sentimentResults = null;
  
  if (transcript) {
    transcriptText = transcript.text || '';
    utterances = transcript.utterances || null;
  } else if (janData) {
    transcriptText = janData.assemblyai_text || janData.original_transcript || '';
    utterances = janData.utterances || null;
    sentimentResults = janData.sentiment_results || null;
  }
  
  // Get recording URL
  let recordingUrl = '';
  if (q4Data && q4Data.recording_url) {
    recordingUrl = q4Data.recording_url;
  } else if (janRecordings[id]) {
    recordingUrl = janRecordings[id];
  }
  
  calls.push({
    id: id,
    direction: rawCall.direction || classification.direction,
    duration: rawCall.duration || parseInt(classification.duration) || 0,
    start_time: rawCall.start_time || `${classification.date}T00:00:00`,
    customer_phone: rawCall.customer_phone || '',
    customer_name: rawCall.customer_name || '',
    customer_city: rawCall.customer_city || '',
    customer_state: rawCall.customer_state || '',
    answered: rawCall.answered !== false,
    voicemail: rawCall.voicemail || false,
    recording_url: recordingUrl,
    source: classification.source || rawCall.source || '',
    
    // Transcript
    transcript_full: transcriptText,
    transcript_preview: transcriptText.substring(0, 200),
    utterances: utterances,
    sentiment_results: sentimentResults,
    
    // Classification from Claude
    category: mapCategory(classification.category),
    notes: classification.summary || '',
    confidence_classification: 0.95,
    
    period: isJanuary ? 'Jan 2026' : 'Q4 2025'
  });
});

console.log('\nTotal combined calls:', calls.length);
console.log('Q4 calls:', calls.filter(c => c.period === 'Q4 2025').length);
console.log('Jan calls:', calls.filter(c => c.period === 'Jan 2026').length);
console.log('With transcript:', calls.filter(c => c.transcript_full).length);
console.log('With recording_url:', calls.filter(c => c.recording_url).length);

// Count by category
const catCounts = {};
calls.forEach(c => {
  catCounts[c.category] = (catCounts[c.category] || 0) + 1;
});
console.log('\nBy category:', catCounts);

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
  
  inbound_answered_by_category: catCounts,
  
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
    method: 'claude_classification',
    totalCalls: calls.length
  },
  stats,
  calls
};

writeFileSync('combined-results.json', JSON.stringify(results, null, 2));
console.log('\n✅ Created combined-results.json with Claude classification');
