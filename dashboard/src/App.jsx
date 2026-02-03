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
    other_inquiry: 'Other Inquiry',
    incomplete: 'Incomplete'
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

// Missed Opportunities Tab
function MissedOpportunitiesTab({ calls, onSelectCall }) {
  const missedOpportunities = calls.filter(c => c.voicemail && c.category === 'customer')
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <section className="section">
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px' }}>🚨</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-spam)' }}>{missedOpportunities.length} Missed Opportunities</div>
              <div className="text-muted">Customer voicemails - leads that weren't answered</div>
            </div>
          </div>
          <p className="text-secondary" style={{ fontSize: '13px', margin: 0 }}>
            These are potential customers who called, didn't reach anyone, and left a voicemail.
            Each represents a possible lost sale. Review and follow up!
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Leads to Follow Up</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          {missedOpportunities.map(call => (
            <div
              key={call.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectCall(call)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                    {call.customer_city || 'Unknown Location'}
                  </div>
                  <div className="font-mono text-muted" style={{ fontSize: '13px' }}>
                    {call.customer_phone}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted" style={{ fontSize: '12px' }}>{formatDate(call.start_time)}</div>
                  <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{call.duration}s voicemail</div>
                </div>
              </div>
              <div style={{
                background: 'var(--bg-surface-2)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}>
                "{call.transcript_preview || 'No transcript available'}"
              </div>
              {call.recording_url && (
                <div style={{ marginTop: '12px' }}>
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'var(--bg-surface-3)',
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '12px'
                    }}
                  >
                    <PlayIcon /> Listen to Voicemail
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// Methodology Tab
function MethodologyTab({ stats, calls }) {
  // Calculate weekly breakdown - group into 4 proper weeks
  // Sort calls by date to find date range
  const sortedCalls = [...calls].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const firstDate = new Date(sortedCalls[0]?.start_time)
  const lastDate = new Date(sortedCalls[sortedCalls.length - 1]?.start_time)
  
  // Define 4 weeks starting from the first Sunday before/on the first call
  const startSunday = new Date(firstDate)
  startSunday.setDate(firstDate.getDate() - firstDate.getDay())
  startSunday.setHours(0, 0, 0, 0)
  
  // Create 4 week buckets
  const weekBuckets = []
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(startSunday)
    weekStart.setDate(startSunday.getDate() + (i * 7))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    weekBuckets.push({
      start: weekStart,
      end: weekEnd,
      label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' + 
             weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: 0,
      withRec: 0,
      inbound: 0,
      outbound: 0
    })
  }
  
  // Assign calls to weeks
  calls.forEach(c => {
    const callDate = new Date(c.start_time)
    for (const week of weekBuckets) {
      if (callDate >= week.start && callDate <= week.end) {
        week.total++
        if (c.has_recording) week.withRec++
        if (c.direction === 'inbound') week.inbound++
        if (c.direction === 'outbound') week.outbound++
        break
      }
    }
  })
  
  // Filter out empty weeks
  const weeks = weekBuckets.filter(w => w.total > 0)

  // Full breakdown stats
  const answered = calls.filter(c => c.answered === true)
  const missed = calls.filter(c => c.answered === false)
  const answeredWithRec = answered.filter(c => c.has_recording)
  const answeredNoRec = answered.filter(c => !c.has_recording)
  const missedWithVoicemail = missed.filter(c => c.voicemail === true)
  const missedNoVoicemail = missed.filter(c => !c.voicemail)

  // Categories with recording
  const withRecording = calls.filter(c => c.has_recording)
  const customerWithRec = withRecording.filter(c => c.category === 'customer').length
  const spamWithRec = withRecording.filter(c => c.category === 'spam').length
  const opsWithRec = withRecording.filter(c => c.category === 'operations').length
  const otherInqWithRec = withRecording.filter(c => c.category === 'other_inquiry').length
  const incompleteWithRec = withRecording.filter(c => c.category === 'incomplete').length

  return (
    <div>
      {/* Full Call Breakdown */}
      <section className="section">
        <h2 className="section-title">Call Breakdown</h2>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.8' }}>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '16px' }}>{stats.total} Total Calls</strong>
            </div>

            {/* Answered */}
            <div style={{ marginLeft: '16px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--color-customer)' }}>
                ├── <strong>{answered.length} Answered</strong>
              </div>
              <div style={{ marginLeft: '24px', color: 'var(--text-secondary)' }}>
                <div>├── {answeredWithRec.length} With recording → Classified</div>
                <div style={{ marginLeft: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <div>├── {customerWithRec} Customer</div>
                  <div>├── {spamWithRec} Spam</div>
                  <div>├── {opsWithRec} Operations</div>
                  <div>├── {otherInqWithRec} Other Inquiry</div>
                  <div>└── {incompleteWithRec} Incomplete (short/unclear)</div>
                </div>
                <div>└── {answeredNoRec.length} Without recording (outbound) → Incomplete</div>
              </div>
            </div>

            {/* Missed */}
            <div style={{ marginLeft: '16px' }}>
              <div style={{ color: 'var(--color-spam)' }}>
                └── <strong>{missed.length} Missed (Not Answered)</strong>
              </div>
              <div style={{ marginLeft: '24px', color: 'var(--text-secondary)' }}>
                <div>├── {missedWithVoicemail.length} Left voicemail → Classified by content</div>
                <div>└── {missedNoVoicemail.length} No voicemail → Incomplete</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Breakdown */}
      <section className="section">
        <h2 className="section-title">Weekly Breakdown</h2>
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Total Calls</th>
                  <th>With Recording</th>
                  <th>Inbound</th>
                  <th>Outbound</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, idx) => (
                  <tr key={idx}>
                    <td className="font-mono">{week.label}</td>
                    <td className="font-mono">{week.total}</td>
                    <td className="font-mono">{week.withRec} <span className="text-muted">({Math.round(week.withRec/week.total*100)}%)</span></td>
                    <td className="font-mono">{week.inbound}</td>
                    <td className="font-mono">{week.outbound}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Duration Explanation */}
      <section className="section">
        <h2 className="section-title">Duration vs Recording Duration</h2>
        <div className="card">
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="stat-label" style={{ marginBottom: '8px' }}>Call Duration</div>
                <p className="text-secondary" style={{ fontSize: '13px', margin: 0 }}>
                  Total time from connection to end. Includes ringing, IVR/greeting, conversation, and silence.
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-label" style={{ marginBottom: '8px' }}>Recording Duration</div>
                <p className="text-secondary" style={{ fontSize: '13px', margin: 0 }}>
                  Only the recorded portion. Starts after answer or voicemail beep. Does not include ringing.
                </p>
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              <strong>Average difference:</strong> ~9 seconds (typically the ringing time before answer)
            </div>
          </div>
        </div>
      </section>

      {/* Why Incomplete */}
      <section className="section">
        <h2 className="section-title">Why 211 Calls Are "Incomplete"</h2>
        <div className="card">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>No recording - Outbound calls (not recorded by CallRail)</span>
              <span className="font-mono">{answeredNoRec.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>No recording - Missed without voicemail</span>
              <span className="font-mono">{missedNoVoicemail.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>Has recording - Too short or unclear content</span>
              <span className="font-mono">{incompleteWithRec}</span>
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
              <strong>Note:</strong> Only calls with recordings can be classified as Customer/Spam/Operations.
              Calls without recordings are automatically marked as Incomplete.
            </p>
          </div>
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
    // Customers only (no voicemails)
    filtered = filtered.filter(c => c.category === 'customer' && !c.voicemail)
  } else if (filter === 'voicemail') {
    // All voicemails
    filtered = filtered.filter(c => c.voicemail === true)
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
          <div className="date-range">January 2026</div>
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
          className={`filter-btn ${tab === 'missed' ? 'active' : ''}`}
          onClick={() => setTab('missed')}
          style={tab !== 'missed' ? { background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}
        >
          🚨 Missed Opportunities ({calls.filter(c => c.voicemail && c.category === 'customer').length})
        </button>
        <button
          className={`filter-btn ${tab === 'methodology' ? 'active' : ''}`}
          onClick={() => setTab('methodology')}
        >
          <InfoIcon /> Methodology
        </button>
      </div>

      {tab === 'methodology' ? (
        <MethodologyTab stats={stats} calls={calls} />
      ) : tab === 'missed' ? (
        <MissedOpportunitiesTab calls={calls} onSelectCall={setSelectedCall} />
      ) : (
        <>
          {/* Stats Overview */}
          <section className="section">
            <div className="stats-grid">
              <StatCard
                label="Total Calls"
                value={stats.total}
                subtext="inbound calls analyzed"
              />
              <StatCard
                label="Classified"
                value={stats.inbound_answered}
                subtext="calls with clear classification"
              />
              <StatCard
                label="Voicemail"
                value={stats.inbound_voicemail}
                subtext="customer voicemails"
              />
            </div>

            {/* Inbound Answered Classification */}
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-header">
                <span className="card-title">Inbound Answered Classification ({stats.inbound_answered} calls)</span>
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
                  subtext={`${((stats.inbound_answered_by_category?.operations || 0) / stats.inbound_answered * 100).toFixed(1)}%`}
                  color="var(--color-operations)"
                  onClick={() => { setFilter('operations'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
                <StatCard
                  label="Incomplete"
                  value={stats.inbound_answered_by_category?.incomplete || 0}
                  subtext={`${stats.inbound_answered_without_recording || 0} no recording · ${(stats.inbound_answered_by_category?.incomplete || 0) - (stats.inbound_answered_without_recording || 0)} unclear`}
                  color="var(--color-incomplete)"
                  onClick={() => { setFilter('incomplete'); setTimeout(() => document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                />
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
                  <p><strong>415 Total Calls</strong> = 333 Inbound + 82 Outbound</p>
                  <p style={{ marginTop: '8px' }}><strong>333 Inbound</strong> = 228 Answered + 38 Voicemail + 67 Missed</p>
                  <p style={{ marginTop: '8px' }}><strong>166 Without Recording:</strong></p>
                  <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                    <li>82 Outbound calls (not recorded by CallRail)</li>
                    <li>70 Inbound missed (no one answered = nothing to record)</li>
                    <li>14 Inbound answered without recording (CallRail config issue)</li>
                  </ul>
                  <p style={{ marginTop: '8px' }}><strong>Classification based on {stats.inbound_answered} Inbound Answered calls:</strong></p>
                  <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                    <li><span style={{ color: 'var(--color-spam)' }}>Spam ({stats.inbound_answered_by_category?.spam || 0})</span> = Cold calls, robocalls, sales pitches</li>
                    <li><span style={{ color: 'var(--color-customer)' }}>Customer ({stats.inbound_answered_by_category?.customer || 0})</span> = Real inquiries about concrete work</li>
                    <li><span style={{ color: 'var(--color-operations)' }}>Operations ({stats.inbound_answered_by_category?.operations || 0})</span> = Suppliers, insurance, accounting</li>
                    <li><span style={{ color: 'var(--color-incomplete)' }}>Incomplete ({stats.inbound_answered_by_category?.incomplete || 0})</span> = Too short or unclear to classify</li>
                  </ul>
                </div>

                {/* Pie Charts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                  {/* Pie Chart 1: Inbound Calls */}
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>Inbound (333)</h4>
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Answered (228)', value: stats.inbound_answered || 228 },
                            { name: 'Voicemail (38)', value: stats.voicemail || 38 },
                            { name: 'Missed (67)', value: (stats.inbound_missed || 105) - (stats.voicemail || 38) }
                          ]}
                          cx="50%"
                          cy="45%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#a855f7" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip formatter={(value, name) => [value + ' calls', name.split(' ')[0]]} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={50}
                          formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart 2: Classification */}
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>Classification ({stats.inbound_answered})</h4>
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: `Spam (${stats.inbound_answered_by_category?.spam || 0})`, value: stats.inbound_answered_by_category?.spam || 0 },
                            { name: `Customer (${stats.inbound_answered_by_category?.customer || 0})`, value: stats.inbound_answered_by_category?.customer || 0 },
                            { name: `Operations (${stats.inbound_answered_by_category?.operations || 0})`, value: stats.inbound_answered_by_category?.operations || 0 },
                            { name: `Other (${stats.inbound_answered_by_category?.other_inquiry || 0})`, value: stats.inbound_answered_by_category?.other_inquiry || 0 },
                            { name: `Incomplete (${stats.inbound_answered_by_category?.incomplete || 0})`, value: stats.inbound_answered_by_category?.incomplete || 0 }
                          ]}
                          cx="50%"
                          cy="45%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#ef4444" />
                          <Cell fill="#22c55e" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#eab308" />
                          <Cell fill="#6b7280" />
                        </Pie>
                        <Tooltip formatter={(value, name) => [value + ' calls', name.split(' ')[0]]} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={50}
                          formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{value}</span>}
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
                className={`filter-btn ${filter === 'voicemail' ? 'active' : ''}`}
                onClick={() => setFilter('voicemail')}
              >
                📞 Voicemail ({calls.filter(c => c.voicemail).length})
              </button>
              <button
                className={`filter-btn ${filter === 'spam' ? 'active' : ''}`}
                onClick={() => setFilter('spam')}
              >
                🔴 Spam ({stats.inbound_answered_by_category?.spam || 0})
              </button>
              <button
                className={`filter-btn ${filter === 'operations' ? 'active' : ''}`}
                onClick={() => setFilter('operations')}
              >
                🔵 Operations ({stats.inbound_answered_by_category?.operations || 0})
              </button>
              <button
                className={`filter-btn ${filter === 'other_inquiry' ? 'active' : ''}`}
                onClick={() => setFilter('other_inquiry')}
              >
                🟡 Other ({stats.inbound_answered_by_category?.other_inquiry || 0})
              </button>
              <button
                className={`filter-btn ${filter === 'incomplete' ? 'active' : ''}`}
                onClick={() => setFilter('incomplete')}
              >
                ⚪ Incomplete ({stats.inbound_answered_by_category?.incomplete || 0})
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
                          <div className="transcript-preview">
                            {call.transcript_preview || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modal */}
      {selectedCall && (
        <CallModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}
