#!/usr/bin/env node
/**
 * AI-Powered Call Analyzer
 * Analyzes call transcripts with confidence scoring
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CALLS_DIR = './data-full/calls';

// Load pre-classified transcripts
const fullAnalysis = JSON.parse(readFileSync('./data-full/full-analysis.json', 'utf8'));

// Build transcript map from pre-classified data
const transcriptMap = new Map();
const preclassified = new Map();

for (const [category, calls] of Object.entries(fullAnalysis)) {
  if (!Array.isArray(calls)) continue;
  for (const call of calls) {
    if (call.id) {
      transcriptMap.set(call.id, call.transcript || '');
      preclassified.set(call.id, { 
        category, 
        city: call.city,
        phone: call.phone,
        company: call.company 
      });
    }
  }
}

console.log(`Loaded ${transcriptMap.size} transcripts from pre-analysis\n`);

// Classification rules with confidence weights
const CLASSIFICATION_RULES = {
  SPAM: {
    highConfidence: [ // 90%+
      /google.*business.*listing/i,
      /press\s*[1-9].*to\s*(speak|connect|opt)/i,
      /suspension.*verification/i,
      /flagged.*for.*review/i,
      /authorized.*representative/i,
      /this\s+is\s+an?\s+important\s+message.*google/i,
      /opt\s*out.*press/i,
    ],
    mediumConfidence: [ // 75-89%
      /SEO|search\s*engine\s*optimization/i,
      /marketing\s*services/i,
      /cold\s*call/i,
      /taking\s*on\s*new\s*clients/i,
      /leads?\s*(for|generation)/i,
      /cost\s*estimation\s*company/i,
      /referral.*brick/i,
    ],
    lowConfidence: [ // 60-74%
      /sales\s*(team|rep)/i,
      /business\s*opportunity/i,
      /partnership/i,
    ]
  },
  CUSTOMER: {
    highConfidence: [ // 90%+
      /concrete|foundation|slab|driveway|patio/i,
      /estimate.*project|project.*estimate/i,
      /schedule.*appointment|appointment.*schedule/i,
      /ADU|accessory\s*dwelling/i,
      /garage\s*conversion/i,
      /remodel.*(kitchen|bathroom|house)/i,
    ],
    mediumConfidence: [ // 75-89%
      /quote|bid|pricing/i,
      /drainage|waterproof|basement|moisture/i,
      /siding|window|exterior/i,
      /repair|fix|damage/i,
      /square\s*feet|sq\s*ft/i,
    ],
    lowConfidence: [ // 60-74%
      /looking\s*for.*help/i,
      /need.*work\s*done/i,
      /project/i,
    ]
  },
  OPERATIONS: {
    highConfidence: [ // 90%+
      /home\s*depot|lowe'?s|supplier/i,
      /permit|inspection|license/i,
      /subcontractor|contractor\s*looking/i,
      /material\s*order|delivery/i,
      /invoice|payment|credit\s*card/i,
    ],
    mediumConfidence: [ // 75-89%
      /appointment\s*(confirm|check)/i,
      /schedule\s*(change|update)/i,
      /vendor|supplier/i,
      /job\s*site/i,
    ],
    lowConfidence: [ // 60-74%
      /calling\s*back/i,
      /follow\s*up/i,
    ]
  },
  NOT_FIT: {
    highConfidence: [ // 90%+
      /don'?t\s*service.*area/i,
      /outside.*service\s*area/i,
      /too\s*far/i,
      /not\s*in.*area/i,
    ],
    mediumConfidence: [ // 75-89%
      /santa\s*rosa|napa|sacramento/i, // Outside Bay Area
      /we\s*don'?t\s*do\s*that/i,
    ]
  },
  SYSTEM: {
    highConfidence: [ // 95%+
      /^please\s*hold.*next\s*available\s*agent/i,
      /^rhino\s*builders.*please\s*hold/i,
      /unable\s*to\s*take\s*your\s*call.*leave.*message/i,
      /test\s*call.*ringcentral/i,
      /callrail.*discontinuing/i,
    ]
  }
};

// Map pre-classification categories to our categories
const CATEGORY_MAP = {
  'customers': 'CUSTOMER',
  'spam': 'SPAM',
  'shortSpam': 'SPAM',
  'internal': 'OPERATIONS',
  'vendors': 'OPERATIONS',
  'outbound': 'OUTBOUND',
  'unanswered': 'INCOMPLETE',
  'shortUnknown': 'INCOMPLETE',
};

function classifyCall(transcript, duration, answered, voicemail, direction, preclass) {
  // Use pre-classification if available
  if (preclass && CATEGORY_MAP[preclass.category]) {
    const category = CATEGORY_MAP[preclass.category];
    let confidence = 85;
    let reason = `Pre-classified as ${preclass.category}`;
    
    // Boost confidence if transcript matches patterns
    if (transcript && transcript.length > 100) {
      for (const rules of Object.values(CLASSIFICATION_RULES)) {
        if (rules.highConfidence) {
          for (const pattern of rules.highConfidence) {
            if (pattern.test(transcript)) {
              confidence = Math.min(98, confidence + 10);
              reason = 'Pre-classified + pattern match';
              break;
            }
          }
        }
      }
    }
    
    return { category, confidence, reason };
  }

  if (!transcript || transcript.trim().length === 0) {
    if (!answered) {
      return { category: 'INCOMPLETE', confidence: 95, reason: 'Missed call - no voicemail' };
    }
    return { category: 'INCOMPLETE', confidence: 90, reason: 'No transcript available' };
  }

  const text = transcript.trim();
  
  // Very short transcripts
  if (text.length < 30) {
    return { category: 'INCOMPLETE', confidence: 85, reason: 'Too brief to classify' };
  }

  // Check SYSTEM first (IVR messages)
  for (const pattern of CLASSIFICATION_RULES.SYSTEM.highConfidence) {
    if (pattern.test(text)) {
      return { category: 'SYSTEM', confidence: 95, reason: 'IVR/System message' };
    }
  }

  // Check each category
  for (const [category, rules] of Object.entries(CLASSIFICATION_RULES)) {
    if (category === 'SYSTEM') continue;
    
    // High confidence patterns
    if (rules.highConfidence) {
      for (const pattern of rules.highConfidence) {
        if (pattern.test(text)) {
          return { 
            category, 
            confidence: 92 + Math.min(5, Math.floor(text.length / 200)), 
            reason: `Strong ${category.toLowerCase()} indicators` 
          };
        }
      }
    }
    
    // Medium confidence patterns
    if (rules.mediumConfidence) {
      for (const pattern of rules.mediumConfidence) {
        if (pattern.test(text)) {
          return { 
            category, 
            confidence: 78 + Math.min(8, Math.floor(text.length / 300)), 
            reason: `${category.toLowerCase()} pattern match` 
          };
        }
      }
    }
  }

  // Check for low confidence patterns
  for (const [category, rules] of Object.entries(CLASSIFICATION_RULES)) {
    if (rules.lowConfidence) {
      for (const pattern of rules.lowConfidence) {
        if (pattern.test(text)) {
          return { 
            category, 
            confidence: 65 + Math.min(10, Math.floor(text.length / 400)), 
            reason: `Weak ${category.toLowerCase()} indicators` 
          };
        }
      }
    }
  }

  // Conversation analysis
  if (text.length > 300) {
    // Long conversations are usually real interactions
    if (/address|email|phone|call.*back|schedule/i.test(text)) {
      return { category: 'CUSTOMER', confidence: 70, reason: 'Appears to be customer inquiry' };
    }
  }

  // Default: incomplete/unclear
  return { 
    category: 'INCOMPLETE', 
    confidence: 50, 
    reason: 'Unable to classify with confidence' 
  };
}

function analyzeSentiment(transcript) {
  if (!transcript || transcript.length < 20) {
    return { sentiment: 'neutral', score: 0 };
  }

  const positive = /thank|great|perfect|appreciate|excellent|wonderful|happy|good/gi;
  const negative = /sorry|problem|issue|frustrated|disappointed|angry|wrong|bad/gi;

  const posMatches = (transcript.match(positive) || []).length;
  const negMatches = (transcript.match(negative) || []).length;

  const total = posMatches + negMatches;
  if (total === 0) return { sentiment: 'neutral', score: 0 };

  const score = (posMatches - negMatches) / total;
  
  if (score > 0.3) return { sentiment: 'positive', score: Math.round(score * 100) };
  if (score < -0.3) return { sentiment: 'negative', score: Math.round(score * 100) };
  return { sentiment: 'neutral', score: Math.round(score * 100) };
}

function extractKeyTopics(transcript) {
  if (!transcript || transcript.length < 50) return [];

  const topics = [];
  const patterns = {
    'Concrete Work': /concrete|slab|foundation|driveway|patio|sidewalk/i,
    'Remodeling': /remodel|renovation|kitchen|bathroom/i,
    'ADU/Addition': /ADU|addition|garage\s*conversion|accessory/i,
    'Drainage': /drainage|waterproof|moisture|leak|basement/i,
    'Exterior': /siding|window|roofing|exterior/i,
    'Estimate Request': /estimate|quote|bid|pricing/i,
    'Appointment': /schedule|appointment|visit|come\s*out/i,
    'Permit': /permit|inspection|license|code/i,
  };

  for (const [topic, pattern] of Object.entries(patterns)) {
    if (pattern.test(transcript)) {
      topics.push(topic);
    }
  }

  return topics.slice(0, 3); // Max 3 topics
}

// Main processing
console.log('🔍 Analyzing calls...\n');

const files = readdirSync(CALLS_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} call files\n`);

const results = [];
const stats = {
  total: 0,
  byCategory: {},
  byConfidence: { high: 0, medium: 0, low: 0 },
  withRecording: 0,
  withTranscript: 0,
};

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(CALLS_DIR, file), 'utf8'));
  
  // Get transcript from pre-analysis or raw data
  const transcript = transcriptMap.get(raw.id) || raw.conversation_summary || '';
  const preclass = preclassified.get(raw.id);
  
  const { category, confidence, reason } = classifyCall(
    transcript,
    raw.duration,
    raw.answered,
    raw.voicemail,
    raw.direction,
    preclass
  );

  const sentiment = analyzeSentiment(transcript);
  const topics = extractKeyTopics(transcript);

  const call = {
    id: raw.id,
    phone: preclass?.phone || raw.customer_phone_number || raw.formatted_phone_number || 'Unknown',
    city: preclass?.city || raw.customer_city || raw.caller_city || 'Unknown',
    state: raw.customer_state || '',
    direction: raw.direction,
    answered: raw.answered || false,
    voicemail: raw.voicemail || false,
    duration: raw.duration || 0,
    timestamp: raw.start_time,
    
    // Transcript & Recording
    transcript: transcript,
    hasTranscript: transcript.length > 0,
    recording_url: raw.recording_player || null,
    hasRecording: !!raw.recording_player,
    
    // Classification
    category: raw.direction === 'outbound' ? 'OUTBOUND' : category,
    confidence: raw.direction === 'outbound' ? 95 : confidence,
    confidenceLevel: confidence >= 85 ? 'high' : confidence >= 70 ? 'medium' : 'low',
    classificationReason: raw.direction === 'outbound' ? 'Outbound call' : reason,
    
    // Analysis
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    topics: topics,
    
    // Source info
    source: raw.source || null,
    trackingNumber: raw.tracking_phone_number || null,
  };

  results.push(call);

  // Update stats
  stats.total++;
  const cat = call.category;
  stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  
  if (call.confidence >= 85) stats.byConfidence.high++;
  else if (call.confidence >= 70) stats.byConfidence.medium++;
  else stats.byConfidence.low++;
  
  if (call.hasRecording) stats.withRecording++;
  if (call.hasTranscript) stats.withTranscript++;
}

// Sort by timestamp (newest first)
results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// Calculate additional stats
stats.inbound = results.filter(c => c.direction === 'inbound').length;
stats.outbound = results.filter(c => c.direction === 'outbound').length;
stats.customers = (stats.byCategory.CUSTOMER || 0) + (stats.byCategory.NOT_FIT || 0);
stats.spam = stats.byCategory.SPAM || 0;
stats.spamRate = ((stats.spam / stats.inbound) * 100).toFixed(1);

// Missed customers (calls that were missed and classified as customer)
const missedCustomers = results.filter(c => 
  c.category === 'CUSTOMER' && !c.answered
);
stats.missedCustomerLeads = missedCustomers.length;

// Output
const output = {
  generatedAt: new Date().toISOString(),
  summary: stats,
  calls: results,
};

writeFileSync('./analyzed-calls.json', JSON.stringify(output, null, 2));

console.log('📊 Analysis Complete!\n');
console.log('Summary:');
console.log(`  Total Calls: ${stats.total}`);
console.log(`  Inbound: ${stats.inbound} | Outbound: ${stats.outbound}`);
console.log(`  With Recording: ${stats.withRecording}`);
console.log(`  With Transcript: ${stats.withTranscript}`);
console.log('');
console.log('Classification:');
for (const [cat, count] of Object.entries(stats.byCategory).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}
console.log('');
console.log('Confidence Distribution:');
console.log(`  🟢 High (85%+): ${stats.byConfidence.high}`);
console.log(`  🟡 Medium (70-84%): ${stats.byConfidence.medium}`);
console.log(`  🔴 Low (<70%): ${stats.byConfidence.low}`);
console.log('');
console.log(`⚠️  Spam Rate: ${stats.spamRate}%`);
console.log(`🚨 Missed Customer Leads: ${stats.missedCustomerLeads}`);
console.log('');
console.log('✅ Results saved to analyzed-calls.json');
