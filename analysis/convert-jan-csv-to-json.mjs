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

const results = {
  metadata: {
    generatedAt: new Date().toISOString(),
    period: "January 2026",
    method: "manual_review",
    totalCalls: records.length
  },
  summary: { customer: 0, spam: 0, operations: 0, incomplete: 0, other_inquiry: 0 },
  calls: []
};

for (const row of records) {
  const cat = row.category;
  if (results.summary[cat] !== undefined) results.summary[cat]++;
  
  results.calls.push({
    id: row.id,
    direction: row.direction,
    duration: parseInt(row.duration) || 0,
    category: cat,
    sub_category: row.sub_category,
    caller_intent: row.caller_intent,
    outcome: row.outcome,
    summary: row.summary,
    confidence: row.confidence,
    notes: row.notes
  });
}

writeFileSync('jan-results.json', JSON.stringify(results, null, 2));
console.log('Summary:', results.summary);
