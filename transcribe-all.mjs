#!/usr/bin/env node
/**
 * Download and transcribe all Rhino calls using CallRail + AssemblyAI
 */

import fs from 'fs';
import path from 'path';

const CALLRAIL_KEY = '022e489d704eeccf8ae1130df8aca2e6';
const ASSEMBLYAI_KEY = 'b2ffa7813f1d4931a71f1631ed23f627';
const ACCOUNT_ID = 'ACC2572dc258af24a36a5f230a177c8820b';
const CALLS_DIR = '../rhino-call-analysis/data-full/calls';
const OUTPUT_DIR = './transcriptions';
const AUDIO_DIR = './audio';

// Create directories
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Load all calls
const callFiles = fs.readdirSync(CALLS_DIR).filter(f => f.endsWith('.json'));
const calls = callFiles.map(f => JSON.parse(fs.readFileSync(path.join(CALLS_DIR, f))));

// Filter calls with recordings (duration > 5s to skip very short ones)
const callsWithRecordings = calls.filter(c => c.recording && c.duration > 5);
console.log(`Total calls: ${calls.length}`);
console.log(`With recordings (>5s): ${callsWithRecordings.length}`);

// Check already done
const done = new Set(
  fs.existsSync(OUTPUT_DIR) 
    ? fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
    : []
);
const pending = callsWithRecordings.filter(c => !done.has(c.id));
console.log(`Already transcribed: ${done.size}`);
console.log(`Pending: ${pending.length}`);

async function downloadRecording(call) {
  // Get recording URL from CallRail API
  const apiUrl = `https://api.callrail.com/v3/a/${ACCOUNT_ID}/calls/${call.id}/recording.json`;
  const res = await fetch(apiUrl, {
    headers: { 'Authorization': `Token token=${CALLRAIL_KEY}` }
  });
  
  if (!res.ok) {
    throw new Error(`CallRail API error: ${res.status}`);
  }
  
  const { url } = await res.json();
  
  // Download audio following redirect
  const audioRes = await fetch(url);
  if (!audioRes.ok) {
    throw new Error(`Audio download error: ${audioRes.status}`);
  }
  
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  const audioPath = path.join(AUDIO_DIR, `${call.id}.mp3`);
  fs.writeFileSync(audioPath, buffer);
  
  return audioPath;
}

async function uploadToAssemblyAI(audioPath) {
  const audioData = fs.readFileSync(audioPath);
  
  const res = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_KEY,
      'Content-Type': 'application/octet-stream'
    },
    body: audioData
  });
  
  const { upload_url } = await res.json();
  return upload_url;
}

async function transcribe(uploadUrl) {
  // Submit job
  const res = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      speaker_labels: true,
      sentiment_analysis: true,
      language_detection: true
    })
  });
  
  const job = await res.json();
  
  // Poll for completion
  while (true) {
    await new Promise(r => setTimeout(r, 3000));
    
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${job.id}`, {
      headers: { 'Authorization': ASSEMBLYAI_KEY }
    });
    
    const result = await pollRes.json();
    
    if (result.status === 'completed') {
      return result;
    } else if (result.status === 'error') {
      throw new Error(result.error);
    }
    
    process.stdout.write('.');
  }
}

async function processCall(call, index, total) {
  console.log(`\n[${index + 1}/${total}] ${call.id} (${call.duration}s)`);
  
  try {
    // Download
    process.stdout.write('  Downloading... ');
    const audioPath = await downloadRecording(call);
    console.log('✓');
    
    // Upload
    process.stdout.write('  Uploading... ');
    const uploadUrl = await uploadToAssemblyAI(audioPath);
    console.log('✓');
    
    // Transcribe
    process.stdout.write('  Transcribing');
    const result = await transcribe(uploadUrl);
    console.log(' ✓');
    
    // Save result
    const output = {
      call_id: call.id,
      customer_phone: call.customer_phone_number,
      customer_name: call.customer_name,
      customer_city: call.customer_city,
      customer_state: call.customer_state,
      duration: call.duration,
      direction: call.direction,
      start_time: call.start_time,
      source: call.source,
      original_transcript: call.transcription,
      assemblyai: {
        transcript_id: result.id,
        text: result.text,
        confidence: result.confidence,
        language: result.language_code,
        audio_duration: result.audio_duration,
        words: result.words,
        utterances: result.utterances,
        sentiment_analysis_results: result.sentiment_analysis_results
      }
    };
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${call.id}.json`),
      JSON.stringify(output, null, 2)
    );
    
    // Clean up audio file to save space
    fs.unlinkSync(audioPath);
    
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  Speakers: ${new Set(result.utterances?.map(u => u.speaker) || []).size}`);
    
    return { success: true, id: call.id, confidence: result.confidence };
    
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return { success: false, id: call.id, error: err.message };
  }
}

async function main() {
  console.log(`\nStarting transcription of ${pending.length} calls...\n`);
  
  const results = [];
  let success = 0, failed = 0;
  
  for (let i = 0; i < pending.length; i++) {
    const result = await processCall(pending[i], i, pending.length);
    results.push(result);
    
    if (result.success) success++;
    else failed++;
    
    // Save progress
    fs.writeFileSync('./progress.json', JSON.stringify({
      total: pending.length,
      processed: i + 1,
      success,
      failed,
      lastUpdated: new Date().toISOString()
    }, null, 2));
    
    // Rate limit - wait 1 second between calls
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\n\n=== COMPLETE ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  
  // Save summary
  fs.writeFileSync('./transcription-summary.json', JSON.stringify({
    completedAt: new Date().toISOString(),
    total: pending.length,
    success,
    failed,
    results
  }, null, 2));
}

main().catch(console.error);
