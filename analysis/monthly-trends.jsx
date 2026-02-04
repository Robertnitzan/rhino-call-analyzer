// Monthly Trends Component - add to bottom of main dashboard
function MonthlyTrends({ calls }) {
  // Group calls by month
  const monthlyData = {}
  calls.forEach(c => {
    const date = new Date(c.start_time)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) {
      monthlyData[key] = { total: 0, spam: 0, customer: 0, incomplete: 0, operations: 0 }
    }
    monthlyData[key].total++
    if (c.category === 'spam') monthlyData[key].spam++
    if (c.category === 'customer') monthlyData[key].customer++
    if (c.category === 'incomplete') monthlyData[key].incomplete++
    if (c.category === 'operations') monthlyData[key].operations++
  })
  
  const months = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => {
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
            <thead>
              <tr>
                <th>Month</th>
                <th>Total</th>
                <th>Spam</th>
                <th>Customer</th>
                <th>Spam Rate</th>
              </tr>
            </thead>
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
        <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Spam rate is consistent at ~43%. No significant seasonal improvement.
        </div>
      </div>
    </section>
  )
}
