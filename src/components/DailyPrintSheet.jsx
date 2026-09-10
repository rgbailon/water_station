import { peso, formatISO, formatPHLong, formatPHShort, nowPHString } from '../utils/dateUtils'

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

export default function DailyPrintSheet({ date, events = [], onClose, inline = false }) {
  const d = date instanceof Date ? date : new Date(date)
  // Use Asia/Manila timezone for accurate PH date (fixes UTC off-by-one)
  const dateStr = formatPHLong(d)
  const iso = formatISO(d)
  const short = formatPHShort(d)

  // Group events for summary if any digital entries exist
  const sales = events.filter(e => e.type === 'sale')
  const deliveries = events.filter(e => e.type === 'delivery')
  const expenses = events.filter(e => e.type === 'expense')
  const hiram = events.filter(e => e.type === 'hiram')

  const salesTotal = [...sales, ...deliveries].reduce((s, e) => s + (e.amount || 0), 0)
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  const content = (
    <div className="print-sheet" id="print-sheet">
      <div className="print-sheet-inner">
        {/* Header */}
        <div className="print-header">
          <div className="print-brand">
            <div className="print-logo">💧</div>
            <div>
              <h1>TUBIG IROSIN</h1>
              <p>Water Refilling Station • Irosin, Sorsogon</p>
              <p style={{ fontSize: '7pt', marginTop: '4px', color: '#0c2d4a', letterSpacing: 0 }}>Daily Log Sheet — Paper Copy Before Encoding</p>
            </div>
          </div>
          <div className="print-date-box">
            <div className="label">Date</div>
            <div className="date">{dateStr}</div>
            <div className="sub">ISO: {iso} • {short}</div>
            <div style={{ marginTop: '6px', fontSize: '7pt', fontWeight: 700, color: '#0c2d4a' }}>☐ AM &nbsp; ☐ PM &nbsp; ☐ Whole Day</div>
          </div>
        </div>

        <div className="print-meta">
          <div><span className="lbl">Staff on Duty:</span><span className="line"></span></div>
          <div><span className="lbl">Shift:</span><span className="line"></span></div>
          <div><span className="lbl">Page:</span><span className="line"></span> <span style={{ fontSize: '7pt' }}>of</span> <span className="line" style={{ minWidth: '30px' }}></span></div>
        </div>

        {/* Section 1 — Refill / Sales */}
        <div className="print-section">
          <h2>💧 A. Refill & Walk-in Sales <small>— write each customer, reconcile before typing into system at day end</small></h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>#</th>
                <th style={{ width: '32%' }}>Customer / Barangay</th>
                <th>Qty</th>
                <th>Type <span style={{ fontWeight: 400, textTransform: 'none' }}>(Round/Slim/Btl)</span></th>
                <th style={{ width: '14%' }}>Amount (₱)</th>
                <th>Payment</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {/* If there are digital entries, show them first as reference, then blanks */}
              {sales.length > 0 && sales.slice(0, 4).map((e, i) => (
                <tr key={`s-${e.id}`}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{e.customer || '—'} {e.note ? `• ${e.note}` : ''}</td>
                  <td>{e.title.replace(/[^0-9]/g, '') || '—'}</td>
                  <td>{e.title}</td>
                  <td className="amt">{e.amount ? peso(e.amount) : '—'}</td>
                  <td className="check">☐ Cash</td>
                  <td style={{ fontSize: '7pt', color: '#64748b' }}>Encoded</td>
                </tr>
              ))}
              <BlankRows count={sales.length > 0 ? 8 : 12} cols={7} />
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px', fontSize: '8pt', fontWeight: 700 }}>
            <span>Subtotal A: ₱ <span style={{ borderBottom: '1px solid #0f172a', display: 'inline-block', minWidth: '90px' }}>&nbsp;</span></span>
            <span>Count: <span style={{ borderBottom: '1px solid #0f172a', display: 'inline-block', minWidth: '50px' }}>&nbsp;</span> gals/btls</span>
          </div>
        </div>

        {/* Section 2 — Deliveries */}
        <div className="print-section">
          <h2>🛵 B. Deliveries <small>— tricycle route, include barangay & hiram if any</small></h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>#</th>
                <th>Customer / Brgy</th>
                <th>Qty (gals)</th>
                <th>Time Out</th>
                <th>Time In</th>
                <th>Amount (₱)</th>
                <th>Hiram?</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.slice(0, 2).map((e, i) => (
                <tr key={`d-${e.id}`}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{e.customer}</td>
                  <td>{e.title.match(/\d+/)?.[0] || '—'}</td>
                  <td></td>
                  <td></td>
                  <td className="amt">{peso(e.amount)}</td>
                  <td className="check">☐</td>
                </tr>
              ))}
              <BlankRows count={deliveries.length > 0 ? 6 : 8} cols={7} />
            </tbody>
          </table>
        </div>

        {/* Section 3 — Hiram */}
        <div className="print-section">
          <h2>🤝 C. Hiram Log (Borrowed Gallons) <small>— who borrowed / returned today</small></h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>#</th>
                <th>Customer Name</th>
                <th>Barangay</th>
                <th>Borrowed</th>
                <th>Returned</th>
                <th>Balance</th>
                <th>Signature</th>
              </tr>
            </thead>
            <tbody>
              {hiram.slice(0, 2).map((e, i) => (
                <tr key={`h-${e.id}`}>
                  <td className="num">{i + 1}</td>
                  <td>{e.customer}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
              <BlankRows count={4} cols={7} />
            </tbody>
          </table>
        </div>

        {/* Section 4 — Expenses */}
        <div className="print-section">
          <h2>💸 D. Expenses Today <small>— fuel, caps, water, electricity, etc.</small></h2>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>#</th>
                <th>Category</th>
                <th>Description / Receipt No.</th>
                <th style={{ width: '18%' }}>Amount (₱)</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>
              {expenses.slice(0, 2).map((e, i) => (
                <tr key={`ex-${e.id}`}>
                  <td className="num">{i + 1}</td>
                  <td>{e.title}</td>
                  <td>{e.note}</td>
                  <td className="amt">{peso(e.amount)}</td>
                  <td></td>
                </tr>
              ))}
              <BlankRows count={5} cols={5} />
            </tbody>
          </table>
        </div>

        {/* Summary Boxes */}
        <div className="print-section">
          <div className="print-summary">
            <div className="print-box">
              <h3>📊 End-of-Day Summary (fill before encoding)</h3>
              <div className="box-body">
                <div className="box-row"><span>Total Sales (A+B)</span><b>₱ ___________</b></div>
                <div className="box-row"><span>Total Expenses (D)</span><b>₱ ___________</b></div>
                <div className="box-row" style={{ borderBottom: '1.5px solid #0c2d4a' }}><span>Net Cash On Hand</span><b>₱ ___________</b></div>
                <div className="box-row"><span>Filled gals — Opening / Closing</span><span>_____ / _____</span></div>
                <div className="box-row"><span>Empty gals — Opening / Closing</span><span>_____ / _____</span></div>
                <div className="box-row"><span>Caps/Seals used</span><span>_____ pcs</span></div>
                <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '4px' }}>
                  Digital check: Encoded total for {short} is <b>{peso(salesTotal)}</b> sales / <b>{peso(expenseTotal)}</b> expenses ({events.length} entries in system). Match paper?
                </div>
              </div>
            </div>
            <div className="print-box">
              <h3>📦 Inventory Check</h3>
              <div className="box-body">
                <div className="box-row"><span>5-Gal Round — Filled</span><span>_____</span></div>
                <div className="box-row"><span>5-Gal Slim — Filled</span><span>_____</span></div>
                <div className="box-row"><span>350ml cases</span><span>_____</span></div>
                <div className="box-row"><span>500ml cases</span><span>_____</span></div>
                <div className="box-row"><span>1L cases</span><span>_____</span></div>
                <div className="box-row"><span>Low stock alerts?</span><span>☐ Yes ☐ No</span></div>
                <div style={{ fontSize: '7.5pt', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', padding: '6px 8px', color: '#92400e' }}>
                  ⚠️ Reminder: Encode this sheet into the Calendar on <b>{dateStr}</b> by end of day. Use “+ Add Entry” on that date cell.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-footer">
          <div>
            <div className="sig-line">Prepared by (Name & Signature)</div>
            <div style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: '4px' }}>{dateStr} • Time: __________</div>
          </div>
          <div>
            <div className="sig-line">Owner / Verified by (Irosin)</div>
            <div style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: '4px' }}>Date Encoded in System: __________</div>
          </div>
          <div className="print-note">
            <b>Workflow:</b> 1) Print this sheet each morning (date auto-matches calendar) → 2) Write all transactions on paper during the day → 3) At closing, open Calendar → click the date ({short}) → “+ Add Entry” per row → 4) Compare paper Net vs system Net → 5) File paper by date for audit.
            <span style={{ float: 'right', fontSize: '6.5pt', color: '#94a3b8' }}>Tubig Irosin • Irosin, Sorsogon • Offline System • Print: {nowPHString()}</span>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-save" onClick={() => window.print()}>🖨 Print This Sheet</button>
        </div>
      </div>
    </div>
  )

  if (inline) return content

  return (
    <div className="print-preview-overlay" onClick={onClose}>
      <div className="print-preview-modal" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}
