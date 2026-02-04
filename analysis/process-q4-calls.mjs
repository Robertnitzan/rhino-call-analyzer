import fs from 'fs';
import path from 'path';

// Load all data
const callsData = JSON.parse(fs.readFileSync('../data/q4-calls-merged.json', 'utf-8'));
const transcriptsData = JSON.parse(fs.readFileSync('../data/q4-transcripts.json', 'utf-8'));
const currentCSV = fs.readFileSync('q4-manual-review.csv', 'utf-8');

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

// Parse existing CSV
const lines = currentCSV.trim().split('\n');
const header = lines[0];

console.log(`Total calls in CSV: ${lines.length - 1}`);
console.log(`Calls with transcripts: ${Object.keys(transcriptLookup).length}`);
console.log(`Calls data entries: ${callsData.length}`);

// Output for analysis
const output = { calls: [], needsReview: [], noTranscript: [] };

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // Parse CSV carefully
  const match = line.match(/^([^,]+),([^,]+),(\d+),(.*)$/);
  if (!match) continue;
  
  const callId = match[1];
  const direction = match[2];
  const duration = parseInt(match[3]);
  
  const call = callLookup[callId];
  const transcript = transcriptLookup[callId] || (call?.assemblyai_text) || '';
  
  output.calls.push({
    id: callId,
    direction,
    duration,
    transcript: transcript.substring(0, 500),
    hasTranscript: !!transcript,
    customerCity: call?.customer_city || '',
    customerName: call?.customer_name || '',
    source: call?.source || ''
  });
  
  if (!transcript) {
    output.noTranscript.push(callId);
  }
}

// Write analysis
fs.writeFileSync('q4-call-analysis.json', JSON.stringify(output, null, 2));
console.log(`\nCalls without transcripts: ${output.noTranscript.length}`);
console.log('Wrote q4-call-analysis.json');
