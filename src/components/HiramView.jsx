import { hiramRecords as fallbackHiram } from '../data/mockData'
import { exportHiramExcel } from '../utils/export'

export default function HiramView({ records, onUpdateRecords }) {
  const hiramRecords = records?.length ? records : fallbackHiram
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>🤝 Borrowed</h2>
          <p>Know who has your gallons • Track borrowed containers • Filter by barangay • <span className="pill slate" style={{ fontSize: 11 }}>Booleans: is_returned / is_overdue / is_active</span></p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-xs" style={{ padding:'9px 14px', fontSize:'13px' }} onClick={()=> exportHiramExcel(hiramRecords)} title="Download spreadsheet">⬇ Download</button>
          <button className="btn btn-primary" style={{ background: 'var(--amber)', color: '#78350f', border:'1px solid #fde68a' }} onClick={()=> alert('Add hiram record — wire to Supabase via onUpdateRecords + DB.upsertHiram')}>+ Record</button>
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
              <th>Booleans</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {hiramRecords.map(r => {
              const bal = r.borrowed - r.returned
              return (
                <tr key={r.id} style={{ opacity: !r.is_active ? 0.6 : 1 }}>
                  <td>
                    <div style={{ fontWeight:700, color:'var(--slate-900)' }}>{r.customer}</div>
                    <div style={{ fontSize:'11.5px', color:'var(--slate-500)' }}>{r.phone}</div>
                  </td>
                  <td>{r.barangay}</td>
                  <td><b>{r.borrowed}</b> gals</td>
                  <td>{r.returned} gals</td>
                  <td><b style={{ color: bal>0?'#dc2626':'#059669' }}>{bal} gals</b></td>
                  <td>{r.due || r.due_date}</td>
                  <td>
                    {r.status==='active' && <span className="pill blue">Active</span>}
                    {r.status==='partial' && <span className="pill amber">Partial</span>}
                    {r.status==='overdue' && <span className="pill red">Overdue</span>}
                    {r.status==='returned' && <span className="pill green">Returned</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {r.is_returned ? <span className="pill green" style={{ fontSize:10 }}>Returned ✓</span> : <span className="pill amber" style={{ fontSize:10 }}>Not returned</span>}
                      {r.is_overdue ? <span className="pill red" style={{ fontSize:10 }}>Overdue</span> : null}
                      {!r.is_active ? <span className="pill slate" style={{ fontSize:10 }}>Archived</span> : null}
                    </div>
                  </td>
                  <td>
                    <button className="btn-xs" onClick={()=>alert(`Call ${r.customer}`)}>📞 Call</button>
                    <button className="btn-xs" style={{ marginLeft:6 }} onClick={()=>{
                      if (!onUpdateRecords) return alert('Marked as returned — saved locally')
                      const next = hiramRecords.map(x => x.id===r.id ? { ...x, returned: x.borrowed, status:'returned', is_returned: true, is_overdue: false } : x)
                      onUpdateRecords(next)
                    }}>✓ Return</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ margin:'0 18px 18px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:12, padding:'12px 14px', fontSize:'13px', color:'#92400e', display:'flex', gap:10 }}>
        <span>⚠️</span><span><b>Overdue:</b> Kap. Reyes — 6 gals since Sep 20. Follow up today. Supabase booleans <code>is_returned / is_overdue</code> are auto-maintained by trigger.</span>
      </div>
    </div>
  )
}
