import { readFileSync, writeFileSync } from 'fs';

const calls = JSON.parse(readFileSync('../data/q4-2025-calls.json', 'utf-8'));
const transcriptsArray = JSON.parse(readFileSync('../data/q4-transcripts.json', 'utf-8'));

// Build transcript map by call_id
const transcriptMap = {};
for (const t of transcriptsArray) {
  if (t.call_id) {
    transcriptMap[t.call_id] = t;
  }
}

console.log('Total calls:', calls.length);
console.log('Transcripts:', Object.keys(transcriptMap).length);

// Get inbound calls with transcripts
const inboundWithTranscript = calls
  .filter(c => c.direction === 'inbound' && transcriptMap[c.id])
  .map(c => ({
    ...c,
    transcript: transcriptMap[c.id]
  }));

console.log('Inbound with transcript:', inboundWithTranscript.length);

// Sort by duration (longer calls first - more likely to be meaningful)
inboundWithTranscript.sort((a, b) => (b.duration || 0) - (a.duration || 0));

// Create CSV for manual review
const header = 'id,direction,duration,category,sub_category,caller_intent,outcome,summary,confidence,notes';
const rows = inboundWithTranscript.map(c => {
  return `${c.id},${c.direction},${c.duration},,,,,,,"transcript available"`;
});

writeFileSync('q4-manual-review.csv', header + '\n' + rows.join('\n'));
console.log('Created q4-manual-review.csv with', inboundWithTranscript.length, 'calls');

// Also save the full data for reference
writeFileSync('q4-for-review.json', JSON.stringify(inboundWithTranscript, null, 2));
console.log('Created q4-for-review.json');
