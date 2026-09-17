import { useState, useMemo } from 'react'
import { peso } from '../utils/dateUtils'
import { sampleProducts } from '../data/ordersData'
import { exportProductsExcel } from '../utils/export'

export default function ProductsView() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [bottleFilter, setBottleFilter] = useState('ALL')
  const [containerFilter, setContainerFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState('grid') // grid | table

  const filtered = useMemo(() => {
    return sampleProducts.filter(p => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
      if (bottleFilter !== 'ALL' && p.bottleSituation !== bottleFilter) return false
      if (containerFilter !== 'ALL' && p.container !== containerFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${p.name} ${p.size} ${p.container} ${p.description} ${p.typeLabel} ${p.bottleLabel}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [search, typeFilter, bottleFilter, containerFilter])

  const stats = useMemo(() => {
    const purified = sampleProducts.filter(p => p.type === 'PURIFIED').length
    const mineral = sampleProducts.filter(p => p.type === 'MINERAL').length
    const alkaline = sampleProducts.filter(p => p.type === 'ALKALINE').length
    const available = sampleProducts.filter(p => p.type === 'PURIFIED').length
    const cheapest = Math.min(...sampleProducts.map(p => p.price))
    const expensive = Math.max(...sampleProducts.map(p => p.price))
    return { total: sampleProducts.length, purified, mineral, alkaline, available, cheapest, expensive }
  }, [])

  return (
    <div>
      <div className="section-head" style={{ borderTop: 'none' }}>
        <div>
          <h2>🧴 Products</h2>
          <p>All water refill options — 18 choices • Prices, sizes and bottle types • Purified ready to order today</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-xs" style={{ padding: '9px 14px', fontSize: 13 }} onClick={() => exportProductsExcel(filtered.length ? filtered : sampleProducts)} title="Download spreadsheet">⬇ Download</button>
          <div style={{ display: 'inline-flex', border: '1px solid var(--slate-200)', borderRadius: 9, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 700, border: 'none',
                background: viewMode === 'grid' ? 'var(--slate-900)' : 'var(--white)',
                color: viewMode === 'grid' ? 'var(--white)' : 'var(--slate-600)', cursor: 'pointer'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderLeft: '1px solid var(--slate-200)',
                background: viewMode === 'table' ? 'var(--slate-900)' : 'var(--white)',
                color: viewMode === 'table' ? 'var(--white)' : 'var(--slate-600)', cursor: 'pointer'
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* compact stats */}
      <div className="stats-grid" style={{ paddingTop: 0 }}>
        <div className="stat-card blue">
          <div className="stat-top"><span className="stat-label">Total products</span><span className="stat-icon">🧴</span></div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-trend trend-up">{stats.purified} Purified • {stats.mineral} Mineral • {stats.alkaline} Alkaline</div>
        </div>
        <div className="stat-card green">
          <div className="stat-top"><span className="stat-label">Ready to order</span><span className="stat-icon">✅</span></div>
          <div className="stat-value">{stats.available}</div>
          <div className="stat-trend trend-up">Purified water • Others coming soon</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-top"><span className="stat-label">Price range</span><span className="stat-icon">💰</span></div>
          <div className="stat-value">{peso(stats.cheapest)} – {peso(stats.expensive)}</div>
          <div className="stat-trend" style={{ color: '#92400e' }}>Different bottle types have different prices</div>
        </div>
        <div className="stat-card red">
          <div className="stat-top"><span className="stat-label">Showing</span><span className="stat-icon">🔎</span></div>
          <div className="stat-value">{filtered.length} / {stats.total}</div>
          <div className="stat-trend trend-down">{filtered.length === stats.total ? 'All products' : 'Filtered results'}</div>
        </div>
      </div>

      {/* filters */}
      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, size, or description..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13, background: 'var(--white)', color: 'var(--slate-700)' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 14 }}>⌕</span>
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All water types</option>
          <option value="PURIFIED">Purified</option>
          <option value="MINERAL">Mineral</option>
          <option value="ALKALINE">Alkaline</option>
        </select>
        <select value={bottleFilter} onChange={e => setBottleFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All bottle types</option>
          <option value="WITH_GALLON">With Gallon</option>
          <option value="NEEDS_GALLON">New Gallon</option>
          <option value="BORROW">Borrow</option>
        </select>
        <select value={containerFilter} onChange={e => setContainerFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All containers</option>
          <option value="Round">Round</option>
          <option value="Slim">Slim</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} products</span>
        {(search || typeFilter !== 'ALL' || bottleFilter !== 'ALL' || containerFilter !== 'ALL') && (
          <button className="btn-xs" onClick={() => { setSearch(''); setTypeFilter('ALL'); setBottleFilter('ALL'); setContainerFilter('ALL') }}>Clear</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ margin: '18px', padding: 24, textAlign: 'center', background: 'var(--white)', border: '1px dashed var(--slate-300)', borderRadius: 12, color: 'var(--slate-500)' }}>
          No products match your filters. Try changing the search or filters.
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: '18px', paddingTop: 12 }}>
          {filtered.map(p => {
            const isAvailable = p.type === 'PURIFIED'
            return (
              <div key={p.id} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '100%', height: 150, background: 'var(--slate-50)', display: 'grid', placeItems: 'center', padding: 8, borderBottom: '1px solid var(--slate-100)', position: 'relative', overflow: 'hidden' }}>
                  <img src={p.image} alt={`${p.name} ${p.container}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  <span style={{ position: 'absolute', top: 8, left: 8, width: 10, height: 10, borderRadius: 999, background: p.accent, border: '1px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}></span>
                  <span className={`pill ${isAvailable ? 'green' : 'amber'}`} style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, padding: '2px 6px' }}>{isAvailable ? 'Ready' : 'Soon'}</span>
                </div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--slate-900)', lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)', fontWeight: 600, marginTop: 2 }}>{p.size} • {p.container} • {p.bottleLabel}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate-600)', lineHeight: 1.4, minHeight: 34 }}>{p.description}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="pill blue" style={{ fontSize: 11 }}>{p.typeLabel}</span>
                    <span className="pill slate" style={{ fontSize: 11 }}>{p.bottleLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--slate-100)' }}>
                    <b style={{ fontSize: 16, color: 'var(--slate-900)' }}>{peso(p.price)}</b>
                    {isAvailable ? <span className="pill green" style={{ fontSize: 11 }}>Ready to order</span> : <span className="pill amber" style={{ fontSize: 11 }}>Coming soon</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap" style={{ paddingTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Size</th>
                <th>Container</th>
                <th style={{ minWidth: 200 }}>Description</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th>Water type</th>
                <th>Bottle type</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.id}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <img src={p.image} alt={p.container} loading="lazy" style={{ width: 32, height: 32, objectFit: 'contain', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 6, padding: 2 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.size}</td>
                  <td><span className="pill slate" style={{ fontSize: 11 }}>{p.container}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--slate-600)', lineHeight: 1.4 }}>{p.description}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{peso(p.price)}</td>
                  <td><span className="pill blue" style={{ fontSize: 11 }}>{p.typeLabel}</span></td>
                  <td><span className="pill slate" style={{ fontSize: 11 }}>{p.bottleLabel}</span></td>
                  <td>{p.type === 'PURIFIED' ? <span className="pill green" style={{ fontSize: 11 }}>Ready</span> : <span className="pill amber" style={{ fontSize: 11 }}>Soon</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ margin: '0 18px 18px', background: '#f8fafc', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5, display: 'flex', gap: 10 }}>
        <span>💡</span>
        <span><b>Tip:</b> Purified water can be ordered right now. Mineral and Alkaline options will be available soon. Prices depend on whether you already have a gallon, need a new one, or want to borrow.</span>
      </div>
    </div>
  )
}
