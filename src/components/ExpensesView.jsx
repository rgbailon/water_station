import { expensesList as fallbackExpenses } from '../data/mockData'
import { peso } from '../utils/dateUtils'
import { exportExpensesExcel } from '../utils/export'
import { useState } from 'react'

export default function ExpensesView({ expenses, onUpdateExpenses }) {
  const list = expenses?.length ? expenses : fallbackExpenses
  const total = list.reduce((s,e)=>s+e.amount,0)
  const [paidFilter, setPaidFilter] = useState('ALL')

  const filtered = list.filter(e => {
    if (paidFilter === 'PAID' && !e.is_paid) return false
    if (paidFilter === 'UNPAID' && e.is_paid) return false
    return true
  })

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>💸 Expenses</h2>
          <p>Water, electricity, fuel, caps & maintenance • Total: <b style={{ color:'var(--slate-900)' }}>{peso(total)}</b> • <span className="pill slate" style={{ fontSize: 11 }}>{list.length} entries</span> {list.some(e => 'is_paid' in e) && <span className="pill blue" style={{ fontSize: 11 }}>Booleans: is_paid / is_recurring / is_archived</span>}</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={paidFilter} onChange={e=>setPaidFilter(e.target.value)} style={{ padding:'7px 10px', borderRadius:9, border:'1px solid var(--slate-200)', fontSize:12, fontWeight:700 }}>
            <option value="ALL">All</option>
            <option value="PAID">Paid ✓</option>
            <option value="UNPAID">Unpaid</option>
          </select>
          <button className="btn-xs" style={{ padding:'9px 14px', fontSize:'13px' }} onClick={()=> exportExpensesExcel(list)} title="Download spreadsheet">⬇ Download</button>
          <button className="btn btn-primary" style={{ background:'var(--red)', color:'white' }} onClick={()=> alert('Add expense — wire to Supabase via onUpdateExpenses + DB.upsertExpense')}>+ Add Expense</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Paid</th>
              <th>Recurring</th>
              <th style={{ textAlign:'right' }}>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e=> (
              <tr key={e.id} style={{ opacity: e.is_archived ? 0.6 : 1 }}>
                <td>{e.date}</td>
                <td><span className="pill slate">{e.category}</span></td>
                <td>{e.desc || e.description}{e.is_archived ? <span className="pill slate" style={{ marginLeft:6, fontSize:10 }}>Archived</span> : null}</td>
                <td>{e.is_paid ? <span className="pill green" style={{ fontSize: 11 }}>Paid ✓</span> : <span className="pill amber" style={{ fontSize: 11 }}>Unpaid</span>}</td>
                <td>{e.is_recurring ? <span className="pill blue" style={{ fontSize: 11 }}>↻ Recurring</span> : <span style={{ color:'var(--slate-400)', fontSize:12 }}>—</span>}</td>
                <td style={{ textAlign:'right', fontWeight:800, color:'var(--slate-900)' }}>{peso(e.amount)}</td>
                <td>
                  <button className="btn-xs" onClick={()=> {
                    if (!onUpdateExpenses) return alert('Edit — no handler')
                    const next = list.map(x => x.id===e.id ? { ...x, is_paid: !x.is_paid } : x)
                    onUpdateExpenses(next)
                  }}>{e.is_paid ? 'Mark unpaid' : 'Mark paid'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ margin:'0 18px 18px', background:'#f8fafc', border:'1px solid var(--slate-200)', borderRadius:12, padding:'10px 12px', fontSize:12, color:'var(--slate-500)' }}>
        Booleans persisted to Supabase <code>expenses.is_paid / is_recurring / is_archived</code> — toggle Paid to test.
      </div>
    </div>
  )
}
