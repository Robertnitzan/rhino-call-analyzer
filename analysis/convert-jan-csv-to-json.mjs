import { readFileSync, writeFileSync } from 'fs';

// Simple CSV parser
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else current += char;
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

const csv = readFileSync('jan-manual-review.csv', 'utf-8');
const records = parseCSV(csv);

// Build calls array with proper structure
const calls = records.map((row, idx) => ({
  id: row.id,
  direction: row.direction || 'inbound',
  duration: parseInt(row.duration) || 0,
  category: row.category,
  sub_category: row.sub_category,
  answered: row.category !== 'incomplete',  // assume answered if not incomplete
  voicemail: row.sub_category?.includes('voicemail') || false,
  transcript_preview: row.summary,
  transcript_full: row.summary,
  start_time: new Date(2026, 0, 1 + Math.floor(idx / 10)).toISOString(),  // spread across January
  confidence_classification: row.confidence === 'high' ? 0.95 : row.confidence === 'medium' ? 0.75 : 0.6,
  customer_phone: '',
  customer_city: ''
}));

// Calculate stats
const stats = {
  total: calls.length,
  inbound: calls.filter(c => c.direction === 'inbound').length,
  outbound: calls.filter(c => c.direction === 'outbound').length,
  inbound_answered: calls.filter(c => c.direction === 'inbound' && c.answered).length,
  inbound_unanswered: calls.filter(c => c.direction === 'inbound' && !c.answered).length,
  inbound_voicemail: calls.filter(c => c.voicemail).length,
  inbound_answered_by_category: {
    customer: calls.filter(c => c.category === 'customer').length,
    spam: calls.filter(c => c.category === 'spam').length,
    operations: calls.filter(c => c.category === 'operations').length,
    incomplete: calls.filter(c => c.category === 'incomplete').length,
    other_inquiry: calls.filter(c => c.category === 'other_inquiry').length
  },
  inbound_answered_without_recording: 0
};

const results = {
  metadata: {
    generatedAt: new Date().toISOString(),
    period: "January 2026",
    method: "manual_review",
    totalCalls: records.length
  },
  stats,
  calls
};

writeFileSync('jan-results.json', JSON.stringify(results, null, 2));
console.log('Generated jan-results.json with stats');
console.log('Stats:', JSON.stringify(stats, null, 2));
