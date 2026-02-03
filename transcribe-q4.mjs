import fs from 'fs';

const ASSEMBLYAI_KEY = 'b2ffa7813f1d4931a71f1631ed23f627';
const CALLRAIL_KEY = '022e489d704eeccf8ae1130df8aca2e6';
const ACCOUNT_ID = 'ACC2572dc258af24a36a5f230a177c8820b';

const calls = JSON.parse(fs.readFileSync('./data/q4-2025-calls.json', 'utf-8'));
const withRecording = calls.filter(c => c.has_recording);

console.log(`🎙️ Transcribing ${withRecording.length} calls with AssemblyAI...`);

const results = [];
const progressFile = './data/q4-transcribe-progress.json';

// Load progress if exists
let startIndex = 0;
if (fs.existsSync(progressFile)) {
  const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  results.push(...progress.results);
  startIndex = progress.lastIndex + 1;
  console.log(`Resuming from index ${startIndex}`);
}

async function getRecordingUrl(callId) {
  const res = await fetch(
    `https://api.callrail.com/v3/a/${ACCOUNT_ID}/calls/${callId}/recording.json`,
    { headers: { 'Authorization': `Token token=${CALLRAIL_KEY}` } }
  );
  const data = await res.json();
  
  // Follow redirect to get S3 URL
  const redirectRes = await fetch(data.url, { redirect: 'manual' });
  return redirectRes.headers.get('location');
}

async function transcribe(audioUrl) {
  const createRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      sentiment_analysis: true
    })
  });
  
  const { id, error } = await createRes.json();
  if (error) throw new Error(error);
  
  // Poll for completion
  while (true) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { 'Authorization': ASSEMBLYAI_KEY }
    });
    const data = await pollRes.json();
    
    if (data.status === 'completed') return data;
    if (data.status === 'error') throw new Error(data.error);
  }
}

for (let i = startIndex; i < withRecording.length; i++) {
  const call = withRecording[i];
  console.log(`[${i+1}/${withRecording.length}] ${call.id}...`);
  
  try {
    const audioUrl = await getRecordingUrl(call.id);
    const transcript = await transcribe(audioUrl);
    
    results.push({
      call_id: call.id,
      transcript_id: transcript.id,
      text: transcript.text,
      utterances: transcript.utterances,
      sentiment_analysis_results: transcript.sentiment_analysis_results,
      confidence: transcript.confidence,
      audio_duration: transcript.audio_duration
    });
    console.log(`  ✅ ${transcript.audio_duration}s, confidence: ${(transcript.confidence * 100).toFixed(1)}%`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    results.push({ call_id: call.id, error: err.message });
  }
  
  // Save progress every 10 calls
  if ((i + 1) % 10 === 0) {
    fs.writeFileSync(progressFile, JSON.stringify({ lastIndex: i, results }, null, 2));
    console.log(`💾 Progress saved (${i+1}/${withRecording.length})`);
  }
}

// Final save
fs.writeFileSync('./data/q4-transcripts.json', JSON.stringify(results, null, 2));
console.log(`\n✅ Done! Saved ${results.length} transcripts`);
