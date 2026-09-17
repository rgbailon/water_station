import { useState, useEffect, useMemo } from 'react'
import { peso } from '../utils/dateUtils'
import {
  sampleProducts,
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

function Timeline({ order, now }) {
  const current = getOrderStatus(order, now).id
  const steps = ['PENDING', 'CONFIRMED', 'GALLON_TO_GET', 'OUT_FOR_DELIVERY', 'DELIVERED']
  if (current === 'CANCELED') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#dc2626', display: 'inline-block' }}></span>
        <b style={{ color: '#991b1b', fontSize: 13 }}>Canceled</b>
        <span style={{ color: '#7f1d1d', fontSize: 12 }}>• This order was canceled by the customer</span>
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

function OrderDetailModal({ order, now, onClose, onCancel, onPrintPickUp, onPrintDelivery }) {
  if (!order) return null
  const status = getOrderStatus(order, now)
  const canCancel = canCancelOrder(order, now)
  const isPickUp = status.id === OrderStatus.CONFIRMED.id || status.id === OrderStatus.GALLON_TO_GET.id
  const isDelivery = status.id === OrderStatus.OUT_FOR_DELIVERY.id
  const elapsed = now - order.date
  const remaining = Math.max(0, ORDER_CONSTANTS.CANCEL_WINDOW_MS - elapsed)
  const remainingSec = Math.ceil(remaining / 1000)
  const mins = Math.floor(remainingSec / 60)
  const secs = remainingSec % 60
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <div>
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{order.orderId} <StatusPill statusId={status.id} /></h3>
            <p>{formatOrderDate(order.date)} • {order.schedule} • {order.payment} {canCancel && <span style={{ color: '#d97706', fontWeight: 700 }}>• You can still cancel: {mins}:{String(secs).padStart(2, '0')} left</span>}</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
          <Timeline order={order} now={now} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 10px', background: '#0f172a', color: 'white', borderRadius: 8 }}><span>Total amount</span><b>{peso(order.total)}</b></div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)', lineHeight: 1.5, background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px' }}>
                  Free delivery for orders {peso(ORDER_CONSTANTS.MIN_DELIVERY_FREE)} and above.
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
            <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--slate-500)' }}>{order.isCanceled ? 'This order is already canceled' : status.id === 'DELIVERED' ? 'Delivered — can no longer be canceled' : 'Can only be canceled within 5 minutes while order is still being prepared'}</span>
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

  const filteredProducts = sampleProducts.filter(p => {
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
    if (bottleFilter !== 'ALL' && p.bottleSituation !== bottleFilter) return false
    return true
  })

  const subtotal = selectedIds.reduce((s, id) => s + productById[id].price * qtyMap[id], 0)
  const deliveryFee = subtotal >= ORDER_CONSTANTS.MIN_DELIVERY_FREE ? 0 : ORDER_CONSTANTS.DELIVERY_FEE_FLAT
  const total = subtotal + deliveryFee

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
    }
    onCreate(order)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" style={{ maxWidth: 820, maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>New order</h3>
            <p>Choose products and enter customer details</p>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}><span>Total</span><span style={{ color: 'var(--slate-900)' }}>{peso(total)}</span></div>
              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Free delivery for orders {peso(ORDER_CONSTANTS.MIN_DELIVERY_FREE)} and above</div>
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

export default function OrdersView({ orders, onUpdateOrders, showToast }) {
  const [now, setNow] = useState(() => Date.now())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [scheduleFilter, setScheduleFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [pickUpPrint, setPickUpPrint] = useState(null) // null | { mode: 'all' } | { mode: 'single', order }
  const [deliveryPrint, setDeliveryPrint] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    const total = orders.length
    const canceled = orders.filter(o => o.isCanceled).length
    const byStatus = {}
    orders.forEach(o => {
      const s = getOrderStatus(o, now).id
      byStatus[s] = (byStatus[s] || 0) + 1
    })
    const active = (byStatus.PENDING || 0) + (byStatus.CONFIRMED || 0) + (byStatus.GALLON_TO_GET || 0) + (byStatus.OUT_FOR_DELIVERY || 0)
    const delivered = byStatus.DELIVERED || 0
    const revenue = orders.filter(o => !o.isCanceled).reduce((s, o) => s + o.total, 0)
    const avg = total - canceled > 0 ? revenue / (total - canceled) : 0
    const todayRevenue = orders.filter(o => {
      const d = new Date(o.date)
      const t = new Date(now)
      return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) === t.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) && !o.isCanceled
    }).reduce((s, o) => s + o.total, 0)
    return { total, canceled, active, delivered, revenue, avg, todayRevenue }
  }, [orders, now])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const st = getOrderStatus(o, now).id
      if (statusFilter !== 'ALL' && st !== statusFilter) return false
      if (scheduleFilter !== 'ALL' && o.schedule !== scheduleFilter) return false
      if (paymentFilter !== 'ALL' && o.payment !== paymentFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${o.orderId} ${o.customerName} ${o.phone || ''} ${o.address || ''} ${o.notes || ''} ${o.items.map(it => (it.product || productById[it.productId])?.name || '').join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.date - a.date)
  }, [orders, now, statusFilter, scheduleFilter, paymentFilter, search])

  const handleCancel = (orderId) => {
    onUpdateOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, isCanceled: true } : o))
    showToast && showToast('Order canceled')
  }

  const handleCreate = (newOrder) => {
    let id = newOrder.orderId
    while (orders.some(o => o.orderId === id)) {
      id = `WFR-${Math.floor(1000 + Math.random() * 9000)}`
    }
    const order = { ...newOrder, orderId: id }
    onUpdateOrders(prev => [order, ...prev])
    setShowNew(false)
    showToast && showToast(`Order ${id} placed — total ${peso(order.total)}`)
  }

  const pickUpList = useMemo(() => orders.filter(o => {
    const s = getOrderStatus(o, now).id
    return s === OrderStatus.CONFIRMED.id || s === OrderStatus.GALLON_TO_GET.id
  }), [orders, now])
  const deliveryList = useMemo(() => orders.filter(o => getOrderStatus(o, now).id === OrderStatus.OUT_FOR_DELIVERY.id), [orders, now])

  return (
    <div>
      <div className="section-head" style={{ borderTop: 'none' }}>
        <div>
          <h2>🧾 Orders</h2>
          <p>View and manage customer orders — status updates automatically as orders are prepared and delivered</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn-xs"
            style={{ padding: '9px 14px', fontSize: 13, background: pickUpList.length ? '#fef3c7' : 'var(--white)', borderColor: pickUpList.length ? '#fde68a' : 'var(--slate-200)', color: pickUpList.length ? '#92400e' : 'var(--slate-400)' }}
            onClick={() => pickUpList.length && setPickUpPrint({ mode: 'all' })}
            disabled={pickUpList.length === 0}
            title={pickUpList.length ? `Print pick-up guide for ${pickUpList.length} confirmed order${pickUpList.length !== 1 ? 's' : ''} — hand to rider` : 'No confirmed orders needing pick-up right now'}
          >
            🛻 Pick-Up {pickUpList.length ? `(${pickUpList.length})` : ''}
          </button>
          <button
            className="btn-xs"
            style={{ padding: '9px 14px', fontSize: 13, background: deliveryList.length ? '#dcfce7' : 'var(--white)', borderColor: deliveryList.length ? '#a7f3d0' : 'var(--slate-200)', color: deliveryList.length ? '#065f46' : 'var(--slate-400)' }}
            onClick={() => deliveryList.length && setDeliveryPrint({ mode: 'all' })}
            disabled={deliveryList.length === 0}
            title={deliveryList.length ? `Print delivery guide for ${deliveryList.length} order${deliveryList.length !== 1 ? 's' : ''} out for delivery` : 'No orders out for delivery right now'}
          >
            🚚 Delivery {deliveryList.length ? `(${deliveryList.length})` : ''}
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--blue-600)', color: 'white' }} onClick={() => setShowNew(true)}><span className="plus">+</span> New order</button>
        </div>
      </div>

      <div className="stats-grid" style={{ paddingTop: 0 }}>
        <div className="stat-card blue">
          <div className="stat-top"><span className="stat-label">Total orders</span><span className="stat-icon">🧾</span></div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-trend trend-up">{stats.active} in progress • {stats.canceled} canceled</div>
        </div>
        <div className="stat-card green">
          <div className="stat-top"><span className="stat-label">Delivered</span><span className="stat-icon">✅</span></div>
          <div className="stat-value">{stats.delivered}</div>
          <div className="stat-trend trend-up">{stats.active} still being prepared or delivered</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-top"><span className="stat-label">Total sales</span><span className="stat-icon">💧</span></div>
          <div className="stat-value">{peso(stats.revenue)}</div>
          <div className="stat-trend" style={{ color: '#92400e' }}>Today {peso(stats.todayRevenue)} • Average {peso(Math.round(stats.avg))}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-top"><span className="stat-label">Need to cancel?</span><span className="stat-icon">⏱️</span></div>
          <div className="stat-value" style={{ fontSize: 18 }}>Within 5 minutes</div>
          <div className="stat-trend trend-down">You can cancel while order is still being prepared</div>
        </div>
      </div>

      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order number, customer, or product..."
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
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} of {orders.length} orders</span>
        {(search || statusFilter !== 'ALL' || scheduleFilter !== 'ALL' || paymentFilter !== 'ALL') && (
          <button className="btn-xs" onClick={() => { setSearch(''); setStatusFilter('ALL'); setScheduleFilter('ALL'); setPaymentFilter('ALL') }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e', display: 'inline-block' }}></span> Updates automatically
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '10px 18px', flexWrap: 'wrap' }}>
        {['ALL', ...Object.keys(OrderStatus)].map(id => {
          const isAll = id === 'ALL'
          const active = statusFilter === id
          const label = isAll ? 'All' : STATUS_META[id]?.label || id
          const count = isAll ? orders.length : orders.filter(o => getOrderStatus(o, now).id === id).length
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

      <div className="table-wrap" style={{ paddingTop: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Order number</th>
              <th>Date & time</th>
              <th>Customer</th>
              <th>Items</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
              <th style={{ textAlign: 'right' }}>Delivery</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Payment & schedule</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)' }}>No orders found. Try changing your search or filters.</td></tr>
            ) : filtered.map(order => {
              const st = getOrderStatus(order, now)
              const canCancel = canCancelOrder(order, now)
              const elapsed = now - order.date
              const withinWindow = elapsed < ORDER_CONSTANTS.CANCEL_WINDOW_MS
              return (
                <tr key={order.orderId}>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <b style={{ fontFamily: 'var(--mono)', color: 'var(--slate-900)', fontSize: 13 }}>{order.orderId}</b>
                      <button className="btn-xs" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(order.orderId); showToast && showToast('Copied ' + order.orderId) }} title="Copy order number">⎘</button>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-900)' }}>{formatOrderDateShort(order.date)}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{(() => {
                      const sec = Math.floor((now - order.date) / 1000)
                      if (sec < 60) return `${sec} seconds ago`
                      if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`
                      if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`
                      return `${Math.floor(sec / 86400)} days ago`
                    })()}</div>
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
                        return <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <img src={p.image} alt={p.container} loading="lazy" style={{ width: 20, height: 20, objectFit: 'contain', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 4, padding: 1, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{p.name} ({p.container})</span>
                          <span style={{ color: 'var(--slate-500)' }}>×{it.quantity}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{peso(p.price * it.quantity)}</span>
                        </div>
                      })}
                      <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>{order.items.reduce((s, it) => s + it.quantity, 0)} items</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{peso(order.subtotal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: order.deliveryFee === 0 ? '#059669' : 'var(--slate-900)' }}>{peso(order.deliveryFee)}{order.deliveryFee === 0 && ' Free'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--slate-900)' }}>{peso(order.total)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className={`pill ${order.payment === 'Cash on Delivery' ? 'green' : 'slate'}`} style={{ fontSize: 11, padding: '3px 8px', justifyContent: 'center' }}>{order.payment}</span>
                      <span className="pill slate" style={{ fontSize: 11, padding: '3px 8px', justifyContent: 'center' }}>{order.schedule}</span>
                      <span style={{ fontSize: 11, color: order.payment === 'Cash on Delivery' ? '#059669' : '#dc2626', fontWeight: 700 }}>{order.payment === 'Cash on Delivery' ? 'Available' : 'Not available'}</span>
                    </div>
                  </td>
                  <td>
                    <StatusPill statusId={st.id} />
                    {!withinWindow && st.id !== 'CANCELED' && st.id !== 'DELIVERED' && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>Can no longer be canceled</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button className="btn-xs" style={{ padding: '6px 10px' }} onClick={() => setSelected(order)}>View details</button>
                      {canCancel ? (
                        <button className="btn-xs danger" style={{ padding: '6px 10px' }} onClick={() => handleCancel(order.orderId)}>Cancel</button>
                      ) : (
                        (st.id === OrderStatus.CONFIRMED.id || st.id === OrderStatus.GALLON_TO_GET.id) ? null : (
                          <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>
                            {order.isCanceled ? 'Canceled' : st.id === 'DELIVERED' ? 'Completed' : ''}
                          </span>
                        )
                      )}
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
            <div>New orders automatically move through these steps:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, fontWeight: 700 }}>
              <span className="pill" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>Pending</span>
              <span>→</span>
              <span className="pill" style={{ background: '#e0f2fe', color: '#0c4a6e', borderColor: '#bae6fd' }}>Confirmed</span>
              <span>→</span>
              <span className="pill" style={{ background: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4' }}>Picking up</span>
              <span>→</span>
              <span className="pill" style={{ background: '#dcfce7', color: '#065f46', borderColor: '#a7f3d0' }}>Out for delivery</span>
              <span>→</span>
              <span className="pill" style={{ background: '#e2e8f0', color: '#334155', borderColor: '#cbd5e1' }}>Delivered</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate-500)', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px' }}>
              You can cancel an order within the first 5 minutes while it is still being prepared.
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 14 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--slate-900)' }}>Your data is safe</h3>
          <div style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.6, display: 'grid', gap: 8 }}>
            <div>All orders are saved on this device automatically. They stay even if you close the app or turn off your phone.</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pill green">Saved automatically</span>
              <span className="pill blue">Works offline</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate-500)', background: '#f8fafc', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px' }}>
              Use the pick-up guide to help your rider collect the right gallons on time.
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin: '0 18px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, fontSize: 12.5, color: '#065f46', lineHeight: 1.5 }}>
        <span>💡</span>
        <span><b>Tip:</b> Tap <b>View details</b> to see the full order, or <b>Cancel</b> within 5 minutes if you need to make a change. Orders that are already out for delivery or delivered can no longer be canceled.</span>
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          now={now}
          onClose={() => setSelected(null)}
          onCancel={handleCancel}
          onPrintPickUp={(order) => {
            setSelected(null)
            setPickUpPrint({ mode: 'single', order })
          }}
          onPrintDelivery={(order) => {
            setSelected(null)
            setDeliveryPrint({ mode: 'single', order })
          }}
        />
      )}
      {showNew && (
        <NewOrderModal onClose={() => setShowNew(false)} onCreate={handleCreate} showToast={showToast} />
      )}
      {pickUpPrint && (
        <PickUpPrintSheet
          orders={pickUpList}
          now={now}
          singleOrder={pickUpPrint.mode === 'single' ? pickUpPrint.order : null}
          onClose={() => setPickUpPrint(null)}
        />
      )}
      {deliveryPrint && (
        <DeliveryPrintSheet
          orders={deliveryList}
          now={now}
          singleOrder={deliveryPrint.mode === 'single' ? deliveryPrint.order : null}
          onClose={() => setDeliveryPrint(null)}
        />
      )}
    </div>
  )
}
