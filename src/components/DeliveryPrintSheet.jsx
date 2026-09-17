import { peso, nowPHString, formatPHLong } from '../utils/dateUtils'
import { getOrderStatus } from '../data/ordersData'

function BlankRows({ count, cols }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      <td className="num">{i + 1}</td>
      {Array.from({ length: cols - 1 }).map((__, j) => (
        <td key={j}>&nbsp;</td>
      ))}
    </tr>
  ))
}

export default function DeliveryPrintSheet({ orders = [], now: nowProp, onClose, singleOrder = null }) {
  const now = nowProp ?? Date.now()
  const date = new Date(now)
  const dateStr = formatPHLong(date)
  const list = singleOrder ? [singleOrder] : orders
  const isSingle = Boolean(singleOrder)

  const totalGallons = list.reduce((s, o) => s + o.items.reduce((a, it) => a + it.quantity, 0), 0)
  const totalAmount = list.reduce((s, o) => s + (o.total || 0), 0)
  const roundCount = list.reduce((s, o) => s + o.items.filter(it => (it.product || {}).container === 'Round').reduce((a, it) => a + it.quantity, 0), 0)
  const slimCount = list.reduce((s, o) => s + o.items.filter(it => (it.product || {}).container === 'Slim').reduce((a, it) => a + it.quantity, 0), 0)
  const gcashNote = list.filter(o => o.payment !== 'Cash on Delivery').length

  const content = (
    <div className="print-sheet" id="print-delivery-sheet">
      <div className="print-sheet-inner">
        <div className="print-header">
          <div className="print-brand">
            <div className="print-logo">💧</div>
            <div>
              <h1>GALLON DELIVERY GUIDE</h1>
              <p>Water Refilling Station • Irosin, Sorsogon • Delivery Rider Copy</p>
              <p style={{ fontSize: '7pt', marginTop: '4px', color: '#0c2d4a', letterSpacing: 0 }}>
                {isSingle ? `Order ${singleOrder.orderId} — Out for Delivery` : `Ready for delivery`}
              </p>
            </div>
          </div>
          <div className="print-date-box">
            <div className="label">Date & Time</div>
            <div className="date">{dateStr}</div>
            <div className="sub">Printed: {nowPHString()}</div>
            <div style={{ marginTop: '6px', fontSize: '7pt', fontWeight: 700, color: '#0c2d4a' }}>Rider: ______________________</div>
            <div style={{ marginTop: '4px', fontSize: '7pt', fontWeight: 700, color: '#0c2d4a' }}>Tricycle No.: _____</div>
          </div>
        </div>

        <div className="print-meta">
          <div><span className="lbl">Prepared by:</span><span className="line"></span></div>
          <div><span className="lbl">Route:</span><span className="line"></span></div>
          <div><span className="lbl">Page:</span><span className="line"></span> <span style={{ fontSize: '7pt' }}>of</span> <span className="line" style={{ minWidth: '30px' }}></span></div>
        </div>

        {list.length === 0 ? (
          <div className="print-section">
            <div style={{ textAlign: 'center', padding: 24, background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: 8, color: '#92400e', fontSize: '10pt' }}>
              No orders ready for delivery right now.<br />
              <span style={{ fontSize: '8pt' }}>Orders appear here when they are <b>Out for Delivery</b>. Check again after pick-ups are completed.</span>
            </div>
          </div>
        ) : (
          <>
            <div className="print-section">
              <h2>🚚 Delivery List <small>— deliver sealed gallons, collect payment, get signature</small></h2>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}>#</th>
                    <th style={{ width: '18%' }}>Order / Customer</th>
                    <th style={{ width: '22%' }}>Address & Phone</th>
                    <th>Items to deliver</th>
                    <th style={{ width: '11%' }}>Amount</th>
                    <th style={{ width: '10%' }}>Schedule</th>
                    <th style={{ width: '42px' }}>✓ Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((o, idx) => {
                    const itemsText = o.items.map(it => {
                      const p = it.product
                      const name = p ? p.name : `Product ${it.productId}`
                      const cont = p ? ` ${p.container}` : ''
                      return `${name}${cont} ×${it.quantity}`
                    }).join(', ')
                    const gallonInfo = o.items.map(it => {
                      const p = it.product
                      const situ = p ? p.bottleLabel || p.bottleSituation : ''
                      return situ ? `${situ} ×${it.quantity}` : ''
                    }).filter(Boolean).join(', ')
                    return (
                      <tr key={o.orderId}>
                        <td className="num">{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '8pt' }}>{o.orderId}</div>
                          <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                          <div style={{ fontSize: '7pt', color: '#64748b' }}>{o.phone || '—'}</div>
                          <div style={{ fontSize: '6.5pt', marginTop: 2 }}><span style={{ background: '#dcfce7', border: '1px solid #a7f3d0', borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>{gallonInfo || o.items.length + ' items'}</span></div>
                        </td>
                        <td style={{ fontSize: '7.5pt' }}>
                          <div style={{ fontWeight: 600 }}>{o.address}</div>
                          <div style={{ color: '#64748b', marginTop: 2 }}>Phone: {o.phone || '—'}</div>
                        </td>
                        <td style={{ fontSize: '7.5pt' }}>
                          <div>{itemsText}</div>
                          <div style={{ marginTop: 3, color: '#0c4a6e', fontWeight: 700 }}>{o.items.reduce((s, it) => s + it.quantity, 0)} gallon(s) • {peso(o.total)}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '7.5pt' }}>
                          <div style={{ fontWeight: 800 }}>{peso(o.total)}</div>
                          <div style={{ fontSize: '6.5pt', color: '#065f46', fontWeight: 600 }}>{o.payment}</div>
                          <div style={{ fontSize: '6.5pt', color: '#64748b' }}>{o.schedule} • {getOrderStatus(o, now).label}</div>
                        </td>
                        <td style={{ fontSize: '7pt', textAlign: 'center' }}>{o.schedule}</td>
                        <td className="check">☐</td>
                      </tr>
                    )
                  })}
                  {list.length < 8 && <BlankRows count={Math.max(2, 8 - list.length)} cols={7} />}
                </tbody>
              </table>
            </div>

            <div className="print-section">
              <div className="print-summary">
                <div className="print-box">
                  <h3>🔢 Summary for delivery</h3>
                  <div className="box-body">
                    <div className="box-row"><span>Orders to deliver</span><b>{list.length}</b></div>
                    <div className="box-row"><span>Round gallons</span><b>{roundCount}</b></div>
                    <div className="box-row"><span>Slim gallons</span><b>{slimCount}</b></div>
                    <div className="box-row"><span>Total gallons</span><b>{totalGallons}</b></div>
                    <div className="box-row"><span>Cash to collect</span><b>{peso(totalAmount)}</b></div>
                    <div className="box-row"><span>Other payment</span><b>{gcashNote}</b></div>
                    <div style={{ fontSize: '7pt', color: '#64748b', marginTop: 4 }}>Double-check seals are intact before loading. Bring change for cash payments.</div>
                  </div>
                </div>
                <div className="print-box">
                  <h3>✅ Delivery checklist</h3>
                  <div className="box-body" style={{ fontSize: '8pt' }}>
                    <div>☐ Verify each gallon is sealed & clean</div>
                    <div>☐ Load by delivery order — nearest first</div>
                    <div>☐ Confirm customer name & address before unloading</div>
                    <div>☐ Collect payment and give receipt</div>
                    <div>☐ Get customer signature in “Delivered” column</div>
                    <div>☐ For “Borrow” — remind return date</div>
                    <div style={{ marginTop: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 8px', color: '#065f46', fontSize: '7.5pt' }}>
                      💧 Tip: Call customer 10 mins before arrival. If not home, do not leave gallons unattended — bring back to station.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="print-section">
              <h2>🗒️ Notes & Sign-off</h2>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Undelivered / Refused / Customer not home</th>
                    <th>Action taken / Reschedule</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ height: 28 }}>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td style={{ height: 28 }}>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td style={{ height: 28 }}>&nbsp;</td><td>&nbsp;</td></tr>
                </tbody>
              </table>
              <div className="print-footer" style={{ marginTop: 10, paddingTop: 10 }}>
                <div><div className="sig-line">Rider (Name & Signature)</div><div style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: 4 }}>{dateStr} • Time out: _______ Time in: _______</div></div>
                <div><div className="sig-line">Customer / Receiver</div><div style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: 4 }}>Signature & Date: ___________________</div></div>
                <div className="print-note" style={{ gridColumn: '1 / -1' }}>
                  <b>Reminder:</b> Return all undelivered gallons and collected cash to the station. Report any issues before end of shift.
                  <span style={{ float: 'right', fontSize: '6.5pt', color: '#94a3b8' }}>Tubig Irosin • Irosin, Sorsogon • Delivery Guide • {nowPHString()}</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="print-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-save" onClick={() => window.print()}>🖨 Print this guide</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="print-preview-overlay" onClick={onClose}>
      <div className="print-preview-modal" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}
