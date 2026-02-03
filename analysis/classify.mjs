#!/usr/bin/env node
/**
 * Call Classification Pipeline
 * 
 * Categories:
 * - customer: Real customer inquiry (quote request, scheduling, questions)
 * - spam: Spam/robocalls/solicitation
 * - operations: Internal/vendor/employee calls
 * - incomplete: Too short or unclear to classify
 * 
 * Each classification includes:
 * - category
 * - confidence (0-1)
 * - reasoning
 * - sentiment_summary
 * - key_topics
 */

import fs from 'fs';

const INPUT_FILE = '../data/calls-merged.json';
const OUTPUT_FILE = './results.json';

// Load calls
const calls = JSON.parse(fs.readFileSync(INPUT_FILE));
console.log(`Loaded ${calls.length} calls`);

// Spam indicators
const SPAM_PATTERNS = [
  /warranty/i, /vehicle warranty/i, /car warranty/i,
  /medicare/i, /medicaid/i, /health insurance/i,
  /credit card/i, /lower your rate/i, /interest rate/i,
  /solar panel/i, /solar energy/i,
  /press (one|1|two|2)/i, /press \d/i,
  /this is not a sales call/i,
  /business listing/i, /google listing/i, /yelp/i,
  /final notice/i, /last chance/i, /act now/i,
  /robot|automated|recording/i,
  /insurance agent/i, /life insurance/i,
  /refinance/i, /mortgage rate/i,
  /won a|winner|congratulations/i,
  /political|campaign|vote for/i,
  /subscription|renew/i,
  /donation|charity|nonprofit/i,
  /merchant service/i, /payment processing/i,
  /honors account|reward points|points in your/i,
  /aspire institute/i, /not interested/i,
  /google voice/i, /currently having/i,
  /business opportunity/i, /work from home/i,
  /SEO|search engine|ranking/i,
  /this call (may|is) being recorded/i,
  /limited time/i, /special offer/i,
  /free (quote|estimate|consultation)/i,
  /we'?re? calling (about|regarding|from)/i
];

// Operations indicators (internal/vendor calls)
const OPERATIONS_PATTERNS = [
  /delivery|delivering|dropped off/i,
  /schedule.*(pickup|delivery)/i,
  /material|supplies|order/i,
  /invoice|payment|bill/i,
  /employee|worker|crew/i,
  /this is .* from .* (supply|materials|lumber)/i,
  /contractor|subcontractor/i,
  /permit|inspection/i,
  /floor and decor|home depot|lowes/i,
  /pay|paying|payment/i,
  /victor|genaro|boss/i,  // Common internal names
  /truck|trailer|equipment/i,
  /job site|site address/i,
  /tomorrow|yesterday|this morning/i
];

// Customer indicators
const CUSTOMER_PATTERNS = [
  /quote|estimate|bid/i,
  /how much|price|cost/i,
  /schedule|appointment|available/i,
  /project|job|work/i,
  /concrete|foundation|slab|driveway|patio|sidewalk/i,
  /remodel|renovation|repair/i,
  /bathroom|kitchen|basement/i,
  /interested in|looking for|need/i,
  /address is|located at|property/i,
  /call.*(back|me)|return.*call/i
];

function classifyCall(call) {
  const result = {
    id: call.id,
    direction: call.direction,
    duration: call.duration,
    start_time: call.start_time,
    customer_phone: call.customer_phone,
    customer_name: call.customer_name,
    customer_city: call.customer_city,
    has_recording: call.has_recording,
    has_assemblyai: call.has_assemblyai,
    confidence_transcription: call.confidence,
    speakers: call.speakers,
    // Classification results (to be filled)
    category: null,
    confidence_classification: null,
    reasoning: [],
    sentiment_summary: null,
    key_topics: [],
    transcript_preview: null
  };

  const text = call.assemblyai_text || call.original_transcript || '';
  const textLower = text.toLowerCase();
  result.transcript_preview = text.substring(0, 300);

  // === Rule-based classification ===
  
  // 1. No transcript or very short
  if (!text || text.trim().length < 20) {
    result.category = 'incomplete';
    result.confidence_classification = 0.9;
    result.reasoning.push('No transcript or very short text');
    return result;
  }

  // 2. Very short duration without meaningful content
  if (call.duration < 10 && text.split(' ').length < 15) {
    result.category = 'incomplete';
    result.confidence_classification = 0.85;
    result.reasoning.push('Very short call with minimal content');
    return result;
  }

  // 3. Check spam patterns
  const spamMatches = SPAM_PATTERNS.filter(p => p.test(text));
  if (spamMatches.length > 0) {
    result.category = 'spam';
    result.confidence_classification = Math.min(0.7 + spamMatches.length * 0.1, 0.98);
    result.reasoning.push(`Spam patterns detected: ${spamMatches.length} matches`);
    result.key_topics = spamMatches.map(p => p.source);
    return result;
  }

  // 4. Check operations patterns
  const opsMatches = OPERATIONS_PATTERNS.filter(p => p.test(text));
  if (opsMatches.length >= 2) {
    result.category = 'operations';
    result.confidence_classification = Math.min(0.7 + opsMatches.length * 0.1, 0.95);
    result.reasoning.push(`Operations patterns detected: ${opsMatches.length} matches`);
    result.key_topics = opsMatches.map(p => p.source);
    return result;
  }

  // 5. Check customer patterns
  const customerMatches = CUSTOMER_PATTERNS.filter(p => p.test(text));
  if (customerMatches.length >= 1) {
    result.category = 'customer';
    result.confidence_classification = Math.min(0.6 + customerMatches.length * 0.1, 0.95);
    result.reasoning.push(`Customer patterns detected: ${customerMatches.length} matches`);
    result.key_topics = customerMatches.map(p => p.source);
  }

  // 6. Analyze sentiment for additional signals
  if (call.sentiment_results && call.sentiment_results.length > 0) {
    const sentiments = call.sentiment_results;
    const positive = sentiments.filter(s => s.sentiment === 'POSITIVE').length;
    const negative = sentiments.filter(s => s.sentiment === 'NEGATIVE').length;
    const neutral = sentiments.filter(s => s.sentiment === 'NEUTRAL').length;
    const total = sentiments.length;
    
    result.sentiment_summary = {
      positive: Math.round(positive / total * 100),
      negative: Math.round(negative / total * 100),
      neutral: Math.round(neutral / total * 100),
      total_segments: total
    };

    // High negative sentiment might indicate complaint
    if (negative / total > 0.4) {
      result.key_topics.push('high_negative_sentiment');
    }
  }

  // 7. If still no category, use heuristics
  if (!result.category) {
    // Check for common spam phrases that might have been missed
    if (/not interested|no thank|wrong number|don't call/i.test(text)) {
      result.category = 'spam';
      result.confidence_classification = 0.7;
      result.reasoning.push('Rejection language detected - likely spam');
    }
    // Outbound calls are often operations or follow-ups
    else if (call.direction === 'outbound') {
      result.category = 'operations';
      result.confidence_classification = 0.65;
      result.reasoning.push('Outbound call - likely operations or follow-up');
    }
    // Inbound with conversation (2+ speakers, decent length)
    else if (call.speakers >= 2 && call.duration > 30) {
      result.category = 'customer';
      result.confidence_classification = 0.6;
      result.reasoning.push('Inbound call with conversation - likely customer');
    }
    // Single speaker inbound with text - might be voicemail or inquiry
    else if (call.speakers === 1 && call.direction === 'inbound' && text.length > 50) {
      result.category = 'customer';
      result.confidence_classification = 0.5;
      result.reasoning.push('Inbound with single speaker - possible voicemail/inquiry');
    }
    // Default to incomplete if unclear
    else {
      result.category = 'incomplete';
      result.confidence_classification = 0.5;
      result.reasoning.push('Unable to determine category with confidence');
    }
  }

  return result;
}

// Process all calls
console.log('Classifying calls...');
const results = calls.map(classifyCall);

// Calculate stats
const stats = {
  total: results.length,
  by_category: {},
  by_direction: {},
  avg_confidence: {},
  with_assemblyai: results.filter(r => r.has_assemblyai).length,
  with_recording: results.filter(r => r.has_recording).length
};

['customer', 'spam', 'operations', 'incomplete'].forEach(cat => {
  const inCat = results.filter(r => r.category === cat);
  stats.by_category[cat] = inCat.length;
  stats.avg_confidence[cat] = inCat.length > 0 
    ? (inCat.reduce((s, r) => s + r.confidence_classification, 0) / inCat.length).toFixed(3)
    : 0;
});

['inbound', 'outbound'].forEach(dir => {
  stats.by_direction[dir] = results.filter(r => r.direction === dir).length;
});

// Output
const output = {
  generated_at: new Date().toISOString(),
  stats,
  calls: results
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

console.log('\n=== Classification Complete ===');
console.log('Total:', stats.total);
console.log('\nBy Category:');
Object.entries(stats.by_category).forEach(([cat, count]) => {
  const pct = (count / stats.total * 100).toFixed(1);
  console.log(`  ${cat}: ${count} (${pct}%) - avg confidence: ${stats.avg_confidence[cat]}`);
});
console.log('\nBy Direction:');
Object.entries(stats.by_direction).forEach(([dir, count]) => {
  console.log(`  ${dir}: ${count}`);
});
console.log(`\nSaved to ${OUTPUT_FILE}`);
