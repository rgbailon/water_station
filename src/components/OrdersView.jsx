import { useState, useMemo } from 'react'
import { peso } from '../utils/dateUtils'
import {
  productById,
  OrderStatus,
  ORDER_CONSTANTS,
  paymentOptions,
  scheduleOptions,
  getOrderStatus,
  canCancelOrder,
  formatOrderDate,
  formatOrderDateShort,
} from '../data/ordersData'
import PickUpPrintSheet from './PickUpPrintSheet'
import DeliveryPrintSheet from './DeliveryPrintSheet'

const STATUS_META = {
  PENDING: { label: 'Pending', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  CONFIRMED: { label: 'Order Confirmed', color: '#1a7bb8', bg: '#e0f2fe', border: '#bae6fd' },
  GALLON_TO_GET: { label: 'Gallon Pick Up', color: '#0d9488', bg: '#ccfbf1', border: '#99f6e4' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#059669', bg: '#dcfce7', border: '#a7f3d0' },
  DELIVERED: { label: 'Delivered', color: '#334155', bg: '#e2e8f0', border: '#cbd5e1' },
  CANCELED: { label: 'Canceled', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
}

function StatusPill({ statusId }) {
  const m = STATUS_META[statusId] || STATUS_META.PENDING
  return <span className="pill" style={{ background: m.bg, color: m.color, borderColor: m.border }}>{m.label}</span>
}

function Timeline({ order }) {
  const current = getOrderStatus(order).id
  const steps = ['PENDING', 'CONFIRMED', 'GALLON_TO_GET', 'OUT_FOR_DELIVERY', 'DELIVERED']
  if (current === 'CANCELED') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#dc2626', display: 'inline-block' }}></span>
        <b style={{ color: '#991b1b', fontSize: 13 }}>Canceled</b>
        <span style={{ color: '#7f1d1d', fontSize: 12 }}>• This order was canceled — status stored in database</span>
      </div>
    )
  }
  const idx = steps.indexOf(current)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const active = i <= idx
        const isCurrent = i === idx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800,
              background: active ? (isCurrent ? 'var(--slate-900)' : 'var(--blue-50)') : 'var(--white)',
              color: active ? (isCurrent ? 'var(--white)' : 'var(--blue-700)') : 'var(--slate-400)',
              border: `1.5px solid ${active ? (isCurrent ? 'var(--slate-900)' : 'var(--blue-100)') : 'var(--slate-200)'}`,
            }}>{i + 1}</div>
            <span style={{ fontSize: 11, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#0f172a' : active ? '#1a7bb8' : '#94a3b8' }}>{STATUS_META[s].label}</span>
            {i < steps.length - 1 && <span style={{ width: 18, height: 2, background: i < idx ? '#1a7bb8' : '#e2e8f0', borderRadius: 999 }}></span>}
          </div>
        )
      })}
    </div>
  )
}

function OrderDetailModal({ order, onClose, onCancel, onUpdateStatus }) {
  if (!order) return null
  const status = getOrderStatus(order)
  const canCancel = canCancelOrder(order)
  const borrowed = order.borrowedCount ?? order.borrowed_count ?? order.items.filter(it => (it.is_borrow || it.product?.bottleSituation === 'BORROW')).reduce((s,it)=>s+(it.quantity||0),0)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <div>
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{order.orderId} <StatusPill statusId={status.id} /></h3>
            <p>{formatOrderDate(order.date)} • {order.schedule} • {order.payment} • <span className="pill slate" style={{ fontSize: 11 }}>DB status: {status.label}</span></p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
          <Timeline order={order} />
          {onUpdateStatus && status.id !== 'CANCELED' && status.id !== 'DELIVERED' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700)' }}>Update status:</span>
              <select value={status.id} onChange={e => onUpdateStatus(order.orderId, e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700 }}>
                {Object.values(OrderStatus).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>Changes are saved to Supabase immediately.</span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--slate-500)', marginBottom: 8 }}>Customer details</div>
              <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                <div><span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Name:</span> <b style={{ color: 'var(--slate-900)' }}>{order.customerName}</b></div>
                <div><span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Phone:</span> {order.phone || '—'}</div>
                <div><span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Address:</span> {order.address || '—'}</div>
                <div><span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Delivery time:</span> <span className="pill slate" style={{ padding: '2px 8px' }}>{order.schedule}</span></div>
                <div><span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Payment:</span> <span className="pill blue" style={{ padding: '2px 8px' }}>{order.payment}</span></div>
                <div><span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Notes:</span> {order.notes ? <span style={{ color: 'var(--slate-900)' }}>{order.notes}</span> : <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>No notes</span>}</div>
              </div>
            </div>
            <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--slate-500)', marginBottom: 8 }}>Order summary</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--slate-500)' }}>Order number</span><b style={{ fontFamily: 'var(--mono)', color: 'var(--slate-900)' }}>{order.orderId}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--slate-500)' }}>Date & time</span><span style={{ fontSize: 12 }}>{formatOrderDate(order.date)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--slate-500)' }}>Subtotal</span><b>{peso(order.subtotal)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--slate-500)' }}>Delivery fee</span><b>{peso(order.deliveryFee)} {order.deliveryFee === 0 && <span style={{ fontWeight: 600, color: '#059669' }}>Free</span>}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: borrowed > 0 ? '#fffbeb' : 'var(--white)', border: borrowed > 0 ? '1px solid #fde68a' : '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 8px' }}><span style={{ color: borrowed > 0 ? '#92400e' : 'var(--slate-500)', fontWeight: 700 }}>🤝 Borrowed (audit)</span><b style={{ color: borrowed > 0 ? '#92400e' : 'var(--slate-900)' }}>{borrowed} gals {borrowed > 0 ? <span className="pill amber" style={{ fontSize: 10, marginLeft: 6 }}>Monitored</span> : <span style={{ fontWeight: 500, color: 'var(--slate-400)' }}>— none</span>}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 10px', background: '#0f172a', color: 'white', borderRadius: 8 }}><span>Total amount</span><b>{peso(order.total)}</b></div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)', lineHeight: 1.5, background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px' }}>
                  Free delivery for orders {peso(ORDER_CONSTANTS.MIN_DELIVERY_FREE)} and above. Borrowed is audited in Supabase <code>orders.borrowed_count</code>.
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 13, color: 'var(--slate-900)' }}>🛒 Ordered items ({order.items.length})</b>
              <span style={{ fontSize: 11, color: 'var(--slate-500)', fontWeight: 600 }}>{order.items.reduce((s, it) => s + it.quantity, 0)} items in total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 560, margin: 0 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Water type</th>
                    <th>Bottle type</th>
                    <th>Container</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => {
                    const p = it.product || productById[it.productId]
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--slate-500)', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <img src={p.image} alt={p.container} loading="lazy" style={{ width: 32, height: 32, objectFit: 'contain', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 6, padding: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{p.size} • {p.description.slice(0, 44)}...</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="pill slate" style={{ padding: '2px 6px', fontSize: 11 }}>{p.typeLabel || p.type}</span></td>
                        <td><span className="pill blue" style={{ padding: '2px 6px', fontSize: 11 }}>{p.bottleLabel || p.bottleSituation}</span></td>
                        <td>{p.container}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{peso(p.price)}</td>
                        <td style={{ textAlign: 'center' }}><b style={{ background: 'var(--slate-900)', color: 'var(--white)', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{it.quantity}</b></td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{peso(p.price * it.quantity)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderTop: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'flex-end', fontSize: 13 }}>
              <b style={{ color: 'var(--slate-900)' }}>Subtotal {peso(order.subtotal)} + Delivery {peso(order.deliveryFee)} = {peso(order.total)}</b>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          {canCancel ? (
            <button className="btn-xs danger" style={{ marginRight: 'auto', padding: '8px 14px' }} onClick={() => { onCancel(order.orderId); onClose() }}>Cancel order</button>
          ) : (
            <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--slate-500)' }}>{order.isCanceled ? 'This order is already canceled' : status.id === 'DELIVERED' ? 'Delivered — can no longer be canceled' : 'Cancel available while Pending / Confirmed / Pick Up'}</span>
          )}
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function NewOrderModal({ onClose, onCreate, showToast }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [schedule, setSchedule] = useState('Today')
  const [payment, setPayment] = useState('Cash on Delivery')
  const [notes, setNotes] = useState('')
  const [qtyMap, setQtyMap] = useState({})
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [bottleFilter, setBottleFilter] = useState('ALL')

  const isValid = name.trim() && phone.trim() && address.trim()
  const selectedIds = Object.keys(qtyMap).map(Number).filter(id => qtyMap[id] > 0)
  const hasSelection = selectedIds.length > 0

  const filteredProducts = productById ? Object.values(productById).filter(p => {
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
    if (bottleFilter !== 'ALL' && p.bottleSituation !== bottleFilter) return false
    return true
  }) : []

  const subtotal = selectedIds.reduce((s, id) => s + productById[id].price * qtyMap[id], 0)
  const deliveryFee = subtotal >= ORDER_CONSTANTS.MIN_DELIVERY_FREE ? 0 : ORDER_CONSTANTS.DELIVERY_FEE_FLAT
  const total = subtotal + deliveryFee
  const borrowedCount = selectedIds.reduce((s, id) => s + (productById[id]?.bottleSituation === 'BORROW' ? qtyMap[id] : 0), 0)

  const inc = (id) => {
    const prod = productById[id]
    if (prod && prod.type !== 'PURIFIED') return
    setQtyMap(m => ({ ...m, [id]: Math.min(20, (m[id] || 0) + 1) }))
  }
  const dec = (id) => {
    const prod = productById[id]
    if (prod && prod.type !== 'PURIFIED') return
    setQtyMap(m => {
      const cur = m[id] || 0
      if (cur <= 1) {
        const { [id]: _, ...rest } = m
        return rest
      }
      return { ...m, [id]: cur - 1 }
    })
  }

  const handleCreate = () => {
    if (!isValid) return showToast && showToast('Please enter name, phone and address')
    if (!hasSelection) return showToast && showToast('Please add at least one product')
    const items = selectedIds.map(id => ({ productId: id, quantity: qtyMap[id] }))
    const orderId = `WFR-${Math.floor(1000 + Math.random() * 9000)}`
    const order = {
      orderId,
      date: Date.now(),
      status: 'PENDING',
      customerName: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: items.map(it => ({ ...it, product: productById[it.productId] })),
      subtotal,
      deliveryFee,
      total,
      payment,
      schedule,
      notes: notes.trim(),
      isCanceled: false,
      borrowedCount,
      borrowed_count: borrowedCount,
      isBorrowed: borrowedCount > 0,
      is_borrowed: borrowedCount > 0,
    }
    onCreate(order)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" style={{ maxWidth: 820, maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>New order</h3>
            <p>Choose products and enter customer details — status will be PENDING in database</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          <div style={{ display: 'grid', gap: 12, background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--slate-500)' }}>Customer details</div>
            <div className="grid-2">
              <div className="field">
                <label>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Dela Cruz" />
              </div>
              <div className="field">
                <label>Phone *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912-345-6789" />
              </div>
            </div>
            <div className="field">
              <label>Address *</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Brgy. Monbon, Irosin - Purok 3" />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>When to deliver</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {scheduleOptions.map(opt => (
                    <button key={opt} onClick={() => setSchedule(opt)} className={`pill ${schedule === opt ? 'blue' : 'slate'}`} style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 12, fontWeight: 700, borderWidth: 1 }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>How to pay</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {paymentOptions.map(opt => (
                    <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, opacity: opt.available ? 1 : 0.55 }}>
                      <input type="radio" name="payment" checked={payment === opt.label} disabled={!opt.available} onChange={() => setPayment(opt.label)} />
                      {opt.label} {!opt.available && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>Not yet available</span>}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Leave at gate, 2nd floor, call on arrival..." />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
              <span className="pill" style={{ background: isValid ? '#dcfce7' : '#fee2e2', color: isValid ? '#065f46' : '#991b1b', borderColor: isValid ? '#a7f3d0' : '#fecaca' }}>{isValid ? 'Ready to order' : 'Please fill in all required fields'}</span>
              <span style={{ color: 'var(--slate-500)' }}>Name, phone and address are required</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--slate-900)' }}>Choose products</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 600 }}>
                  <option value="ALL">All water types</option>
                  <option value="PURIFIED">Purified</option>
                  <option value="MINERAL">Mineral</option>
                  <option value="ALKALINE">Alkaline</option>
                </select>
                <select value={bottleFilter} onChange={e => setBottleFilter(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 600 }}>
                  <option value="ALL">All bottle types</option>
                  <option value="WITH_GALLON">With Gallon</option>
                  <option value="NEEDS_GALLON">New Gallon</option>
                  <option value="BORROW">Borrow</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10, maxHeight: 340, overflow: 'auto', padding: 4 }}>
              {filteredProducts.map(p => {
                const qty = qtyMap[p.id] || 0
                const isSelected = qty > 0
                const isPurified = p.type === 'PURIFIED'
                return (
                  <div key={p.id} title={!isPurified ? 'Coming soon — not available for ordering' : undefined} style={{
                    background: isSelected ? 'var(--blue-50)' : 'var(--slate-50)',
                    border: `1.5px solid ${isSelected ? 'var(--blue-100)' : 'var(--slate-200)'}`,
                    borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
                    opacity: !isPurified ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <img src={p.image} alt={p.container} loading="lazy" style={{ width: 32, height: 32, objectFit: 'contain', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 6, padding: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.1 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{p.size} • {p.container} • {p.bottleLabel}</div>
                      </div>
                      {!isPurified && <span className="pill amber" style={{ fontSize: 10, padding: '2px 6px' }}>Coming soon</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate-600)', lineHeight: 1.35, minHeight: 30 }}>{p.description.slice(0, 70)}...</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: 14 }}>{peso(p.price)}</span>
                      <span className="pill slate" style={{ fontSize: 11 }}>{p.typeLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)' }}>Quantity</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn-xs" disabled={!isPurified || qty <= 0} onClick={() => dec(p.id)} title={!isPurified ? 'Coming soon — not available' : undefined} style={{ width: 28, opacity: (!isPurified || qty <= 0) ? 0.5 : 1, cursor: !isPurified ? 'not-allowed' : 'pointer' }}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: 13, background: isSelected ? 'var(--slate-900)' : 'var(--slate-100)', color: isSelected ? 'var(--white)' : 'var(--slate-700)', padding: '4px 8px', borderRadius: 999, opacity: !isPurified ? 0.5 : 1 }}>{qty || 0}</span>
                        <button className="btn-xs primary" onClick={() => inc(p.id)} disabled={!isPurified || qty >= 20} title={!isPurified ? 'Coming soon — not available' : undefined} style={{ width: 28, background: 'var(--blue-600)', color: 'white', borderColor: 'var(--blue-600)', opacity: (!isPurified || qty >= 20) ? 0.5 : 1, cursor: !isPurified ? 'not-allowed' : 'pointer' }}>+</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {selectedIds.length === 0 && <div style={{ textAlign: 'center', padding: 12, color: 'var(--slate-500)', fontSize: 13, background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: 10, marginTop: 8 }}>No products added yet — tap <b>+</b> to add items to your order</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-500)' }}>Subtotal ({selectedIds.reduce((s, id) => s + qtyMap[id], 0)} items)</span><b>{peso(subtotal)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-500)' }}>Delivery fee</span><b style={{ color: deliveryFee === 0 ? '#059669' : 'var(--slate-900)' }}>{peso(deliveryFee)} {deliveryFee === 0 ? 'Free' : ''}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: borrowedCount > 0 ? '#fffbeb' : 'transparent', border: borrowedCount > 0 ? '1px solid #fde68a' : 'none', borderRadius: 6, padding: borrowedCount > 0 ? '4px 6px' : 0 }}><span style={{ color: borrowedCount > 0 ? '#92400e' : 'var(--slate-500)', fontWeight: 700 }}>🤝 Borrowed (audit)</span><b style={{ color: borrowedCount > 0 ? '#92400e' : 'var(--slate-900)' }}>{borrowedCount} gals {borrowedCount > 0 && <span className="pill amber" style={{ fontSize: 10, marginLeft: 4 }}>Monitored</span>}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}><span>Total</span><span style={{ color: 'var(--slate-900)' }}>{peso(total)}</span></div>
              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Free delivery for orders {peso(ORDER_CONSTANTS.MIN_DELIVERY_FREE)} and above • Borrowed audited in <code>orders.borrowed_count</code></div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <button className="btn-save" disabled={!isValid || !hasSelection} style={{ opacity: !isValid || !hasSelection ? 0.5 : 1, padding: '12px 18px', fontSize: 14 }} onClick={handleCreate}>
                Place order
              </button>
              <span style={{ fontSize: 11, color: 'var(--slate-500)', textAlign: 'center' }}>{new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={!isValid || !hasSelection} style={{ opacity: !isValid || !hasSelection ? 0.5 : 1 }} onClick={handleCreate}>Create order</button>
        </div>
      </div>
    </div>
  )
}

export default function OrdersView({ orders, onUpdateOrders, onCancelOrder, onCreateOrder, onUpdateStatus, showToast, dbStatus }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [scheduleFilter, setScheduleFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [borrowedFilter, setBorrowedFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [pickUpPrint, setPickUpPrint] = useState(null)
  const [deliveryPrint, setDeliveryPrint] = useState(null)
  const [statsCollapsed, setStatsCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('ordersStatsCollapsed')
      return v === null ? true : v === 'true'
    } catch { return true }
  })

  const stats = useMemo(() => {
    const total = orders.length
    const canceled = orders.filter(o => getOrderStatus(o).id === 'CANCELED').length
    const byStatus = {}
    orders.forEach(o => {
      const s = getOrderStatus(o).id
      byStatus[s] = (byStatus[s] || 0) + 1
    })
    const active = (byStatus.PENDING || 0) + (byStatus.CONFIRMED || 0) + (byStatus.GALLON_TO_GET || 0) + (byStatus.OUT_FOR_DELIVERY || 0)
    const delivered = byStatus.DELIVERED || 0
    const revenue = orders.filter(o => getOrderStatus(o).id !== 'CANCELED').reduce((s, o) => s + o.total, 0)
    const avg = total - canceled > 0 ? revenue / (total - canceled) : 0
    const borrowedOrders = orders.filter(o => (o.borrowedCount ?? o.borrowed_count ?? 0) > 0).length
    const totalBorrowed = orders.reduce((s, o) => s + (o.borrowedCount ?? o.borrowed_count ?? 0), 0)
    return { total, canceled, active, delivered, revenue, avg, byStatus, borrowedOrders, totalBorrowed }
  }, [orders])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const st = getOrderStatus(o).id
      if (statusFilter !== 'ALL' && st !== statusFilter) return false
      if (scheduleFilter !== 'ALL' && o.schedule !== scheduleFilter) return false
      if (paymentFilter !== 'ALL' && o.payment !== paymentFilter) return false
      if (borrowedFilter !== 'ALL') {
        const bc = o.borrowedCount ?? o.borrowed_count ?? 0
        if (borrowedFilter === 'BORROWED' && bc === 0) return false
        if (borrowedFilter === 'NOT_BORROWED' && bc > 0) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${o.orderId} ${o.customerName} ${o.phone || ''} ${o.address || ''} ${o.notes || ''} ${o.status || ''} ${o.items.map(it => (it.product || productById[it.productId])?.name || '').join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.date - a.date)
  }, [orders, statusFilter, scheduleFilter, paymentFilter, borrowedFilter, search])

  const handleCancel = (orderId) => {
    if (onCancelOrder) return onCancelOrder(orderId)
    onUpdateOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'CANCELED', isCanceled: true } : o))
    showToast && showToast('Order canceled')
  }

  const handleStatusChange = (orderId, newStatus) => {
    if (onUpdateStatus) return onUpdateStatus(orderId, newStatus)
    onUpdateOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: newStatus, isCanceled: newStatus === 'CANCELED' } : o))
    showToast && showToast(`Order ${orderId} → ${newStatus}`)
  }

  const handleCreate = (newOrder) => {
    if (onCreateOrder) {
      onCreateOrder(newOrder)
      setShowNew(false)
      return
    }
    let id = newOrder.orderId
    while (orders.some(o => o.orderId === id)) {
      id = `WFR-${Math.floor(1000 + Math.random() * 9000)}`
    }
    const order = { ...newOrder, orderId: id, status: newOrder.status || 'PENDING' }
    onUpdateOrders(prev => [order, ...prev])
    setShowNew(false)
    showToast && showToast(`Order ${id} placed — total ${peso(order.total)}`)
  }

  const pickUpList = useMemo(() => orders.filter(o => {
    const s = getOrderStatus(o).id
    return s === OrderStatus.CONFIRMED.id || s === OrderStatus.GALLON_TO_GET.id
  }), [orders])
  const deliveryList = useMemo(() => orders.filter(o => getOrderStatus(o).id === OrderStatus.OUT_FOR_DELIVERY.id), [orders])

  return (
    <div>
      <div className="section-head" style={{ borderTop: 'none' }}>
        <div>
          <h2>🧾 Orders</h2>
          <p>Database-driven status — update manually, no timers {dbStatus?.mode==='online' ? <span className="pill green" style={{ fontSize: 11 }}>Supabase live • status column</span> : '• Offline fallback'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn-xs"
            style={{ padding: '9px 14px', fontSize: 13, background: pickUpList.length ? '#fef3c7' : 'var(--white)', borderColor: pickUpList.length ? '#fde68a' : 'var(--slate-200)', color: pickUpList.length ? '#92400e' : 'var(--slate-400)' }}
            onClick={() => pickUpList.length && setPickUpPrint({ mode: 'all' })}
            disabled={pickUpList.length === 0}
          >
            🛻 Pick-Up {pickUpList.length ? `(${pickUpList.length})` : ''}
          </button>
          <button
            className="btn-xs"
            style={{ padding: '9px 14px', fontSize: 13, background: deliveryList.length ? '#dcfce7' : 'var(--white)', borderColor: deliveryList.length ? '#a7f3d0' : 'var(--slate-200)', color: deliveryList.length ? '#065f46' : 'var(--slate-400)' }}
            onClick={() => deliveryList.length && setDeliveryPrint({ mode: 'all' })}
            disabled={deliveryList.length === 0}
          >
            🚚 Delivery {deliveryList.length ? `(${deliveryList.length})` : ''}
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--blue-600)', color: 'white' }} onClick={() => setShowNew(true)}><span className="plus">+</span> New order</button>
        </div>
      </div>

      <div style={{ margin: '0 18px', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 6px' }}>
        <button
          onClick={() => setStatsCollapsed(v => { const n = !v; try { localStorage.setItem('ordersStatsCollapsed', String(n)) } catch {} return n })}
          className="btn-xs"
          style={{ padding: '6px 10px', fontSize: 12, fontWeight: 700, background: statsCollapsed ? 'var(--white)' : 'var(--slate-900)', color: statsCollapsed ? 'var(--slate-700)' : 'var(--white)', borderColor: 'var(--slate-200)' }}
          aria-expanded={!statsCollapsed}
          title={statsCollapsed ? 'Show summary stats' : 'Hide summary stats'}
        >
          {statsCollapsed ? '▶ Show summary' : '▼ Hide summary'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>
          {statsCollapsed ? `${stats.total} orders • ${stats.delivered} delivered • ${peso(stats.revenue)} total • ${stats.borrowedOrders} borrowed (${stats.totalBorrowed} gals)` : 'Summary — click to hide and reduce clutter'}
        </span>
        {!statsCollapsed && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--slate-400)' }}>Hidden by default • Audited</span>}
      </div>
      {!statsCollapsed && (
        <div className="stats-grid" style={{ paddingTop: 0 }}>
          <div className="stat-card blue">
            <div className="stat-top"><span className="stat-label">Total orders</span><span className="stat-icon">🧾</span></div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-trend trend-up">{stats.active} in progress • {stats.canceled} canceled</div>
          </div>
          <div className="stat-card green">
            <div className="stat-top"><span className="stat-label">Delivered</span><span className="stat-icon">✅</span></div>
            <div className="stat-value">{stats.delivered}</div>
            <div className="stat-trend trend-up">{stats.active} still pending</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-top"><span className="stat-label">Total sales</span><span className="stat-icon">💧</span></div>
            <div className="stat-value">{peso(stats.revenue)}</div>
            <div className="stat-trend" style={{ color: '#92400e' }}>Average {peso(Math.round(stats.avg))}</div>
          </div>
          <div className="stat-card slate" style={{ border: '1px solid #fde68a', background: '#fffbeb' }}>
            <div className="stat-top"><span className="stat-label">Borrowed (audit)</span><span className="stat-icon">🤝</span></div>
            <div className="stat-value" style={{ color: stats.totalBorrowed > 0 ? '#92400e' : 'var(--slate-900)' }}>{stats.totalBorrowed} gals</div>
            <div className="stat-trend" style={{ color: '#92400e' }}>{stats.borrowedOrders} orders • monitored</div>
          </div>
        </div>
      )}

      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order number, customer, or status..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13, background: 'var(--white)', color: 'var(--slate-700)' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 14 }}>⌕</span>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All statuses</option>
          {Object.values(OrderStatus).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={scheduleFilter} onChange={e => setScheduleFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All schedules</option>
          {scheduleOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All payment methods</option>
          {paymentOptions.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
        </select>
        <select value={borrowedFilter} onChange={e => setBorrowedFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: borrowedFilter !== 'ALL' ? '#fffbeb' : 'var(--white)', color: 'var(--slate-700)', borderColor: borrowedFilter !== 'ALL' ? '#fde68a' : 'var(--slate-200)' }}>
          <option value="ALL">All borrowed</option>
          <option value="BORROWED">Borrowed only ({stats.borrowedOrders})</option>
          <option value="NOT_BORROWED">No borrowed</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} of {orders.length} orders • {stats.totalBorrowed} gals borrowed</span>
        {(search || statusFilter !== 'ALL' || scheduleFilter !== 'ALL' || paymentFilter !== 'ALL' || borrowedFilter !== 'ALL') && (
          <button className="btn-xs" onClick={() => { setSearch(''); setStatusFilter('ALL'); setScheduleFilter('ALL'); setPaymentFilter('ALL'); setBorrowedFilter('ALL') }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#0ea5e9', display: 'inline-block' }}></span> DB synced
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '10px 18px', flexWrap: 'wrap' }}>
        {['ALL', ...Object.keys(OrderStatus)].map(id => {
          const isAll = id === 'ALL'
          const active = statusFilter === id
          const label = isAll ? 'All' : STATUS_META[id]?.label || id
          const count = isAll ? orders.length : orders.filter(o => getOrderStatus(o).id === id).length
          return (
            <button key={id} onClick={() => setStatusFilter(id)} style={{
              padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${active ? 'var(--slate-900)' : 'var(--slate-200)'}`,
              background: active ? 'var(--slate-900)' : 'var(--white)', color: active ? 'var(--white)' : 'var(--slate-700)', cursor: 'pointer'
            }}>
              {label} <span style={{ opacity: 0.7, fontWeight: 600 }}>({count})</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 18px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate-500)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Borrowed audit:</span>
        {[
          { id: 'ALL', label: 'All', count: orders.length },
          { id: 'BORROWED', label: 'Borrowed only', count: stats.borrowedOrders },
          { id: 'NOT_BORROWED', label: 'No borrowed', count: orders.length - stats.borrowedOrders },
        ].map(f => {
          const active = borrowedFilter === f.id
          return (
            <button key={f.id} onClick={() => setBorrowedFilter(f.id)} style={{
              padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              border: `1px solid ${active ? '#92400e' : 'var(--slate-200)'}`,
              background: active ? '#fffbeb' : 'var(--white)', color: active ? '#92400e' : 'var(--slate-700)', cursor: 'pointer'
            }}>
              {f.label} <span style={{ opacity: 0.7, fontWeight: 600 }}>({f.count})</span>
            </button>
          )
        })}
        <span style={{ fontSize: 11, color: 'var(--slate-500)', marginLeft: 6, fontWeight: 600 }}>{stats.totalBorrowed} gals total borrowed • monitored in DB</span>
      </div>

      <div className="table-wrap" style={{ paddingTop: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Order number</th>
              <th>Date & time</th>
              <th>Customer</th>
              <th>Items</th>
              <th style={{ textAlign: 'center' }}>Borrowed</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Status</th>
              <th>Change status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)' }}>No orders found.</td></tr>
            ) : filtered.map(order => {
              const st = getOrderStatus(order)
              const canCancel = canCancelOrder(order)
              const borrowed = order.borrowedCount ?? order.borrowed_count ?? 0
              return (
                <tr key={order.orderId} style={borrowed > 0 ? { background: '#fffbeb' } : undefined}>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <b style={{ fontFamily: 'var(--mono)', color: 'var(--slate-900)', fontSize: 13 }}>{order.orderId}</b>
                      <button className="btn-xs" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(order.orderId); showToast && showToast('Copied ' + order.orderId) }} title="Copy">⎘</button>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-900)' }}>{formatOrderDateShort(order.date)}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{order.status}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: 13 }}>{order.customerName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>{order.phone || '—'} • {order.address}</div>
                    {order.notes && <div style={{ fontSize: 11.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 6px', marginTop: 4, display: 'inline-block' }}>📝 {order.notes}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
                      {order.items.map((it, i) => {
                        const p = it.product || productById[it.productId]
                        const isBorrow = it.is_borrow || p?.bottleSituation === 'BORROW'
                        return <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{p.name} ({p.container})</span>
                          <span style={{ color: 'var(--slate-500)' }}>×{it.quantity}</span>
                          {isBorrow && <span className="pill amber" style={{ fontSize: 10, padding: '1px 5px' }}>Borrow</span>}
                        </div>
                      })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {borrowed > 0 ? <span className="pill amber" style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderColor: '#fde68a' }}>🤝 {borrowed} gals</span> : <span className="pill slate" style={{ fontSize: 11 }}>— 0</span>}
                    {borrowed > 0 && <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginTop: 2 }}>Audit</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--slate-900)' }}>{peso(order.total)}</td>
                  <td><StatusPill statusId={st.id} /></td>
                  <td>
                    <select value={st.id} onChange={e => handleStatusChange(order.orderId, e.target.value)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 600, background: 'var(--white)' }}>
                      {Object.values(OrderStatus).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button className="btn-xs" style={{ padding: '6px 10px' }} onClick={() => setSelected(order)}>View</button>
                      {canCancel && <button className="btn-xs danger" style={{ padding: '6px 10px' }} onClick={() => handleCancel(order.orderId)}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ margin: '0 18px 18px', display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 14 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--slate-900)' }}>How order status works</h3>
          <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.5 }}>
            <div>Order status is now stored in Supabase column <code>orders.status</code> — no automatic timers. Update via dropdown or detail view.</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, fontWeight: 700 }}>
              <span className="pill" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>Pending</span>
              <span>→</span>
              <span className="pill" style={{ background: '#e0f2fe', color: '#0c4a6e', borderColor: '#bae6fd' }}>Confirmed</span>
              <span>→</span>
              <span className="pill" style={{ background: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4' }}>Pick Up</span>
              <span>→</span>
              <span className="pill" style={{ background: '#dcfce7', color: '#065f46', borderColor: '#a7f3d0' }}>Out for delivery</span>
              <span>→</span>
              <span className="pill" style={{ background: '#e2e8f0', color: '#334155', borderColor: '#cbd5e1' }}>Delivered</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate-500)', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px' }}>
              Cancel is only allowed while status is Pending / Confirmed / Gallon Pick Up. Delivered orders cannot be canceled.
            </div>
          </div>
        </div>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 14 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#92400e' }}>🤝 Borrowed audit</h3>
          <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6, display: 'grid', gap: 8 }}>
            <div><code>orders.borrowed_count</code> is audited per order — sum of Borrow gallons. Use Borrowed filter above or Borrowed column to monitor. Trigger <code>order_items_borrowed_sync</code> keeps it accurate.</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pill amber">Borrowed monitored</span>
              <span className="pill green">DB synced</span>
              <span className="pill slate">{stats.totalBorrowed} gals total</span>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onCancel={handleCancel}
          onUpdateStatus={handleStatusChange}
        />
      )}
      {showNew && (
        <NewOrderModal onClose={() => setShowNew(false)} onCreate={handleCreate} showToast={showToast} />
      )}
      {pickUpPrint && (
        <PickUpPrintSheet
          orders={pickUpList}
          singleOrder={pickUpPrint.mode === 'single' ? pickUpPrint.order : null}
          onClose={() => setPickUpPrint(null)}
        />
      )}
      {deliveryPrint && (
        <DeliveryPrintSheet
          orders={deliveryList}
          singleOrder={deliveryPrint.mode === 'single' ? deliveryPrint.order : null}
          onClose={() => setDeliveryPrint(null)}
        />
      )}
    </div>
  )
}
