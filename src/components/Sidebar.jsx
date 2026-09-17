const nav = [
  { id: 'dashboard', label: 'Dashboard', sub: 'Overview & Charts', icon: '📊' },
  { id: 'calendar', label: 'Calendar', sub: 'Sales & Schedule', icon: '📅' },
  { id: 'orders', label: 'Orders', sub: 'Water Refilling • 18 SKUs', icon: '🧾' },
  { id: 'inventory', label: 'Inventory', sub: 'Stock & Supplies', icon: '📦' },
  { id: 'hiram', label: 'Hiram Tracker', sub: 'Borrowed Gallons', icon: '🤝' },
  { id: 'expenses', label: 'Expenses', sub: 'Costs & Bills', icon: '💸' },
  { id: 'reports', label: 'Reports', sub: 'Analytics', icon: '📈' },
]

export default function Sidebar({ active, onChange, stats, collapsed, onToggleCollapse }) {
  const todayLabel = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
  const isCollapsed = Boolean(collapsed)
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'mobile-open'}`} aria-label="Primary navigation">
      {/* Collapse control — always visible */}
      <div className="sidebar-top">
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar — wider workspace'}
        >
          <span className="collapse-icon" aria-hidden="true">{isCollapsed ? '›' : '‹'}</span>
          {!isCollapsed && <span className="collapse-label">Collapse</span>}
        </button>
        {!isCollapsed && <span className="sidebar-top-hint">Hide for wider view</span>}
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => (
          <button
            key={item.id}
            data-label={`${item.label} — ${item.sub}`}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
            title={isCollapsed ? `${item.label} — ${item.sub}` : undefined}
          >
            <span className="ico" aria-hidden="true">{item.icon}</span>
            <span className="nav-text" style={{ flex: 1, minWidth: 0 }}>
              <span className="nav-label" style={{ display: 'block', fontSize: '13.5px' }}>{item.label}</span>
              <span className="nav-sub" style={{ display: 'block', fontSize: '11.5px', color: 'var(--slate-400)', fontWeight: 500 }}>{item.sub}</span>
            </span>
            {!isCollapsed && active === item.id && <span className="nav-chevron" style={{ color: 'var(--blue-600)' }}>›</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-stats" aria-hidden={isCollapsed}>
        <h4>Today — {todayLabel}</h4>
        <div className="stat-row"><span>Filled Ready</span><strong>{stats.filled} gals</strong></div>
        <div className="stat-row"><span>Empty Return</span><strong>{stats.empty} gals</strong></div>
        <div className="stat-row"><span>Hiram Active</span><strong style={{ color: '#d97706' }}>{stats.hiram} gals</strong></div>
        <div className="stat-row"><span>Low Stock Alerts</span><strong style={{ color: '#dc2626' }}>{stats.lows} items</strong></div>
      </div>

      <div className="sidebar-tip" style={{ padding: '0 12px 14px', fontSize: '11.5px', color: 'var(--slate-400)', lineHeight: 1.5, textAlign: 'center' }}>
        💡 Tip: Click any calendar date to add a sale or expense.<br />All data is stored locally on this device.
      </div>

      {/* Mobile-only close hint when expanded as drawer */}
      {!isCollapsed && (
        <div className="sidebar-mobile-close">
          <button className="btn-xs" style={{ width: '100%', padding: '9px', fontSize: '12.5px' }} onClick={onToggleCollapse}>✕ Close</button>
        </div>
      )}
    </aside>
  )
}
