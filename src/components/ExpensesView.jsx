import { expensesList } from '../data/mockData'
import { peso } from '../utils/dateUtils'
import { exportExpensesExcel } from '../utils/export'

export default function ExpensesView() {
  const total = expensesList.reduce((s,e)=>s+e.amount,0)
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>💸 Expenses</h2>
          <p>Water, electricity, fuel, caps & maintenance • September 2026 total: <b style={{ color:'var(--slate-900)' }}>{peso(total)}</b></p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-xs" style={{ padding:'9px 14px', fontSize:'13px' }} onClick={()=> exportExpensesExcel(expensesList)} title="Download spreadsheet">⬇ Download</button>
          <button className="btn btn-primary" style={{ background:'var(--red)', color:'white' }}>+ Add Expense</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th style={{ textAlign:'right' }}>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {expensesList.map(e=> (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td><span className="pill slate">{e.category}</span></td>
                <td>{e.desc}</td>
                <td style={{ textAlign:'right', fontWeight:800, color:'var(--slate-900)' }}>{peso(e.amount)}</td>
                <td><button className="btn-xs">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
