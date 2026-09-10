const nav = [
  { id: 'calendar', label: 'Calendar', sub: 'Sales & Schedule', icon: '📅' },
  { id: 'inventory', label: 'Inventory', sub: 'Stock & Supplies', icon: '📦' },
  { id: 'hiram', label: 'Hiram Tracker', sub: 'Borrowed Gallons', icon: '🤝' },
  { id: 'expenses', label: 'Expenses', sub: 'Costs & Bills', icon: '💸' },
  { id: 'reports', label: 'Reports', sub: 'Analytics', icon: '📊' },
]

export default function Sidebar({ active, onChange, stats }) {
  const todayLabel = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {nav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <span className="ico">{item.icon}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '13.5px' }}>{item.label}</span>
              <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--slate-400)', fontWeight: 500 }}>{item.sub}</span>
            </span>
            {active === item.id && <span style={{ color: 'var(--blue-600)' }}>›</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-stats">
        <h4>Today — {todayLabel}</h4>
        <div className="stat-row"><span>Filled Ready</span><strong>{stats.filled} gals</strong></div>
        <div className="stat-row"><span>Empty Return</span><strong>{stats.empty} gals</strong></div>
        <div className="stat-row"><span>Hiram Active</span><strong style={{ color: '#d97706' }}>{stats.hiram} gals</strong></div>
        <div className="stat-row"><span>Low Stock Alerts</span><strong style={{ color: '#dc2626' }}>{stats.lows} items</strong></div>
      </div>

      <div style={{ padding: '0 12px 14px', fontSize: '11.5px', color: 'var(--slate-400)', lineHeight: 1.5, textAlign: 'center' }}>
        💡 Tip: Click any calendar date to add a sale or expense.<br />All data is stored locally on this device.
      </div>
    </aside>
  )
}
