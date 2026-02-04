// Insights Tab - Key Findings + Spam Breakdown
function InsightsTab({ stats, calls }) {
  const spamCalls = calls.filter(c => c.category === 'spam')
  
  // Calculate spam duration in minutes
  const spamDuration = spamCalls.reduce((sum, c) => sum + (c.duration || 0), 0)
  const spamMinutes = Math.round(spamDuration / 60)
  const spamHours = (spamMinutes / 60).toFixed(1)
  
  // Best performing sources
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

  // Spam breakdown
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
      {/* Key Findings Header */}
      <section className="section">
        <h2 className="section-title">💡 Key Findings</h2>
        
        {/* Finding 1: Spam Cost */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>⏱️</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Spam is Costing Real Time</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong style={{ color: 'var(--color-spam)' }}>{spamCalls.length} spam calls</strong> consumed approximately 
                <strong style={{ color: 'var(--color-spam)' }}> {spamHours} hours</strong> of phone time. 
                The team had to answer, listen, say "no thank you", and hang up.
              </p>
            </div>
          </div>
        </div>

        {/* Finding 2: Google Scams */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>🚨</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Google Listing Scams are the #1 Problem</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong>{spamBreakdown['Google Listing Scams']}</strong> calls were Google listing scams - 
                they all follow the same pattern: "This is an important message about your Google Business... Press 1 to speak to an agent."
                <br /><br />
                <span style={{ color: 'var(--color-spam)' }}>These are NOT from Google.</span> They're scammers trying to sell fake SEO services.
              </p>
            </div>
          </div>
        </div>

        {/* Finding 3: Abandoned Calls */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>📞</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{incompletePercent}% of Callers Abandon Before Speaking</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong>{incompleteCalls.length} incomplete calls</strong> suggest potential issues with:
              </p>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <li>Hold times too long</li>
                <li>IVR menu confusing</li>
                <li>Voicemail prompt too lengthy</li>
                <li>Callers expecting instant answer</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Finding 4: Best Sources */}
        {topSources.length > 0 && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>⭐</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Best Performing Phone Lines</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Total</th>
                        <th>Customers</th>
                        <th>Spam</th>
                        <th>Customer Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSources.map((src, i) => (
                        <tr key={i}>
                          <td>{src.name}</td>
                          <td className="font-mono">{src.total}</td>
                          <td className="font-mono" style={{ color: 'var(--color-customer)' }}>{src.customer}</td>
                          <td className="font-mono" style={{ color: 'var(--color-spam)' }}>{src.spam}</td>
                          <td className="font-mono" style={{ fontWeight: 600, color: src.rate >= 20 ? 'var(--color-customer)' : 'var(--text-secondary)' }}>
                            {src.rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Finding 5: Outside Service Area */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>📍</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Lost Opportunities Outside Service Area</h3>
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                <strong>{calls.filter(c => c.category === 'not_fit').length} potential customers</strong> called from areas Rhino doesn't serve:
                Santa Rosa, Windsor, Vacaville, Gilroy, Altadena, San Rafael, and more.
                <br /><br />
                <strong>Recommendation:</strong> Add clear service area to Google listings to prevent these calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Spam Breakdown */}
      <section className="section">
        <h2 className="section-title">🔴 Spam Breakdown ({spamCalls.length} calls)</h2>
        <div className="card">
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(spamBreakdown)
              .filter(([_, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>{type}</span>
                  <span className="font-mono" style={{ color: 'var(--color-spam)' }}>{count}</span>
                </div>
              ))
            }
          </div>
          
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>What These Sound Like:</h4>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: 'var(--text-primary)' }}>Google Listing Scams:</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "This is an important message regarding your Google Business account. Our system shows numerous searches for your business, and Google and Google Voice clients are currently having trouble finding you. Press 1 to speak with an agent..."
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: 'var(--text-primary)' }}>Digital Activation Department:</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "Hello, this is Rose from the digital activation department..." (Same script, different names: Kelly, Ayla, Sabrina)
              </div>
            </div>
            
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: 'var(--text-primary)' }}>Cold Calls:</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "Hi, this is Kevin with InnoDesk Engineering. I was just reaching out to see if you all have any new projects that require MEP or structural civil engineering..."
              </div>
            </div>
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
        
        {/* Immediate Actions */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-spam)' }}>⚡</span> Immediate Actions
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-spam)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>1. Block Known Spam Patterns</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                "Digital activation department" and "EMG listings" calls come from identifiable number pools. Set up call blocking rules.
              </p>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-spam)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>2. Auto-Reject "Press 1" Robocalls</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                38+ calls were pure robocalls. CallRail or your phone system can filter these automatically.
              </p>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-operations)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>3. Shorten Hold Message</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                Current message may be too long. Consider: <strong>"Rhino Builders, please hold briefly"</strong> (5 seconds max).
              </p>
            </div>
          </div>
        </div>

        {/* Longer Term */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-customer)' }}>🎯</span> Longer Term
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-customer)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>4. Add Service Area to Google Listings</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                Include <strong>"Serving Oakland, Berkeley, Lafayette, Orinda, Danville, Walnut Creek, Pleasanton, Livermore"</strong> to reduce NOT_FIT calls from outside areas.
              </p>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-customer)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>5. Track Incomplete Calls</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                Consider a callback system for callers who hang up during hold. These could be potential customers who gave up waiting.
              </p>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>6. Review Orinda GMB Listing</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                It brings the most leads but also the most spam. May be attracting bot traffic - review and optimize.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="section">
        <div className="card" style={{ background: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--color-customer)' }}>📈 Expected Impact</h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
            Implementing these recommendations could:
          </p>
          <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <li>Reduce spam calls by <strong>40-50%</strong> (blocking known patterns + robocalls)</li>
            <li>Save <strong>1-2 hours per month</strong> of staff time</li>
            <li>Capture <strong>more potential leads</strong> by reducing hold abandonment</li>
            <li>Eliminate <strong>out-of-area inquiries</strong> that can't convert</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
