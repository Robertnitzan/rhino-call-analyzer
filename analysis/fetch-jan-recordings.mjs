import { readFileSync, writeFileSync } from 'fs';

const API_KEY = 'fbc1ae2857ec334ba81355effde85697';
const ACCOUNT_ID = 'ACC2572dc258af24a36a5f230a177c8820b';

async function fetchAllJanuaryCalls() {
  let allCalls = [];
  let page = 1;
  let totalPages = 1;
  
  while (page <= totalPages) {
    console.log(`Fetching page ${page}...`);
    const url = `https://api.callrail.com/v3/a/${ACCOUNT_ID}/calls.json?start_date=2026-01-01&end_date=2026-01-31&per_page=250&page=${page}&fields=id,recording,recording_player`;
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Token token=${API_KEY}` }
    });
    const data = await res.json();
    
    totalPages = data.total_pages;
    allCalls = allCalls.concat(data.calls);
    console.log(`  Got ${data.calls.length} calls, total so far: ${allCalls.length}`);
    page++;
  }
  
  return allCalls;
}

async function main() {
  console.log('Fetching January 2026 calls from CallRail...\n');
  
  const calls = await fetchAllJanuaryCalls();
  console.log(`\nTotal calls fetched: ${calls.length}`);
  
  // Build map of call ID to recording URL
  const recordingMap = {};
  let withRecording = 0;
  calls.forEach(c => {
    if (c.recording_player) {
      recordingMap[c.id] = c.recording_player;
      withRecording++;
    }
  });
  console.log(`Calls with recording: ${withRecording}`);
  
  // Save the map
  writeFileSync('jan-recording-urls.json', JSON.stringify(recordingMap, null, 2));
  console.log('Saved to jan-recording-urls.json');
  
  // Now update combined-results.json
  const combined = JSON.parse(readFileSync('combined-results.json', 'utf-8'));
  let updated = 0;
  
  combined.calls.forEach(call => {
    if (recordingMap[call.id] && !call.recording_url) {
      call.recording_url = recordingMap[call.id];
      updated++;
    }
  });
  
  // Update stats
  combined.stats.with_recording = combined.calls.filter(c => c.recording_url).length;
  combined.metadata.generatedAt = new Date().toISOString();
  
  writeFileSync('combined-results.json', JSON.stringify(combined, null, 2));
  console.log(`\nUpdated ${updated} calls with recording URLs`);
  console.log(`Total with recording: ${combined.stats.with_recording}`);
}

main().catch(console.error);
