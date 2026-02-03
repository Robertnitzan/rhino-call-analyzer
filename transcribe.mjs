#!/usr/bin/env node
/**
 * Transcribe Rhino calls using AssemblyAI
 * Features: Speaker diarization, sentiment analysis, summarization
 */

import fs from 'fs';
import path from 'path';

const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
const CALLS_DIR = '../rhino-call-analysis/data-full/calls';
const OUTPUT_DIR = './transcriptions';

if (!ASSEMBLYAI_KEY) {
  console.error('Missing ASSEMBLYAI_API_KEY');
  process.exit(1);
}

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Load all calls
const callFiles = fs.readdirSync(CALLS_DIR).filter(f => f.endsWith('.json'));
const calls = callFiles.map(f => JSON.parse(fs.readFileSync(path.join(CALLS_DIR, f))));

// Filter calls with recordings
const callsWithRecordings = calls.filter(c => c.recording_player && c.duration > 5);
console.log(`Found ${callsWithRecordings.length} calls with recordings (duration > 5s)`);

// Check which are already transcribed
const alreadyDone = new Set(
  fs.existsSync(OUTPUT_DIR) 
    ? fs.readdirSync(OUTPUT_DIR).map(f => f.replace('.json', ''))
    : []
);

const pending = callsWithRecordings.filter(c => !alreadyDone.has(c.id));
console.log(`Already transcribed: ${alreadyDone.size}`);
console.log(`Pending: ${pending.length}`);

async function transcribeCall(call) {
  const audioUrl = call.recording_player;
  
  console.log(`\nTranscribing ${call.id} (${call.duration}s)...`);
  
  // Submit transcription job
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      sentiment_analysis: true,
      summarization: true,
      summary_model: 'informative',
      summary_type: 'bullets',
      language_detection: true
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to submit: ${error}`);
    return null;
  }
  
  const job = await response.json();
  console.log(`  Job ID: ${job.id}`);
  
  // Poll for completion
  let result;
  while (true) {
    await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds
    
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${job.id}`, {
      headers: { 'Authorization': ASSEMBLYAI_KEY }
    });
    
    result = await pollRes.json();
    
    if (result.status === 'completed') {
      console.log(`  ✓ Completed`);
      break;
    } else if (result.status === 'error') {
      console.error(`  ✗ Error: ${result.error}`);
      return null;
    } else {
      process.stdout.write('.');
    }
  }
  
  // Save result
  const output = {
    call_id: call.id,
    customer_phone: call.customer_phone_number,
    customer_name: call.customer_name,
    customer_city: call.customer_city,
    duration: call.duration,
    start_time: call.start_time,
    direction: call.direction,
    original_transcript: call.transcription,
    assemblyai: {
      transcript_id: result.id,
      text: result.text,
      confidence: result.confidence,
      language: result.language_code,
      words: result.words?.length || 0,
      utterances: result.utterances,
      sentiment_results: result.sentiment_analysis_results,
      summary: result.summary
    }
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${call.id}.json`),
    JSON.stringify(output, null, 2)
  );
  
  return output;
}

// Process calls sequentially (to avoid rate limits)
async function main() {
  const results = [];
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < pending.length; i++) {
    const call = pending[i];
    console.log(`\n[${i + 1}/${pending.length}]`);
    
    try {
      const result = await transcribeCall(call);
      if (result) {
        results.push(result);
        success++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      failed++;
    }
    
    // Save progress
    fs.writeFileSync('./transcription-progress.json', JSON.stringify({
      total: pending.length,
      success,
      failed,
      lastUpdated: new Date().toISOString()
    }, null, 2));
  }
  
  console.log(`\n\nDone! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
