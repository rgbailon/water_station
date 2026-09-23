const nav = [
  { id: 'dashboard', label: 'Dashboard', sub: 'Overview & Charts', icon: '📊' },
  { id: 'orders', label: 'Orders', sub: 'Customer Orders', icon: '🧾' },
  { id: 'messages', label: 'Messages', sub: 'Customer inbox', icon: '💬' },
  { id: 'products', label: 'Products', sub: 'Water Catalog • 18 items', icon: '🧴' },
  { id: 'inventory', label: 'Inventory', sub: 'Stock & Supplies', icon: '📦' },
  { id: 'borrowed', label: 'Borrowed', sub: 'Borrowed Gallons', icon: '🤝' },
  { id: 'customers', label: 'Customers', sub: 'Directory & Locations', icon: '👥' },
  { id: 'expenses', label: 'Expenses', sub: 'Costs & Bills', icon: '💸' },
]

const badgeHints = {
  orders: 'confirmed orders',
  messages: 'unread messages',
  inventory: 'low-stock items',
  borrowed: 'borrowed orders',
  expenses: 'unpaid expenses',
}

function formatBadge(n) {
  if (n > 99) return '99+'
  return String(n)
}

export default function Sidebar({ active, onChange, collapsed, onToggleCollapse, badges = {} }) {
  const isCollapsed = Boolean(collapsed)
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'mobile-open'}`} aria-label="Primary navigation">
      {/* Collapse control — hamburger */}
      <div className="sidebar-top">
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar — wider workspace'}
        >
          <span className="collapse-icon hamburger-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          {!isCollapsed && <span className="collapse-label">Menu</span>}
        </button>
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => {
          const count = Number(badges[item.id]) || 0
          const showBadge = count > 0
          return (
          <button
            key={item.id}
            data-label={`${item.label} — ${item.sub}`}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
            title={isCollapsed ? `${item.label} — ${item.sub}${showBadge ? ` (${count} ${badgeHints[item.id] || 'new'})` : ''}` : undefined}
          >
            <span className="ico" aria-hidden="true">{item.icon}</span>
            <span className="nav-text" style={{ flex: 1, minWidth: 0 }}>
              <span className="nav-label" style={{ display: 'block', fontSize: '13.5px' }}>{item.label}</span>
              <span className="nav-sub" style={{ display: 'block', fontSize: '11.5px', color: 'var(--slate-400)', fontWeight: 500 }}>{item.sub}</span>
            </span>
            {showBadge && !isCollapsed && (
              <span className="nav-badge" title={`${count} ${badgeHints[item.id] || 'new'}`}>{formatBadge(count)}</span>
            )}
            {showBadge && isCollapsed && (
              <span className="nav-badge floating" title={`${count} ${badgeHints[item.id] || 'new'}`}>{formatBadge(count)}</span>
            )}
            {!isCollapsed && active === item.id && <span className="nav-chevron" style={{ color: 'var(--blue-600)' }}>›</span>}
          </button>
          )
        })}
      </nav>

      {/* Mobile-only close hint when expanded as drawer */}
      {!isCollapsed && (
        <div className="sidebar-mobile-close">
          <button className="btn-xs" style={{ width: '100%', padding: '9px', fontSize: '12.5px' }} onClick={onToggleCollapse}>✕ Close</button>
        </div>
      )}
    </aside>
  )
}
