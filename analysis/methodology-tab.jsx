// Updated Methodology Tab with Category Explanations
function MethodologyTab({ stats, calls }) {
  // Safety check
  if (!calls || calls.length === 0) {
    return <div className="section"><p>No calls data available</p></div>
  }

  // Category counts
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
            <strong>Why this approach?</strong> It catches nuances that automated spam detection misses:
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>A "Google" call might be spam OR a real Google My Business support call</li>
              <li>A short call might be spam OR a customer who got their question answered quickly</li>
              <li>A sales call might be spam OR a legitimate subcontractor offering services</li>
            </ul>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center', padding: '12px', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600 }}>
            Total: {stats.total} calls analyzed individually
          </div>
        </div>
      </section>

      {/* Category Explanations */}
      <section className="section">
        <h2 className="section-title">📁 Category Explanations</h2>
        
        {/* CUSTOMER */}
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-customer)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-customer)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🟢 CUSTOMER</span>
            <span className="font-mono">{customerCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Real potential clients calling about construction projects. These callers described a specific project, asked for quotes or site visits, scheduled appointments, or followed up on existing inquiries.
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Examples from actual calls:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li>"Kelly Kuykendall realtor - driveway regrade quote at 29 Live Oak Road Oakland"</li>
              <li>"Shilpa in Palo Alto - drain system replacement pavers and fill"</li>
              <li>"Andrew Ballman in Oakland - CMU garden wall concrete pathway"</li>
              <li>"ADU projects Fremont San Jose Belmont multi-family"</li>
              <li>"Foundation repair inquiry La Quinta Hotel Livermore"</li>
            </ul>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <strong>Average call duration: 3+ minutes</strong> — real customers take time to explain their needs.
          </div>
        </div>

        {/* SPAM */}
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-spam)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-spam)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🔴 SPAM</span>
            <span className="font-mono">{spamCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Unwanted calls from telemarketers, scammers, and robocalls. Includes Google listing scams, cold calls/sales pitches, "press 1" robocalls, QuickBooks scams, EMG listings, digital activation department, merchant services, and business lending offers.
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Common patterns:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li>"This is an important message regarding your Google Business account..."</li>
              <li>"Hello, this is Rose from the digital activation department..."</li>
              <li>"This is EMG listing department calling about your business listing..."</li>
              <li>"Press 1 to speak with an agent" / "Press 0 to opt out"</li>
            </ul>
          </div>
        </div>

        {/* INCOMPLETE */}
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-incomplete)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚪ INCOMPLETE</span>
            <span className="font-mono">{incompleteCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Calls where we couldn't determine what the caller wanted because they hung up immediately, only heard hold message, left no voicemail message, or had audio issues.
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Why it matters:</strong> These could be customers who gave up waiting, wrong numbers, spam calls that disconnected, or poor cell phone connections.
          </div>
        </div>

        {/* OPERATIONS */}
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-operations)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-operations)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🔵 OPERATIONS</span>
            <span className="font-mono">{opsCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Legitimate business calls that aren't customer leads: suppliers & materials (Home Depot, Westside Building Material), permits & city (Lafayette permit, erosion control), subcontractors & job seekers, and internal coordination.
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Examples:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li>"Westside Building Material payment for stucco materials"</li>
              <li>"City of Lafayette permit call about erosion control"</li>
              <li>"Job seeker inquiring about employment"</li>
              <li>"Internal call - Rolly refresh check"</li>
            </ul>
          </div>
        </div>

        {/* NOT FIT */}
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--color-not_fit)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-not_fit)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🟠 NOT FIT</span>
            <span className="font-mono">{notFitCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Real potential customers, but Rhino couldn't help them. Either outside service area (Windsor, Santa Rosa, Vacaville, Gilroy, Altadena) or service not offered (mobile home, window repair only, drainage cleaning).
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            <strong>Examples:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li>"Bathroom remodel inquiry from Windsor - outside service area"</li>
              <li>"Eaton fire repair bid - Altadena CA - outside service area"</li>
              <li>"Window insulation issue - Rhino only does replacement not repair"</li>
              <li>"Kitchen hood job in Orinda too small - referred to handyman"</li>
            </ul>
          </div>
        </div>

        {/* SYSTEM */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-system)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-system)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🟣 SYSTEM</span>
            <span className="font-mono">{systemCount} calls</span>
          </h3>
          <p className="text-secondary" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Automated system calls (not spam): Houzz Lead Notifications ("As a courtesy, we call to see if you'd like to immediately respond to this homeowner..."), test calls, IVR systems, and automated lead routing.
          </p>
          <div style={{ background: 'var(--bg-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
            These are legitimate but not customer conversations.
          </div>
        </div>
      </section>
    </div>
  )
}
