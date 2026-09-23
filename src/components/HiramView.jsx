import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { peso } from '../utils/dateUtils'
import { exportOrdersExcel } from '../utils/export'
import { getOrderDisplayTotal } from '../data/ordersData'

// Same gate as Products tab. Set VITE_DELETE_PASSWORD in .env
// (same value as PGPASSWORD) — frontend can't read bare PGPASSWORD.
const DELETE_PASSWORD = import.meta.env.VITE_DELETE_PASSWORD || ''

export default function HiramView({ orders = [], onDeleteOrder }) {
  const [search, setSearch] = useState('')
  const [barangayFilter, setBarangayFilter] = useState('ALL')

  // ---- Delete borrowed order (database password gate) ----
  const [deletingOrder, setDeletingOrder] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const openDelete = (o) => { setDeletingOrder(o); setDeletePassword(''); setDeleteError(''); setDeleting(false) }
  const closeDelete = () => { if (!deleting) { setDeletingOrder(null); setDeletePassword(''); setDeleteError('') } }
  const confirmDelete = async () => {
    if (!deletingOrder || deleting) return
    if (!DELETE_PASSWORD) {
      setDeleteError('Delete password not configured — set VITE_DELETE_PASSWORD in .env (same as database PGPASSWORD) and restart.')
      return
    }
    if (deletePassword !== DELETE_PASSWORD) {
      setDeleteError('Incorrect database password — order not deleted.')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      if (onDeleteOrder) await onDeleteOrder(deletingOrder.orderId)
      setDeletingOrder(null)
      setDeletePassword('')
    } catch (e) {
      setDeleteError(`Delete failed: ${e?.message || e}`)
    } finally {
      setDeleting(false)
    }
  }

  const borrowedOrders = useMemo(() => {
    return (orders || []).filter(o => (o.borrowedCount ?? o.borrowed_count ?? 0) > 0)
  }, [orders])

  const barangays = useMemo(() => {
    const set = new Set(borrowedOrders.map(o => (o.address || '').split(',')[0].trim() || '—'))
    return ['ALL', ...Array.from(set).sort()]
  }, [borrowedOrders])

  const filtered = useMemo(() => {
    return borrowedOrders.filter(o => {
      if (barangayFilter !== 'ALL') {
        const b = (o.address || '').split(',')[0].trim()
        if (b !== barangayFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${o.orderId} ${o.customerName} ${o.phone || ''} ${o.address || ''} ${o.borrowedCount ?? o.borrowed_count ?? ''} ${o.items.map(it => (it.product?.name || '')).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.date - a.date)
  }, [borrowedOrders, barangayFilter, search])

  const totals = useMemo(() => {
    const totalBorrowed = filtered.reduce((s, o) => s + (o.borrowedCount ?? o.borrowed_count ?? 0), 0)
    return { totalBorrowed, count: filtered.length }
  }, [filtered])

  const handleExport = () => {
    if (filtered.length === 0) return
    exportOrdersExcel(filtered)
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>🤝 Borrowed — Customers</h2>
          <p>All customers who borrowed gallons • Audited from <code>orders.borrowed_count</code> • No dummy accounts • <span className="pill amber" style={{ fontSize: 11 }}>{filtered.length} borrowed orders</span> <span className="pill slate" style={{ fontSize: 11 }}>{totals.totalBorrowed} gals total</span></p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-xs" style={{ padding: '9px 14px', fontSize: '13px' }} onClick={handleExport} disabled={filtered.length===0} title={filtered.length ? 'Download borrowed orders' : 'No borrowed orders to export'}>⬇ Download</button>
          <span className="pill green" style={{ fontSize: 11, padding: '6px 10px' }}>Real orders only</span>
        </div>
      </div>

      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order, customer, phone, address..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13, background: 'var(--white)', color: 'var(--slate-700)' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 14 }}>⌕</span>
        </div>
        <select value={barangayFilter} onChange={e => setBarangayFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          {barangays.map(b => <option key={b} value={b}>{b === 'ALL' ? 'All barangays' : b}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} of {borrowedOrders.length} borrowed</span>
        {(search || barangayFilter !== 'ALL') && <button className="btn-xs" onClick={() => { setSearch(''); setBarangayFilter('ALL') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, fontWeight: 700 }}>
          <span className="pill amber">Borrowed {totals.totalBorrowed} gals</span>
        </span>
      </div>

      <div className="table-wrap">
        <table className="table borrowed-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer — all details</th>
              <th>Address / Barangay</th>
              <th>Borrowed</th>
              <th>Items</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)' }}>
                {borrowedOrders.length === 0 ? 'No borrowed gallons yet — orders with Borrow items will appear here (no dummy accounts).' : 'No borrowed orders match your search.'}
              </td></tr>
            ) : filtered.map(o => {
              const borrowed = o.borrowedCount ?? o.borrowed_count ?? 0
              const barangay = (o.address || '').split(',')[0].trim() || '—'
              return (
                <tr key={o.orderId}>
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--slate-900)', fontSize: 13 }}>{o.orderId}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{new Date(o.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</div>
                    <div style={{ fontSize: 10, color: 'var(--slate-400)' }}>{o.schedule} • {o.payment}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{o.customerName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate-600)' }}>{o.phone || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.address || '—'}</div>
                    {o.notes && <div style={{ fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 6px', marginTop: 4, display: 'inline-block' }}>📝 {o.notes}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: 13 }}>{barangay}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{o.address || '—'}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="pill amber" style={{ fontSize: 13, fontWeight: 800, padding: '4px 10px', borderColor: '#fde68a' }}>🤝 {borrowed} gals</span>
                    <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginTop: 4 }}>Audit: {o.is_borrowed || o.isBorrowed ? 'Borrowed' : '—'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
                      {o.items.map((it, i) => {
                        const p = it.product || {}
                        const isBorrow = it.is_borrow || p.bottleSituation === 'BORROW'
                        return (
                          <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{p.name || `PID ${it.productId}`} {p.container ? `(${p.container})` : ''}</span>
                            <span style={{ color: 'var(--slate-500)' }}>×{it.quantity}</span>
                            {isBorrow && <span className="pill amber" style={{ fontSize: 10, padding: '1px 5px' }}>Borrow</span>}
                            {!isBorrow && <span className="pill slate" style={{ fontSize: 10, padding: '1px 5px' }}>{p.bottleLabel || p.bottleSituation || ''}</span>}
                          </div>
                        )
                      })}
                      <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>{o.items.reduce((s, it) => s + it.quantity, 0)} items • {peso(o.subtotal)} subtotal</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--slate-900)' }}>
                    <div>{peso(getOrderDisplayTotal(o))}</div>
                    {getOrderDisplayTotal(o)!==o.total && <div style={{ fontSize:10, color:'#92400e' }}>container price</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button className="btn-xs" onClick={() => alert(`Call ${o.customerName} — ${o.phone || 'no phone'}`)}>📞 Call</button>
                      <button className="btn-xs" onClick={() => { navigator.clipboard.writeText(o.orderId); alert(`Copied ${o.orderId}`) }} title="Copy order ID">⎘ Copy</button>
                      <button className="btn-xs danger" onClick={() => openDelete(o)} title={`Delete borrowed order ${o.orderId}`}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ margin: '0 18px 18px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', fontSize: '13px', color: '#92400e', display: 'flex', gap: 10 }}>
        <span>⚠️</span>
        <span><b>Audit:</b> Borrowed is tracked per order in Supabase <code>orders.borrowed_count</code> / <code>is_borrowed</code> (trigger <code>order_items_borrowed_sync</code>). No dummy accounts — only real customers with Borrow items appear here. Use Download to export for audit. Delete requires the database password.</span>
      </div>

      {deletingOrder && createPortal((
        <div className="modal-overlay" onClick={closeDelete}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <div>
                <h3>🗑 Delete Borrowed Order • {deletingOrder.orderId}</h3>
                <p>{deletingOrder.customerName} — 🤝 {deletingOrder.borrowedCount ?? deletingOrder.borrowed_count ?? 0} gals • {peso(getOrderDisplayTotal(deletingOrder))}</p>
              </div>
              <button className="btn-close" onClick={closeDelete}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                <b>This cannot be undone.</b> The borrowed order and its items will be permanently removed from Supabase and this device.
              </div>
              <div className="field">
                <label>Database password *</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmDelete() }}
                  placeholder="Enter database password to confirm"
                  autoFocus
                  autoComplete="off"
                />
                <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>Without the database password, deletion is blocked.</span>
              </div>
              {deleteError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#991b1b' }}>
                  {deleteError}
                </div>
              )}
              {!DELETE_PASSWORD && !deleteError && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#92400e' }}>
                  Delete password not configured — set <code>VITE_DELETE_PASSWORD</code> in <code>.env</code> (same as database <code>PGPASSWORD</code>) and restart.
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={closeDelete} disabled={deleting}>Cancel</button>
              <button
                className="btn-save"
                onClick={confirmDelete}
                disabled={deleting || !deletePassword.trim()}
                style={{ background: '#dc2626', boxShadow: '0 4px 10px rgba(220,38,38,0.3)', opacity: deleting || !deletePassword.trim() ? 0.5 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
