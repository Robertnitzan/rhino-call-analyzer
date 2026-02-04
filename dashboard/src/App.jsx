import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// Icons
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
)

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
)

const VoicemailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5.5" cy="11.5" r="4.5"/>
    <circle cx="18.5" cy="11.5" r="4.5"/>
    <line x1="5.5" y1="16" x2="18.5" y2="16"/>
  </svg>
)

const MissedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/>
    <path d="M5 12.55a10.94 10.94 0 015.17-2.39"/>
  </svg>
)

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)

// Category badge
function CategoryBadge({ category }) {
  const labels = {
    customer: 'Customer',
    spam: 'Spam',
    operations: 'Operations',
    other_inquiry: 'Not Relevant',
    incomplete: 'Incomplete',
    not_fit: 'Not Fit',
    system: 'System',
    outbound: 'Outbound'
  }
  return (
    <span className={`badge badge-${category}`}>
      {labels[category] || category}
    </span>
  )
}

// Answer status badge
function AnswerBadge({ answered, voicemail }) {
  if (voicemail) {
    return (
      <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
        <VoicemailIcon /> Voicemail
      </span>
    )
  }
  if (answered === false) {
    return (
      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
        <MissedIcon /> Missed
      </span>
    )
  }
  return (
    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
      <PhoneIcon /> Answered
    </span>
  )
}

// Incomplete reason
function IncompleteReason({ reason }) {
  const labels = {
    no_recording: 'No recording',
    too_short: 'Too short',
    transcription_failed: 'Transcription failed',
    unclear_content: 'Unclear content'
  }
  return <span className="text-muted" style={{ fontSize: '11px' }}>{labels[reason] || reason}</span>
}

// Confidence display
function Confidence({ value }) {
  if (!value) return <span className="text-muted">-</span>
  const pct = Math.round(value * 100)
  const level = pct >= 85 ? 'high' : pct >= 70 ? 'medium' : 'low'
  return (
    <span className={`confidence confidence-${level}`}>
      {pct}%
    </span>
  )
}

// Sentiment bar
function SentimentBar({ sentiment }) {
  if (!sentiment) return <span className="text-muted">-</span>
  const { positive, negative, neutral } = sentiment
  return (
    <div className="sentiment-bar" title={`Positive: ${positive}% | Negative: ${negative}% | Neutral: ${neutral}%`}>
      <div className="sentiment-positive" style={{ width: `${positive}%` }} />
      <div className="sentiment-negative" style={{ width: `${negative}%` }} />
      <div className="sentiment-neutral" style={{ width: `${neutral}%` }} />
    </div>
  )
}

// Audio link button (opens in CallRail)
function AudioLink({ url }) {
  if (!url) return <span className="text-muted">-</span>

  const openRecording = (e) => {
    e.stopPropagation()
    window.open(url, '_blank')
  }

  return (
    <button className="audio-btn" onClick={openRecording} title="Open recording in CallRail">
      <PlayIcon />
    </button>
  )
}

// Stats card
function StatCard({ label, value, subtext, color, onClick }) {
  return (
    <div 
      className="stat-card" 
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  )
}

// Call detail modal
function CallModal({ call, onClose }) {
  if (!call) return null

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US') + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Call Details</h3>
            <div className="text-muted font-mono" style={{ fontSize: '12px', marginTop: '4px' }}>
              {call.id}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          {/* Recording Link */}
          {call.recording_url && (
            <div style={{ marginBottom: '24px' }}>
              <div className="stat-label" style={{ marginBottom: '8px' }}>Recording</div>
              <a
                href={call.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                <PlayIcon /> Open Recording in CallRail
              </a>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div className="stat-label">Category</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CategoryBadge category={call.category} />
                {call.incomplete_reason && <IncompleteReason reason={call.incomplete_reason} />}
              </div>
            </div>
            <div>
              <div className="stat-label">Status</div>
              <AnswerBadge answered={call.answered} voicemail={call.voicemail} />
            </div>
            <div>
              <div className="stat-label">Classification Confidence</div>
              <Confidence value={call.confidence_classification} />
            </div>
            <div>
              <div className="stat-label">Transcription Confidence</div>
              <Confidence value={call.confidence_transcription} />
            </div>
            <div>
              <div className="stat-label">Call Duration</div>
              <span className="font-mono">{call.duration}s</span>
              <span className="text-muted" style={{ fontSize: '11px', marginLeft: '4px' }}>(total)</span>
            </div>
            <div>
              <div className="stat-label">Recording Duration</div>
              <span className="font-mono">{call.recording_duration || '-'}s</span>
              <span className="text-muted" style={{ fontSize: '11px', marginLeft: '4px' }}>(audio only)</span>
            </div>
            <div>
              <div className="stat-label">Date</div>
              <span>{formatDate(call.start_time)}</span>
            </div>
            <div>
              <div className="stat-label">Direction</div>
              <span>{call.direction === 'inbound' ? '← Inbound' : '→ Outbound'}</span>
            </div>
            <div>
              <div className="stat-label">Speakers</div>
              <span>{call.speakers || '-'}</span>
            </div>
            <div>
              <div className="stat-label">Phone</div>
              <span className="font-mono">{call.customer_phone}</span>
            </div>
            <div>
              <div className="stat-label">Location</div>
              <span>{call.customer_city || '-'}</span>
            </div>
          </div>

          {call.sentiment_summary && (
            <div style={{ marginBottom: '24px' }}>
              <div className="stat-label" style={{ marginBottom: '8px' }}>Sentiment</div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <SentimentBar sentiment={call.sentiment_summary} />
                <span style={{ fontSize: '12px' }} className="text-muted">
                  😊 {call.sentiment_summary.positive}% · 😠 {call.sentiment_summary.negative}% · 😐 {call.sentiment_summary.neutral}%
                </span>
              </div>
            </div>
          )}

          {call.reasoning && call.reasoning.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div className="stat-label" style={{ marginBottom: '8px' }}>Classification Reasoning</div>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                {call.reasoning.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {call.notes && (
            <div style={{ marginBottom: '24px' }}>
              <div className="stat-label" style={{ marginBottom: '8px' }}>📝 Summary</div>
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text-primary)'
              }}>
                {call.notes}
              </div>
            </div>
          )}

          <div>
            <div className="stat-label" style={{ marginBottom: '8px' }}>
              Transcript {call.utterances ? `(${call.utterances.length} segments)` : ''}
            </div>
            <div className="transcript-full">
              {call.utterances ? (
                call.utterances.map((u, i) => (
                  <div key={i} className="utterance">
                    <span className="speaker-label">Speaker {u.speaker}:</span>
                    {u.text}
                  </div>
                ))
              ) : (
                call.transcript_full || call.transcript_preview || 'No transcript available'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Insights Tab - Key Findings + Spam Breakdown + Customer Breakdown
function InsightsTab({ stats, calls }) {
  const spamCalls = calls.filter(c => c.category === 'spam')
  const spamDuration = spamCalls.reduce((sum, c) => sum + (c.duration || 0), 0)
  const spamHours = (spamDuration / 3600).toFixed(1)
  
  // Customer breakdown - calculated from notes
  const customerCalls = calls.filter(c => c.category === 'customer')
  const customerBreakdown = {}
  customerCalls.forEach(c => {
    const note = (c.notes || '').toLowerCase()
    if (note.includes('adu') || note.includes('addition') || note.includes('garage conversion')) {
      customerBreakdown['ADU / Room Addition'] = (customerBreakdown['ADU / Room Addition'] || 0) + 1
    } else if (note.includes('concrete') || note.includes('wall') || note.includes('patio')) {
      customerBreakdown['Concrete / Wall Work'] = (customerBreakdown['Concrete / Wall Work'] || 0) + 1
    } else if (note.includes('bathroom') || note.includes('kitchen') || note.includes('remodel')) {
      customerBreakdown['Bathroom / Kitchen'] = (customerBreakdown['Bathroom / Kitchen'] || 0) + 1
    } else if (note.includes('driveway') || note.includes('walkway') || note.includes('sidewalk')) {
      customerBreakdown['Driveway / Walkway'] = (customerBreakdown['Driveway / Walkway'] || 0) + 1
    } else if (note.includes('drain') || note.includes('french drain')) {
      customerBreakdown['Drainage'] = (customerBreakdown['Drainage'] || 0) + 1
    } else if (note.includes('foundation')) {
      customerBreakdown['Foundation'] = (customerBreakdown['Foundation'] || 0) + 1
    } else if (note.includes('window')) {
      customerBreakdown['Window'] = (customerBreakdown['Window'] || 0) + 1
    } else if (note.includes('fire') || note.includes('damage')) {
      customerBreakdown['Fire Damage'] = (customerBreakdown['Fire Damage'] || 0) + 1
    } else if (note.includes('roof')) {
      customerBreakdown['Roofing'] = (customerBreakdown['Roofing'] || 0) + 1
    } else {
      customerBreakdown['Other Inquiry'] = (customerBreakdown['Other Inquiry'] || 0) + 1
    }
  })
  
  const sourceStats = {}
  calls.forEach(c => {
    const src = c.source || 'Unknown'
    if (!sourceStats[src]) sourceStats[src] = { total: 0, customer: 0, spam: 0 }
    sourceStats[src].total++
    if (c.category === 'customer') sourceStats[src].customer++
    if (c.category === 'spam') sourceStats[src].spam++
  })
  
  const topSources = Object.entries(sourceStats)
    .map(([name, data]) => ({ name, ...data, rate: data.total > 10 ? Math.round(data.customer / data.total * 100) : 0 }))
    .filter(s => s.total >= 10)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)

  const spamBreakdown = {
    'Google Listing Scams': spamCalls.filter(c => c.notes?.toLowerCase().includes('google') || c.notes?.toLowerCase().includes('listing')).length,
    'Cold Calls / Sales': spamCalls.filter(c => c.notes?.toLowerCase().includes('sales') || c.notes?.toLowerCase().includes('engineering') || c.notes?.toLowerCase().includes('services')).length,
    'Robocalls (Press 1/0/9)': spamCalls.filter(c => c.notes?.toLowerCase().includes('press') || c.notes?.toLowerCase().includes('robocall')).length,
    'QuickBooks Scams': spamCalls.filter(c => c.notes?.toLowerCase().includes('quickbooks')).length,
    'EMG Listings': spamCalls.filter(c => c.notes?.toLowerCase().includes('emg')).length,
    'Digital Activation': spamCalls.filter(c => c.notes?.toLowerCase().includes('digital activation')).length,
    'Merchant Services': spamCalls.filter(c => c.notes?.toLowerCase().includes('merchant')).length,
    'Business Lending': spamCalls.filter(c => c.notes?.toLowerCase().includes('lending') || c.notes?.toLowerCase().includes('loan')).length,
  }
  const otherSpam = spamCalls.length - Object.values(spamBreakdown).reduce((a, b) => a + b, 0)
  spamBreakdown['Other Spam'] = otherSpam > 0 ? otherSpam : 0

  const incompleteCalls = calls.filter(c => c.category === 'incomplete')
  const incompletePercent = ((incompleteCalls.length / calls.length) * 100).toFixed(0)

  return (
    <div>
      <section className="section">
        <h2 className="section-title">💡 Key Findings</h2>
        
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>⏱️</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Spam is Costing Real Time</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong style={{ color: 'var(--color-spam)' }}>{spamCalls.length} spam calls</strong> consumed approximately 
                <strong style={{ color: 'var(--color-spam)' }}> {spamHours} hours</strong> of phone time.
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>🚨</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Google Listing Scams are the #1 Problem</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong>{spamBreakdown['Google Listing Scams']}</strong> calls were Google listing scams.
                <span style={{ color: 'var(--color-spam)' }}> These are NOT from Google.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>📞</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{incompletePercent}% of Callers Abandon Before Speaking</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong>{incompleteCalls.length} incomplete calls</strong> - possible issues with hold times, IVR, or voicemail length.
              </p>
            </div>
          </div>
        </div>

        {topSources.length > 0 && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>⭐</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Best Performing Phone Lines</h3>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Source</th><th>Total</th><th>Customers</th><th>Rate</th></tr></thead>
                    <tbody>
                      {topSources.map((src, i) => (
                        <tr key={i}>
                          <td>{src.name}</td>
                          <td className="font-mono">{src.total}</td>
                          <td className="font-mono" style={{ color: 'var(--color-customer)' }}>{src.customer}</td>
                          <td className="font-mono" style={{ fontWeight: 600, color: src.rate >= 20 ? 'var(--color-customer)' : 'var(--text-secondary)' }}>{src.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>📍</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Lost Opportunities Outside Service Area</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong>{calls.filter(c => c.category === 'not_fit').length} potential customers</strong> called from areas Rhino doesn't serve.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">🔴 Spam Breakdown ({spamCalls.length} calls)</h2>
        <div className="card">
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(spamBreakdown).filter(([_, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>{type}</span>
                <span className="font-mono" style={{ color: 'var(--color-spam)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">🟢 Customer Breakdown ({customerCalls.length} calls)</h2>
        <div className="card">
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(customerBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>{type}</span>
                <span className="font-mono" style={{ color: 'var(--color-customer)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// Recommendations Tab
function RecommendationsTab() {
  return (
    <div>
      <section className="section">
        <h2 className="section-title">📋 Recommendations</h2>
        
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>⚡ Immediate Actions</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-spam)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>1. Block Known Spam Patterns</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>"Digital activation department" and "EMG listings" calls come from identifiable number pools.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-spam)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>2. Auto-Reject "Press 1" Robocalls</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>CallRail or your phone system can filter these automatically.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-operations)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>3. Shorten Hold Message</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>Consider: <strong>"Rhino Builders, please hold briefly"</strong> (5 seconds max).</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>🎯 Longer Term</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-customer)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>4. Add Service Area to Google Listings</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>Include "Serving Oakland, Berkeley, Lafayette, Orinda, Danville, Walnut Creek, Pleasanton, Livermore"</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-customer)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>5. Track Incomplete Calls</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>Consider a callback system for callers who hang up during hold.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>6. Review Orinda GMB Listing</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>It brings the most leads but also the most spam. May be attracting bot traffic.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ background: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-customer)' }}>📈 Expected Impact</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <li>Reduce spam calls by <strong>40-50%</strong></li>
            <li>Save <strong>1-2 hours per month</strong> of staff time</li>
            <li>Capture <strong>more potential leads</strong></li>
            <li>Eliminate <strong>out-of-area inquiries</strong></li>
          </ul>
        </div>
      </section>
    </div>
  )
}

// Monthly Trends Component
function MonthlyTrends({ calls }) {
  const monthlyData = {}
  calls.forEach(c => {
    const date = new Date(c.start_time)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) monthlyData[key] = { total: 0, spam: 0, customer: 0 }
    monthlyData[key].total++
    if (c.category === 'spam') monthlyData[key].spam++
    if (c.category === 'customer') monthlyData[key].customer++
  })
  
  const months = Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0])).map(([key, data]) => {
    const [year, month] = key.split('-')
    const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return { name: monthName, ...data, spamRate: Math.round(data.spam / data.total * 100) }
  })
  
  return (
    <section className="section">
      <h2 className="section-title">📅 Monthly Trends</h2>
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Month</th><th>Total</th><th>Spam</th><th>Customer</th><th>Spam Rate</th></tr></thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i}>
                  <td className="font-mono">{m.name}</td>
                  <td className="font-mono">{m.total}</td>
                  <td className="font-mono" style={{ color: 'var(--color-spam)' }}>{m.spam}</td>
                  <td className="font-mono" style={{ color: 'var(--color-customer)' }}>{m.customer}</td>
                  <td className="font-mono" style={{ color: m.spamRate > 40 ? 'var(--color-spam)' : 'var(--text-secondary)' }}>{m.spamRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// Methodology Tab with Category Explanations
function MethodologyTab({ stats, calls }) {
  if (!calls || calls.length === 0) {
    return <div className="section"><p>No calls data available</p></div>
  }

  const customerCount = calls.filter(c => c.category === 'customer').length
  const spamCount = calls.filter(c => c.category === 'spam').length
  const opsCount = calls.filter(c => c.category === 'operations').length
  const incompleteCount = calls.filter(c => c.category === 'incomplete').length
  const notFitCount = calls.filter(c => c.category === 'not_fit').length
  const systemCount = calls.filter(c => c.category === 'system').length

  return (
    <div>
      {/* How We Analyzed */}
      <section className="section">
        <h2 className="section-title">📊 How We Analyzed These Calls</h2>
        <div className="card">
          <p className="text-secondary" style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.7 }}>
            Every call was manually reviewed by AI (Claude) reading the actual transcripts from CallRail. Each call received:
          </p>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <li><strong>Full transcript review</strong> — Not keyword matching, but understanding context</li>
            <li><strong>One-sentence summary</strong> — What actually happened on the call</li>
            <li><strong>Category assignment</strong> — Based on caller intent and outcome</li>
          </ol>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Why this approach?</strong> It catches nuances that automated spam detection misses.
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center', padding: '12px', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600 }}>
            Total: {stats.total} calls analyzed individually
          </div>
        </div>
      </section>

      {/* Category Explanations */}
      <section className="section">
        <h2 className="section-title">📁 Category Explanations</h2>
        
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-customer)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-customer)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🟢 CUSTOMER</span><span className="font-mono">{customerCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Real potential clients calling about construction projects. Described specific projects, asked for quotes/site visits, scheduled appointments, or followed up.
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Examples:</strong> "Kelly Kuykendall realtor - driveway regrade quote", "ADU projects Fremont San Jose", "Foundation repair inquiry"
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-spam)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-spam)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔴 SPAM</span><span className="font-mono">{spamCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Telemarketers, scammers, robocalls. Includes Google listing scams, cold calls, "press 1" robocalls, QuickBooks scams, EMG listings, digital activation, merchant services.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-incomplete)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚪ INCOMPLETE</span><span className="font-mono">{incompleteCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
            Couldn't determine caller intent - hung up immediately, hold message only, no voicemail message, or audio issues. Could be customers who gave up, wrong numbers, or disconnected spam.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-operations)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-operations)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔵 OPERATIONS</span><span className="font-mono">{opsCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
            Legitimate business calls that aren't leads: suppliers/materials (Home Depot, Westside Building), permits/city, subcontractors/job seekers, internal coordination.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-not_fit)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-not_fit)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🟠 NOT FIT</span><span className="font-mono">{notFitCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
            Real potential customers Rhino couldn't help - outside service area (Windsor, Santa Rosa, Gilroy, Altadena) or service not offered (mobile home, window repair, drainage cleaning).
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-system)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-system)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🟣 SYSTEM</span><span className="font-mono">{systemCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
            Automated system calls (not spam): Houzz Lead Notifications, test calls, IVR systems. Legitimate but not customer conversations.
          </p>
        </div>
      </section>
    </div>
  )
}

// Password Gate
function PasswordGate({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === 'rhino2026') {
      localStorage.setItem('rhino-auth', 'true')
      onSuccess()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🦏</div>
        <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Rhino</h1>
        <p className="text-muted" style={{ marginBottom: '24px' }}>Call Analysis Dashboard</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="search-input"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: '16px',
              borderColor: error ? 'var(--color-spam)' : undefined
            }}
            autoFocus
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Access Dashboard
          </button>
        </form>
        {error && (
          <p style={{ color: 'var(--color-spam)', marginTop: '12px', fontSize: '13px' }}>
            Incorrect password
          </p>
        )}
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('rhino-auth') === 'true')
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('calls')
  const [filter, setFilter] = useState('all')
  const [answerFilter, setAnswerFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCall, setSelectedCall] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!authenticated) return
    fetch('./data/results.json?v=' + Date.now())
      .then(r => r.json())
      .then(setData)
      .catch(err => console.error('Failed to load data:', err))
  }, [authenticated])

  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />
  }

  if (!data) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="text-muted">Loading data...</div>
      </div>
    )
  }

  const { stats, calls } = data

  // Filter calls
  let filtered = calls
  if (filter === 'customer') {
    // Customers answered (no voicemails)
    filtered = filtered.filter(c => c.category === 'customer' && !c.voicemail)
  } else if (filter === 'customer_voicemail') {
    // Customer voicemails only
    filtered = filtered.filter(c => c.category === 'customer' && c.voicemail)
  } else if (filter !== 'all') {
    filtered = filtered.filter(c => c.category === filter)
  }
  if (dateFrom) {
    const fromDate = new Date(dateFrom)
    filtered = filtered.filter(c => new Date(c.start_time) >= fromDate)
  }
  if (dateTo) {
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)
    filtered = filtered.filter(c => new Date(c.start_time) <= toDate)
  }
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(c =>
      c.customer_phone?.includes(q) ||
      c.customer_name?.toLowerCase().includes(q) ||
      c.transcript_full?.toLowerCase().includes(q) ||
      c.transcript_preview?.toLowerCase().includes(q)
    )
  }

  // Date range
  const dates = calls.map(c => new Date(c.start_time)).sort((a,b) => a-b)
  const dateRange = `${dates[0]?.toLocaleDateString('en-US')} - ${dates[dates.length-1]?.toLocaleDateString('en-US')}`

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="logo">🦏 Rhino</div>
        </div>
      </header>

      {/* Tabs */}
      <div className="filters" style={{ marginBottom: '24px' }}>
        <button
          className={`filter-btn ${tab === 'calls' ? 'active' : ''}`}
          onClick={() => setTab('calls')}
        >
          📞 Call List
        </button>
        <button
          className={`filter-btn ${tab === 'insights' ? 'active' : ''}`}
          onClick={() => setTab('insights')}
          style={tab !== 'insights' ? { background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' } : {}}
        >
          💡 Insights
        </button>
        <button
          className={`filter-btn ${tab === 'methodology' ? 'active' : ''}`}
          onClick={() => setTab('methodology')}
        >
          <InfoIcon /> Methodology
        </button>
        <button
          className={`filter-btn ${tab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setTab('recommendations')}
          style={tab !== 'recommendations' ? { background: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
        >
          📋 Recommendations
        </button>
      </div>

      {tab === 'methodology' ? (
        <MethodologyTab stats={stats} calls={calls} />
      ) : tab === 'insights' ? (
        <InsightsTab stats={stats} calls={calls} />
      ) : tab === 'recommendations' ? (
        <RecommendationsTab />
      ) : (
        <>
          {/* Classification Overview */}
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Call Classification ({stats.total} calls)</span>
              </div>
              <div className="stats-grid" style={{ marginTop: '12px' }}>
                <StatCard
                  label="Customers"
                  value={stats.inbound_answered_by_category?.customer || 0}
                  subtext={`${((stats.inbound_answered_by_category?.customer || 0) / stats.inbound_answered * 100).toFixed(1)}%`}
                  color="var(--color-customer)"
                  onClick={() => { setFilter('customer'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
                <StatCard
                  label="Spam"
                  value={stats.inbound_answered_by_category?.spam || 0}
                  subtext={`${((stats.inbound_answered_by_category?.spam || 0) / stats.inbound_answered * 100).toFixed(1)}%`}
                  color="var(--color-spam)"
                  onClick={() => { setFilter('spam'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
                <StatCard
                  label="Operations"
                  value={stats.inbound_answered_by_category?.operations || 0}
                  subtext={`${((stats.inbound_answered_by_category?.operations || 0) / stats.total * 100).toFixed(1)}%`}
                  color="var(--color-operations)"
                  onClick={() => { setFilter('operations'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
                <StatCard
                  label="Not Fit"
                  value={stats.inbound_answered_by_category?.not_fit || 0}
                  subtext={`${((stats.inbound_answered_by_category?.not_fit || 0) / stats.total * 100).toFixed(1)}%`}
                  color="var(--color-not_fit)"
                  onClick={() => { setFilter('not_fit'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
                <StatCard
                  label="System"
                  value={stats.inbound_answered_by_category?.system || 0}
                  subtext={`${((stats.inbound_answered_by_category?.system || 0) / stats.total * 100).toFixed(1)}%`}
                  color="var(--color-system)"
                  onClick={() => { setFilter('system'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
                <StatCard
                  label="Incomplete"
                  value={stats.inbound_answered_by_category?.incomplete || 0}
                  subtext={`${((stats.inbound_answered_by_category?.incomplete || 0) / stats.total * 100).toFixed(1)}%`}
                  color="var(--color-incomplete)"
                  onClick={() => { setFilter('incomplete'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
              </div>
            </div>
          </section>

          {/* Period Comparison - By Month */}
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="card-title">📅 By Month</span>
              </div>
              <div style={{ padding: '12px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Month</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Total</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>🟢 Customer</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>🔴 Spam</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>🔵 Operations</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>⚪ Incomplete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group calls by month
                      const byMonth = {};
                      calls.forEach(c => {
                        const d = new Date(c.start_time);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (!byMonth[key]) byMonth[key] = [];
                        byMonth[key].push(c);
                      });
                      // Sort months
                      const months = Object.keys(byMonth).sort();
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return months.map((m, i) => {
                        const monthCalls = byMonth[m];
                        const [year, month] = m.split('-');
                        const label = `${monthNames[parseInt(month) - 1]} ${year}`;
                        return (
                          <tr key={m} style={i < months.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}>
                            <td style={{ padding: '8px' }}>{label}</td>
                            <td style={{ textAlign: 'right', padding: '8px' }}>{monthCalls.length}</td>
                            <td style={{ textAlign: 'right', padding: '8px', color: 'var(--color-customer)' }}>{monthCalls.filter(c => c.category === 'customer').length}</td>
                            <td style={{ textAlign: 'right', padding: '8px', color: 'var(--color-spam)' }}>{monthCalls.filter(c => c.category === 'spam').length}</td>
                            <td style={{ textAlign: 'right', padding: '8px', color: 'var(--color-operations)' }}>{monthCalls.filter(c => c.category === 'operations').length}</td>
                            <td style={{ textAlign: 'right', padding: '8px', color: 'var(--color-incomplete)' }}>{monthCalls.filter(c => c.category === 'incomplete').length}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Data Explanation with Charts */}
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="card-title">📊 Data Breakdown</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
                {/* Text Explanation */}
                <div style={{ fontSize: '13px', lineHeight: '1.6', flex: '1', minWidth: '280px' }}>
                  <p><strong>{stats.total} Total Calls</strong></p>
                  <p style={{ marginTop: '12px' }}><strong>Classification Breakdown:</strong></p>
                  <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                    <li><span style={{ color: 'var(--color-customer)' }}>Customer ({calls.filter(c => c.category === 'customer' && !c.voicemail).length})</span> = Answered inquiries about concrete work</li>
                    <li><span style={{ color: '#a855f7' }}>Customer VM ({calls.filter(c => c.category === 'customer' && c.voicemail).length})</span> = Customer voicemails (missed opportunities)</li>
                    <li><span style={{ color: 'var(--color-spam)' }}>Spam ({calls.filter(c => c.category === 'spam').length})</span> = Cold calls, robocalls, sales pitches</li>
                    <li><span style={{ color: 'var(--color-operations)' }}>Operations ({calls.filter(c => c.category === 'operations').length})</span> = Suppliers, insurance, accounting</li>
                    <li><span style={{ color: '#eab308' }}>Not Relevant ({calls.filter(c => c.category === 'other_inquiry').length})</span> = Out of area, wrong service</li>
                    <li><span style={{ color: 'var(--color-incomplete)' }}>Incomplete ({calls.filter(c => c.category === 'incomplete').length})</span> = Too short or unclear to classify</li>
                  </ul>
                </div>

                {/* Pie Chart - Classification */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>Classification ({stats.total} calls)</h4>
                    <ResponsiveContainer width={280} height={280}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: `Customer (${calls.filter(c => c.category === 'customer' && !c.voicemail).length})`, value: calls.filter(c => c.category === 'customer' && !c.voicemail).length },
                            { name: `Customer VM (${calls.filter(c => c.category === 'customer' && c.voicemail).length})`, value: calls.filter(c => c.category === 'customer' && c.voicemail).length },
                            { name: `Spam (${calls.filter(c => c.category === 'spam').length})`, value: calls.filter(c => c.category === 'spam').length },
                            { name: `Operations (${calls.filter(c => c.category === 'operations').length})`, value: calls.filter(c => c.category === 'operations').length },
                            { name: `Not Relevant (${calls.filter(c => c.category === 'other_inquiry').length})`, value: calls.filter(c => c.category === 'other_inquiry').length },
                            { name: `Incomplete (${calls.filter(c => c.category === 'incomplete').length})`, value: calls.filter(c => c.category === 'incomplete').length }
                          ]}
                          cx="50%"
                          cy="40%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#a855f7" />
                          <Cell fill="#ef4444" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#eab308" />
                          <Cell fill="#6b7280" />
                        </Pie>
                        <Tooltip formatter={(value, name) => [value + ' calls', name.split(' ')[0]]} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={60}
                          formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '10px' }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Calls Table */}
          <section className="section">
            <h2 id="call-list" className="section-title">Call List</h2>

            {/* Filters */}
            <div className="filters">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({calls.length})
              </button>
              <button
                className={`filter-btn ${filter === 'customer' ? 'active' : ''}`}
                onClick={() => setFilter('customer')}
              >
                🟢 Customers ({calls.filter(c => c.category === 'customer' && !c.voicemail).length})
              </button>
              <button
                className={`filter-btn ${filter === 'customer_voicemail' ? 'active' : ''}`}
                onClick={() => setFilter('customer_voicemail')}
              >
                📞 Customer VM ({calls.filter(c => c.category === 'customer' && c.voicemail).length})
              </button>
              <button
                className={`filter-btn ${filter === 'spam' ? 'active' : ''}`}
                onClick={() => setFilter('spam')}
              >
                🔴 Spam ({calls.filter(c => c.category === 'spam').length})
              </button>
              <button
                className={`filter-btn ${filter === 'operations' ? 'active' : ''}`}
                onClick={() => setFilter('operations')}
              >
                🔵 Operations ({calls.filter(c => c.category === 'operations').length})
              </button>
              <button
                className={`filter-btn ${filter === 'not_fit' ? 'active' : ''}`}
                onClick={() => setFilter('not_fit')}
              >
                🟠 Not Fit ({calls.filter(c => c.category === 'not_fit').length})
              </button>
              <button
                className={`filter-btn ${filter === 'system' ? 'active' : ''}`}
                onClick={() => setFilter('system')}
              >
                🟣 System ({calls.filter(c => c.category === 'system').length})
              </button>
              <button
                className={`filter-btn ${filter === 'incomplete' ? 'active' : ''}`}
                onClick={() => setFilter('incomplete')}
              >
                ⚪ Incomplete ({calls.filter(c => c.category === 'incomplete').length})
              </button>
            </div>

            <div className="filters">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-muted" style={{ fontSize: '13px' }}>From:</span>
                <input
                  type="date"
                  className="search-input"
                  style={{ width: '150px' }}
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-muted" style={{ fontSize: '13px' }}>To:</span>
                <input
                  type="date"
                  className="search-input"
                  style={{ width: '150px' }}
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  className="filter-btn"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                >
                  Clear Dates
                </button>
              )}

              <input
                type="text"
                className="search-input"
                placeholder="Search transcript/phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Showing {Math.min(filtered.length, 100)} of {filtered.length} calls
            </div>

            {/* Table */}
            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Sentiment</th>
                      <th>Recording</th>
                      <th>Transcript</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map(call => (
                      <tr
                        key={call.id}
                        onClick={() => setSelectedCall(call)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="font-mono" style={{ fontSize: '12px' }}>
                          {new Date(call.start_time).toLocaleDateString('en-US')}
                        </td>
                        <td>
                          <AnswerBadge answered={call.answered} voicemail={call.voicemail} />
                        </td>
                        <td className="font-mono">{call.duration}s</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CategoryBadge category={call.category} />
                            {call.incomplete_reason && <IncompleteReason reason={call.incomplete_reason} />}
                          </div>
                        </td>
                        <td><Confidence value={call.confidence_classification} /></td>
                        <td><SentimentBar sentiment={call.sentiment_summary} /></td>
                        <td><AudioLink url={call.recording_url} /></td>
                        <td>
                          <div className="transcript-preview" style={call.notes ? { color: 'var(--text-primary)' } : {}}>
                            {call.notes || call.transcript_preview || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Monthly Trends */}
          <MonthlyTrends calls={calls} />
        </>
      )}

      {/* Modal */}
      {selectedCall && (
        <CallModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}
