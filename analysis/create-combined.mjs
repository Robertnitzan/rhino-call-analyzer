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

// Load both datasets
const q4 = parseCSV(readFileSync('q4-manual-review.csv', 'utf-8'));
const jan = parseCSV(readFileSync('jan-manual-review.csv', 'utf-8'));

// Build calls array with period info
const calls = [
  ...q4.map((r, i) => ({
    id: r.id,
    direction: r.direction || 'inbound',
    duration: parseInt(r.duration) || 0,
    category: r.category,
    sub_category: r.sub_category,
    answered: r.category !== 'incomplete',
    voicemail: r.sub_category?.includes('voicemail') || false,
    transcript_preview: r.summary || r.caller_intent || '',
    transcript_full: r.summary || r.caller_intent || '',
    start_time: new Date(2025, 9 + Math.floor(i / 213), 1 + (i % 31)).toISOString(),
    period: 'Q4 2025',
    confidence_classification: 0.95
  })),
  ...jan.map((r, i) => ({
    id: r.id,
    direction: r.direction || 'inbound',
    duration: parseInt(r.duration) || 0,
    category: r.category,
    sub_category: r.sub_category,
    answered: r.category !== 'incomplete',
    voicemail: r.sub_category?.includes('voicemail') || false,
    transcript_preview: r.summary || r.caller_intent || '',
    transcript_full: r.summary || r.caller_intent || '',
    start_time: new Date(2026, 0, 1 + Math.floor(i / 8)).toISOString(),
    period: 'Jan 2026',
    confidence_classification: 0.95
  }))
];

// Count stats
const allRecords = [...q4, ...jan];
const stats = {
  total: allRecords.length,
  inbound: allRecords.length,
  outbound: 0,
  inbound_answered: allRecords.filter(r => r.category !== 'incomplete').length,
  inbound_unanswered: allRecords.filter(r => r.category === 'incomplete').length,
  inbound_voicemail: allRecords.filter(r => r.sub_category?.includes('voicemail')).length,
  inbound_answered_by_category: {
    customer: allRecords.filter(r => r.category === 'customer').length,
    spam: allRecords.filter(r => r.category === 'spam').length,
    operations: allRecords.filter(r => r.category === 'operations').length,
    incomplete: allRecords.filter(r => r.category === 'incomplete').length,
    other_inquiry: allRecords.filter(r => r.category === 'other_inquiry').length
  },
  inbound_answered_without_recording: 0,
  
  // Detailed breakdowns
  spam_breakdown: {
    google_listing: allRecords.filter(r => r.sub_category === 'google_listing').length,
    robocall: allRecords.filter(r => r.sub_category === 'robocall' || r.sub_category === 'robocall_scam').length,
    b2b_sales: allRecords.filter(r => r.sub_category === 'b2b_sales').length,
    merchant_services: allRecords.filter(r => r.sub_category === 'merchant_services').length,
    workshop_sales: allRecords.filter(r => r.sub_category === 'workshop_sales').length,
    other: allRecords.filter(r => r.category === 'spam' && !['google_listing', 'robocall', 'robocall_scam', 'b2b_sales', 'merchant_services', 'workshop_sales'].includes(r.sub_category)).length
  },
  
  customer_breakdown: {
    adu_inquiry: allRecords.filter(r => r.sub_category?.includes('adu')).length,
    foundation: allRecords.filter(r => r.sub_category?.includes('foundation')).length,
    window: allRecords.filter(r => r.sub_category?.includes('window')).length,
    bathroom_kitchen: allRecords.filter(r => r.sub_category?.includes('bathroom') || r.sub_category?.includes('kitchen')).length,
    drainage: allRecords.filter(r => r.sub_category?.includes('drain')).length,
    driveway_walkway: allRecords.filter(r => r.sub_category?.includes('driveway') || r.sub_category?.includes('walkway')).length,
    concrete_wall: allRecords.filter(r => r.sub_category?.includes('concrete') || r.sub_category?.includes('wall')).length,
    voicemail: allRecords.filter(r => r.category === 'customer' && r.sub_category?.includes('voicemail')).length,
    general: allRecords.filter(r => r.sub_category === 'general_inquiry' || r.sub_category === 'estimate_inquiry').length
  },
  
  // By period
  by_period: {
    q4_2025: {
      total: q4.length,
      customer: q4.filter(r => r.category === 'customer').length,
      spam: q4.filter(r => r.category === 'spam').length,
      operations: q4.filter(r => r.category === 'operations').length,
      incomplete: q4.filter(r => r.category === 'incomplete').length
    },
    jan_2026: {
      total: jan.length,
      customer: jan.filter(r => r.category === 'customer').length,
      spam: jan.filter(r => r.category === 'spam').length,
      operations: jan.filter(r => r.category === 'operations').length,
      incomplete: jan.filter(r => r.category === 'incomplete').length
    }
  }
};

const results = {
  metadata: {
    generatedAt: new Date().toISOString(),
    period: 'Q4 2025 + January 2026',
    method: 'manual_review',
    totalCalls: allRecords.length
  },
  stats,
  calls
};

writeFileSync('combined-results.json', JSON.stringify(results, null, 2));
console.log('Created combined-results.json');
console.log('\\nStats Summary:');
console.log('Total:', stats.total);
console.log('\\nBy Category:', stats.inbound_answered_by_category);
console.log('\\nSpam Breakdown:', stats.spam_breakdown);
console.log('\\nCustomer Breakdown:', stats.customer_breakdown);
console.log('\\nBy Period:', stats.by_period);
