import { nowPHString, formatPHLong } from '../utils/dateUtils'
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

export default function PickUpPrintSheet({ orders = [], now: nowProp, onClose, singleOrder = null }) {
  const now = nowProp ?? Date.now()
  const date = new Date(now)
  const dateStr = formatPHLong(date)
  const list = singleOrder ? [singleOrder] : orders
  const isSingle = Boolean(singleOrder)

  // totals
  const totalGallons = list.reduce((s, o) => s + o.items.reduce((a, it) => a + it.quantity, 0), 0)
  const roundCount = list.reduce((s, o) => s + o.items.filter(it => (it.product || {}).container === 'Round').reduce((a, it) => a + it.quantity, 0), 0)
  const slimCount = list.reduce((s, o) => s + o.items.filter(it => (it.product || {}).container === 'Slim').reduce((a, it) => a + it.quantity, 0), 0)
  const needNewGallon = list.reduce((s, o) => s + o.items.filter(it => (it.product || {}).bottleSituation === 'NEEDS_GALLON').reduce((a, it) => a + it.quantity, 0), 0)
  const borrowCount = list.reduce((s, o) => s + o.items.filter(it => (it.product || {}).bottleSituation === 'BORROW').reduce((a, it) => a + it.quantity, 0), 0)

  const content = (
    <div className="print-sheet" id="print-pickup-sheet">
      <div className="print-sheet-inner">
        <div className="print-header">
          <div className="print-brand">
            <div className="print-logo">🛻</div>
            <div>
              <h1>GALLON PICK-UP GUIDE</h1>
              <p>Water Refilling Station • Irosin, Sorsogon • Delivery Rider Copy</p>
              <p style={{ fontSize: '7pt', marginTop: '4px', color: '#0c2d4a', letterSpacing: 0 }}>
                {isSingle ? `Order ${singleOrder.orderId} — Confirmed` : `${list.length} confirmed order${list.length !== 1 ? 's' : ''} ready for pick-up`}
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
              No confirmed orders needing pick-up right now.<br />
              <span style={{ fontSize: '8pt' }}>Orders appear here when they are <b>Order Confirmed</b> or <b>Gallon Pick Up</b>. Check again in a few minutes.</span>
            </div>
          </div>
        ) : (
          <>
            <div className="print-section">
              <h2>📋 Pick-Up List <small>— visit each customer, collect empty gallons, verify count</small></h2>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}>#</th>
                    <th style={{ width: '18%' }}>Order / Customer</th>
                    <th style={{ width: '22%' }}>Address & Phone</th>
                    <th>Items to pick up</th>
                    <th style={{ width: '10%' }}>Schedule</th>
                    <th style={{ width: '14%' }}>Notes</th>
                    <th style={{ width: '42px' }}>✓ Picked</th>
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
                          <div style={{ fontSize: '6.5pt', marginTop: 2 }}><span style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>{gallonInfo || o.items.length + ' items'}</span></div>
                        </td>
                        <td style={{ fontSize: '7.5pt' }}>
                          <div style={{ fontWeight: 600 }}>{o.address}</div>
                          <div style={{ color: '#64748b', marginTop: 2 }}>Barangay: {o.address.split(',')[0] || '—'}</div>
                        </td>
                        <td style={{ fontSize: '7.5pt' }}>
                          <div>{itemsText}</div>
                          <div style={{ marginTop: 3, color: '#0c4a6e', fontWeight: 700 }}>{o.items.reduce((s, it) => s + it.quantity, 0)} gallon(s)</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '7.5pt' }}>{o.schedule}<div style={{ fontSize: '6.5pt', color: '#64748b', fontWeight: 400 }}>{getOrderStatus(o, now).label}</div></td>
                        <td style={{ fontSize: '7pt' }}>{o.notes || '—'}</td>
                        <td className="check">☐</td>
                      </tr>
                    )
                  })}
                  {/* fill blank rows for handwritten additions */}
                  {list.length < 8 && <BlankRows count={Math.max(2, 8 - list.length)} cols={7} />}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6, fontSize: '8pt', fontWeight: 700 }}>
                <span>Total gallons to collect: <b style={{ borderBottom: '1px solid #0f172a', minWidth: 40, display: 'inline-block', textAlign: 'center' }}>{totalGallons}</b></span>
                <span>Orders: <b>{list.length}</b></span>
              </div>
            </div>

            <div className="print-section">
              <div className="print-summary">
                <div className="print-box">
                  <h3>🔢 Summary for loader</h3>
                  <div className="box-body">
                    <div className="box-row"><span>Round gallons to pick up</span><b>{roundCount}</b></div>
                    <div className="box-row"><span>Slim gallons to pick up</span><b>{slimCount}</b></div>
                    <div className="box-row"><span>New gallons needed (customer has no jug)</span><b>{needNewGallon}</b></div>
                    <div className="box-row"><span>Borrow requests</span><b>{borrowCount}</b></div>
                    <div className="box-row" style={{ borderTop: '1px solid #cbd5e1', paddingTop: 6, marginTop: 2 }}><span><b>Total to collect</b></span><b>{totalGallons} gallon(s)</b></div>
                    <div style={{ fontSize: '7pt', color: '#64748b', marginTop: 4 }}>Count again before leaving station. Bring enough empty jugs & caps.</div>
                  </div>
                </div>
                <div className="print-box">
                  <h3>✅ Rider checklist</h3>
                  <div className="box-body" style={{ fontSize: '8pt' }}>
                    <div>☐ Bring empty gallon checklist: Round <span style={{ borderBottom: '1px solid #0f172a', minWidth: 20, display: 'inline-block' }}>&nbsp;</span> Slim <span style={{ borderBottom: '1px solid #0f172a', minWidth: 20, display: 'inline-block' }}>&nbsp;</span></div>
                    <div>☐ Check each empty gallon for cracks / dirt / bad odor</div>
                    <div>☐ Confirm customer name & count before loading</div>
                    <div>☐ Mark ✓ in “Picked” column only after collecting</div>
                    <div>☐ For “New Gallon” orders — bring brand-new jug</div>
                    <div>☐ For “Borrow” — note return date, get signature</div>
                    <div style={{ marginTop: 6, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '6px 8px', color: '#92400e', fontSize: '7.5pt' }}>
                      ⚠️ Tip: If customer is not home, leave a note and try again. Do not leave empty gallons unattended.
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
                    <th style={{ width: '50%' }}>Issues / Damaged gallons / Customer not home</th>
                    <th>Action taken</th>
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
                <div><div className="sig-line">Station Staff (Verified pick-ups)</div><div style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: 4 }}>Gallons received at station: _______</div></div>
                <div className="print-note" style={{ gridColumn: '1 / -1' }}>
                  <b>Reminder:</b> Bring all collected empty gallons back to the station. Count together with staff. Any mismatch must be reported before unloading.
                  <span style={{ float: 'right', fontSize: '6.5pt', color: '#94a3b8' }}>Tubig Irosin • Irosin, Sorsogon • Pick-Up Guide • {nowPHString()}</span>
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

  if (orders.length === 0 && !singleOrder) {
    // still allow printing empty template
  }

  return (
    <div className="print-preview-overlay" onClick={onClose}>
      <div className="print-preview-modal" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}
