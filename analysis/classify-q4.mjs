#!/usr/bin/env node
/**
 * Q4 2025 Call Classification Pipeline
 * 
 * Categories:
 * - customer: Real customer inquiry (quote request, scheduling, questions about services)
 * - spam: Spam/robocalls/solicitation  
 * - operations: Internal/vendor/employee calls
 * - other_inquiry: General questions, out of service area, curious callers
 * - incomplete: No recording, too short, or unclear to classify
 */

import fs from 'fs';

const INPUT_FILE = '../data/q4-calls-merged.json';
const OUTPUT_FILE = './q4-results.json';

// Load calls
const calls = JSON.parse(fs.readFileSync(INPUT_FILE));
console.log(`Loaded ${calls.length} calls`);

// Spam indicators - refined patterns
const SPAM_PATTERNS = [
  /warranty/i, /vehicle warranty/i, /car warranty/i,
  /medicare/i, /medicaid/i, /health insurance/i,
  /credit card (rate|interest|debt|offer)/i, /lower your (rate|interest|payment)/i, /interest rate/i,
  /solar panel/i, /solar energy/i,
  /press (one|1|two|2|9)/i, /press \d to/i, /press \d or call/i,
  /this is not a sales call/i,
  /business listing/i, /google listing/i, /google voice search/i, /google search/i, /yelp/i,
  /listing.*(not verified|suspended|missing|doesn't stop)/i,
  /(not|doesn't).*(verified|showing|properly)/i,
  /keeping.*(customers|clients).*from finding/i,
  /verify your (google|listing|business)/i,
  /final notice/i, /last chance/i, /act now/i,
  /automated|this is a recorded/i,
  /insurance agent/i, /life insurance/i,
  /refinance/i, /mortgage rate/i,
  /won a|winner|congratulations/i,
  /political|campaign|vote for/i,
  /subscription|renew your/i,
  /donation|charity|nonprofit/i,
  /merchant service/i, /payment processing/i,
  /honors account|reward points|points in your/i,
  /business opportunity/i, /work from home/i,
  /SEO service|search engine|ranking/i,
  /limited time/i, /special offer/i,
  /we'?re? calling (about|regarding|from)/i,
  // Home services spam (other contractors soliciting)
  /roofing (company|service|inspection)|roof (inspection|replacement)/i,
  /hvac (company|service)|air condition(ing)? (company|service)/i,
  /pest control/i,
  /gutter (clean|service)/i,
  /lawn (care|service)/i,
  // Financial spam
  /line of credit/i,
  /small business (lending|loan)/i,
  /business (loan|funding|financing)/i,
  /accounts (receivable|payable)/i,
  /merchant (cash|advance)/i,
  /working capital/i,
  /SBA loan/i,
  /united eagle/i,
  // Telemarketing signals
  /following up.*(message|call|email|hiring|sales)/i,
  /updated your (file|record)/i,
  /calling to speak to the (person|owner|manager)/i,
  /handles (accounts|purchasing|marketing)/i,
  /speak (with|to) the (business |)(owner|manager|person in charge|ceo|cfo)/i,
  /is the (business |)(owner|manager|ceo) (available|there|in)/i,
  /ask (for |to speak (to |with ))(the |)(ceo|owner|manager)/i,
  /who handles (your|the) (marketing|advertising|website)/i,
  // Company name + service pattern (telemarketers)
  /from (intuit|quickbooks)/i,
  /quickbooks services/i,
  /security (company|service|system)/i,
  /alarm (company|service|system)/i,
  /we'?ve been helping (companies|businesses)/i,
  /this is .* (security|lending|marketing|insurance)/i,
  /calling from .* (security|services|solutions|group)/i,
  // Software/SaaS sales
  /house\s?call\s?pro/i,
  /service titan/i,
  /jobber/i,
  /salesforce/i,
  /paygration/i,
  /quickbooks.*(integration|solution)/i,
  // More listing spam
  /emg listing/i,
  /will remove you from/i,
  /opt.?out/i,
  // Lead gen / marketing spam
  /filling your pipeline/i,
  /qualified (lead|prospect|appointment)/i,
  /growth and operations/i,
  // Training/workshop spam  
  /aspire institute/i,
  /business management workshop/i,
  /workshop|seminar|training.*business/i,
  /free (webinar|workshop|training)/i,
  // PR/Marketing spam
  /newswire/i,
  /press release/i,
  // Financial/investment spam
  /capital advisor/i,
  /managing principal/i,
  /investment (firm|company|advisor)/i,
  /partners and .* capital/i,
  // Generic spam signals
  /reach me (directly |)at \d{3}.\d{3}/i,
  /you can reach me/i,
  /go over your options/i,
  /confirm the details/i,
  // Test calls
  /test call/i,
  /technical support.*test/i,
  // Sales reps
  /i('m| am) a sales rep/i,
  /work for a distributor/i,
  /have you heard of us/i,
  // More telemarketing signals
  /authorized representative/i,
  /digital activation/i,
  /google voice clients/i,
  /trouble finding you/i,
  /prevent.*(customers|clients).*finding/i,
  /google funding/i,
  /prank orbit/i,
  /pro directory/i,
  /department calling about/i,
  /press (0|zero|nine|9) (now|immediately|so)/i,
  /speaking (with|to) the (business |)(owner|manager)/i,
  /is this the (business |)(owner|manager)/i,
  /for the business owner/i,
  /owner of rhino/i,
  /this is business list/i,
  /can prevent customers/i,
  /optimized online/i,
  /status of your listing/i,
  /properly verified/i,
  /this can provide/i
];

// Operations indicators (internal/vendor calls) - must be clearly internal
const OPERATIONS_PATTERNS = [
  /delivery.*(your|the) (order|material)/i,
  /dropped off.*(material|load|concrete)/i,
  /schedule.*(pickup|delivery)/i,
  /this is .* (supply|materials|lumber|ready mix)/i,
  /calling from .* (supply|depot|lowes|materials)/i,
  /employee|worker|crew|foreman/i,
  /phone sale|pro desk/i,
  /collect delivery instructions/i,
  /drivers? making deliveries/i,
  /logistics/i,
  /dispatcher/i,
  /(concord|oakland|sf) home depot/i,
  /floor and decor/i,
  /west\s?side building material/i,
  // City/permit calls
  /city of (oakland|berkeley|fremont|hayward|lafayette)/i,
  /regarding.*(permit|inspection)/i,
  /building (department|permit|inspection)/i,
  /(encroachment|construction) (permit|sector)/i,
  // Internal communication - crew coordination
  /our group (tab|chat)/i,
  /did you see the (video|message)/i,
  /group chat/i,
  /forward(ed)? (it |the pictures? |)to (you|our|the)/i,
  /shy (sent|wanted|asked|said)/i,
  /go check.*no problem/i,
  /i('ll| will) go check/i,
  /wanted (to get |)your help/i
];

// Other inquiry indicators - not spam, not customer, but legitimate calls
const OTHER_INQUIRY_PATTERNS = [
  // Out of service area
  /where are you (guys |)(located|based)/i,
  /what (area|city|cities) do you (cover|serve|work)/i,
  /do you (work|service|cover) (in |)(forestville|santa rosa|napa|marin|sacramento)/i,
  /that's (too far|far away|outside)/i,
  /we're in the bay area.*but/i,
  // Questions about signs/job sites
  /your (guys |)(sign|name) on it/i,
  /doesn't look like.*been worked on/i,
  /wondering about the property/i,
  /asking about.*sign/i,
  // General questions (not service requests)
  /just (calling|wondering|curious)/i,
  /what (kind of|type of) (work|company)/i,
  /are you (guys |)still (in business|working|open)/i
];

// Customer indicators - concrete/construction specific
const CUSTOMER_PATTERNS = [
  /quote|estimate|bid/i,
  /(how much|what).*(cost|charge|price)/i,
  /looking (for|to get) (a |an )?(quote|estimate)/i,
  /concrete|cement/i,
  /foundation|slab|footing/i,
  /driveway|patio|sidewalk|walkway/i,
  /pool deck|stamped/i,
  /remodel|renovation|repair/i,
  /bathroom|kitchen|garage|basement/i,
  /need.*(work|done|help|someone)/i,
  /looking (for|to).*(replace|install|fix|build)/i,
  /address is|located (at|in)/i,
  /square (foot|feet|ft)/i,
  /pour|pouring/i,
  /demolition|demo|tear out|remove/i,
  // Window/door work (Rhino does this too)
  /replace.*(window|door|screen)/i,
  /(window|door|screen).*(replace|repair)/i,
  // Specific customer language
  /do you (guys |)do/i,
  /do you (guys |)work (in|on)/i,
  /can you (come|send|help)/i,
  /i('m| am) (looking|calling|interested)/i,
  /my (house|home|property|backyard)/i
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
    customer_state: call.customer_state,
    answered: call.answered,
    voicemail: call.voicemail,
    source: call.source,
    has_recording: call.has_recording,
    has_assemblyai: call.has_assemblyai,
    confidence_transcription: call.confidence,
    speakers: call.speakers,
    // Classification results
    category: null,
    confidence: null,
    reasoning: [],
    key_topics: [],
    transcript_preview: null,
    incomplete_reason: null
  };

  const text = call.assemblyai_text || '';
  const textLower = text.toLowerCase();
  result.transcript_preview = text.substring(0, 300);

  // === INCOMPLETE CHECKS (first priority) ===
  
  // 1. No recording at all
  if (!call.has_recording) {
    result.category = 'incomplete';
    result.confidence = 0.95;
    result.incomplete_reason = 'no_recording';
    result.reasoning.push('No recording available');
    return result;
  }

  // 2. No transcript (transcription failed)
  if (!call.has_assemblyai || !text || text.trim().length < 10) {
    result.category = 'incomplete';
    result.confidence = 0.9;
    result.incomplete_reason = 'transcription_failed';
    result.reasoning.push('No transcript or transcription failed');
    return result;
  }

  // 3. Very short - but check content first
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 5) {
    result.category = 'incomplete';
    result.confidence = 0.85;
    result.incomplete_reason = 'too_short';
    result.reasoning.push(`Very short transcript: ${wordCount} words`);
    return result;
  }

  // === JOB SEEKERS (not customer, not spam) ===
  if (/are you (guys |)(hiring|looking for workers)/i.test(text) ||
      /looking for (work|a job|employment)/i.test(text) ||
      /any (job|work|position) (opening|available)/i.test(text)) {
    result.category = 'incomplete';
    result.confidence = 0.8;
    result.incomplete_reason = 'job_inquiry';
    result.reasoning.push('Job seeker inquiry - not a customer');
    return result;
  }

  // === SPAM DETECTION ===
  const spamMatches = SPAM_PATTERNS.filter(p => p.test(text));
  
  // Strong spam signals
  if (spamMatches.length >= 2) {
    result.category = 'spam';
    result.confidence = Math.min(0.75 + spamMatches.length * 0.05, 0.95);
    result.reasoning.push(`Multiple spam patterns: ${spamMatches.length} matches`);
    result.key_topics = spamMatches.slice(0, 5).map(p => p.source.replace(/[\/\\^$]/g, ''));
    return result;
  }

  // Single spam match - need to verify it's not a false positive
  if (spamMatches.length === 1) {
    // If customer patterns also match, it's probably not spam
    const customerMatches = CUSTOMER_PATTERNS.filter(p => p.test(text));
    if (customerMatches.length === 0) {
      result.category = 'spam';
      result.confidence = 0.7;
      result.reasoning.push(`Spam pattern detected: ${spamMatches[0].source}`);
      return result;
    }
  }

  // === OPERATIONS DETECTION ===
  const opsMatches = OPERATIONS_PATTERNS.filter(p => p.test(text));
  
  // Need 2+ matches to be confident it's operations
  if (opsMatches.length >= 2) {
    result.category = 'operations';
    result.confidence = Math.min(0.7 + opsMatches.length * 0.08, 0.92);
    result.reasoning.push(`Operations patterns: ${opsMatches.length} matches`);
    result.key_topics = opsMatches.slice(0, 3).map(p => p.source.replace(/[\/\\^$]/g, ''));
    return result;
  }

  // === OTHER INQUIRY DETECTION (before customer) ===
  const otherMatches = OTHER_INQUIRY_PATTERNS.filter(p => p.test(text));
  
  if (otherMatches.length >= 1) {
    result.category = 'other_inquiry';
    result.confidence = Math.min(0.65 + otherMatches.length * 0.1, 0.9);
    result.reasoning.push(`Other inquiry patterns: ${otherMatches.length} matches`);
    result.key_topics = otherMatches.slice(0, 3).map(p => p.source.replace(/[\/\\^$]/g, ''));
    return result;
  }

  // === CUSTOMER DETECTION ===
  const customerMatches = CUSTOMER_PATTERNS.filter(p => p.test(text));
  
  if (customerMatches.length >= 1) {
    // Double check it's not an other_inquiry that also mentions service terms
    if (otherMatches.length === 0) {
      result.category = 'customer';
      result.confidence = Math.min(0.65 + customerMatches.length * 0.08, 0.95);
      result.reasoning.push(`Customer patterns: ${customerMatches.length} matches`);
      result.key_topics = customerMatches.slice(0, 5).map(p => p.source.replace(/[\/\\^$]/g, ''));
      return result;
    }
  }

  // === HEURISTIC FALLBACKS ===
  
  // Rejection language often means spam call they rejected
  if (/not interested|no thank|wrong number|don't call|stop calling/i.test(text)) {
    result.category = 'spam';
    result.confidence = 0.7;
    result.reasoning.push('Rejection language detected - likely unwanted call');
    return result;
  }

  // Outbound calls are typically operations or follow-ups
  if (call.direction === 'outbound') {
    result.category = 'operations';
    result.confidence = 0.6;
    result.reasoning.push('Outbound call - likely operations/follow-up');
    return result;
  }

  // Voicemail from inbound is often a customer
  if (call.voicemail && call.direction === 'inbound') {
    // Check if it has any meaningful content
    if (wordCount > 10) {
      result.category = 'customer';
      result.confidence = 0.55;
      result.reasoning.push('Inbound voicemail with content - likely customer');
      return result;
    }
  }

  // Inbound with 2+ speakers and decent length - but need more evidence
  // Only classify as customer if there's actual service discussion
  if (call.direction === 'inbound' && call.speakers >= 2 && call.duration > 60) {
    // Check for any indication of service discussion
    if (/project|quote|estimate|work|address|property|house|home/i.test(text)) {
      result.category = 'customer';
      result.confidence = 0.55;
      result.reasoning.push('Inbound conversation with service discussion');
      return result;
    }
  }

  // Default: unclear content
  result.category = 'incomplete';
  result.confidence = 0.5;
  result.incomplete_reason = 'unclear_content';
  result.reasoning.push('Unable to classify with confidence');
  return result;
}

// Process all calls
console.log('Classifying calls...');
const results = calls.map(classifyCall);

// Calculate detailed stats
const stats = {
  total: results.length,
  by_category: {},
  by_direction: {},
  avg_confidence: {},
  incomplete_reasons: {},
  with_recording: results.filter(r => r.has_recording).length,
  with_transcript: results.filter(r => r.has_assemblyai).length
};

['customer', 'spam', 'operations', 'other_inquiry', 'incomplete'].forEach(cat => {
  const inCat = results.filter(r => r.category === cat);
  stats.by_category[cat] = inCat.length;
  stats.avg_confidence[cat] = inCat.length > 0 
    ? (inCat.reduce((s, r) => s + r.confidence, 0) / inCat.length).toFixed(3)
    : 0;
});

['inbound', 'outbound'].forEach(dir => {
  stats.by_direction[dir] = results.filter(r => r.direction === dir).length;
});

// Incomplete breakdown
results.filter(r => r.category === 'incomplete').forEach(r => {
  const reason = r.incomplete_reason || 'unknown';
  stats.incomplete_reasons[reason] = (stats.incomplete_reasons[reason] || 0) + 1;
});

// Output
const output = {
  generated_at: new Date().toISOString(),
  period: 'Q4 2025 (Oct-Dec)',
  stats,
  calls: results
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

console.log('\n=== Q4 2025 Classification Complete ===');
console.log('Total:', stats.total);
console.log('\nBy Category:');
Object.entries(stats.by_category).forEach(([cat, count]) => {
  const pct = (count / stats.total * 100).toFixed(1);
  console.log(`  ${cat}: ${count} (${pct}%) - avg confidence: ${stats.avg_confidence[cat]}`);
});
console.log('\nIncomplete Breakdown:');
Object.entries(stats.incomplete_reasons).forEach(([reason, count]) => {
  console.log(`  ${reason}: ${count}`);
});
console.log('\nBy Direction:');
Object.entries(stats.by_direction).forEach(([dir, count]) => {
  console.log(`  ${dir}: ${count}`);
});
console.log(`\nSaved to ${OUTPUT_FILE}`);
