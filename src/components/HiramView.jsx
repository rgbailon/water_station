import { hiramRecords } from '../data/mockData'
import { exportHiramExcel } from '../utils/export'

export default function HiramView() {
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>🤝 Hiram Tracker (Borrowed Gallons)</h2>
          <p>Know who has your gallons • Critical for Irosin deliveries • Filter by barangay</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-xs" style={{ padding:'9px 14px', fontSize:'13px' }} onClick={()=> exportHiramExcel(hiramRecords)} title="Download professional spreadsheet (Excel .xls)">⬇ Spreadsheet</button>
          <button className="btn btn-primary" style={{ background: 'var(--amber)', color: '#78350f', border:'1px solid #fde68a' }}>+ Record Hiram</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Barangay</th>
              <th>Borrowed</th>
              <th>Returned</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {hiramRecords.map(r => {
              const bal = r.borrowed - r.returned
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight:700, color:'var(--slate-900)' }}>{r.customer}</div>
                    <div style={{ fontSize:'11.5px', color:'var(--slate-500)' }}>{r.phone}</div>
                  </td>
                  <td>{r.barangay}</td>
                  <td><b>{r.borrowed}</b> gals</td>
                  <td>{r.returned} gals</td>
                  <td><b style={{ color: bal>0?'#dc2626':'#059669' }}>{bal} gals</b></td>
                  <td>{r.due}</td>
                  <td>
                    {r.status==='active' && <span className="pill blue">Active</span>}
                    {r.status==='partial' && <span className="pill amber">Partial</span>}
                    {r.status==='overdue' && <span className="pill red">Overdue</span>}
                    {r.status==='returned' && <span className="pill green">Returned</span>}
                  </td>
                  <td>
                    <button className="btn-xs" onClick={()=>alert(`Call ${r.customer}`)}>📞 Call</button>
                    <button className="btn-xs" style={{ marginLeft:6 }} onClick={()=>alert('Mark returned - DB later')}>✓ Return</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ margin:'0 18px 18px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:12, padding:'12px 14px', fontSize:'13px', color:'#92400e', display:'flex', gap:10 }}>
        <span>⚠️</span><span><b>Overdue:</b> Kap. Reyes — 6 gals since Sep 20. Follow up today. Tip: Calendar shows overdue as <span className="pill amber" style={{ padding:'1px 6px' }}>⏰ Hiram Due</span> on the due date.</span>
      </div>
    </div>
  )
}
