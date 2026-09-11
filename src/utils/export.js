import { peso, nowPHString } from './dateUtils'

function downloadBlob(content, filename, mime = 'application/vnd.ms-excel') {
  const blob = new Blob([content], { type: mime + ';charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildWorkbookSheet({ title, subtitle, headers, rows, summary, footer }) {
  const cols = headers.length
  const headerBg = '#0c2d4a'
  const subBg = '#0e4a7a'
  const thBg = '#1a7bb8'
  const wrap = (html) => `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(title.slice(0,31))}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>table{border-collapse:collapse} td,th{font-family:Calibri,Arial,sans-serif} br{mso-data-placement:same-cell}</style></head><body>${html}</body></html>`

  let html = `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">`

  // Title banner
  html += `<tr><td colspan="${cols}" style="background:${headerBg};color:#ffffff;font-size:15pt;font-weight:bold;text-align:center;padding:12px;border:1px solid ${headerBg};mso-pattern:${headerBg} none;">${escapeHtml(title)}</td></tr>`
  html += `<tr><td colspan="${cols}" style="background:${subBg};color:#dbeafe;font-size:9pt;font-weight:600;text-align:center;padding:7px;border:1px solid ${subBg};">${escapeHtml(subtitle)}</td></tr>`
  html += `<tr><td colspan="${cols}" style="background:#f8fafc;color:#64748b;font-size:7.5pt;text-align:center;padding:4px;border:none;">Generated: ${escapeHtml(nowPHString())} &nbsp;|&nbsp; Tubig Irosin • Irosin, Sorsogon • Offline Mode</td></tr>`
  html += `<tr><td colspan="${cols}" style="height:6px;border:none;"></td></tr>`

  // Headers
  html += `<tr>`
  headers.forEach(h => {
    html += `<th style="background:${thBg};color:#ffffff;font-size:9pt;font-weight:bold;text-align:center;border:1px solid #0c2d4a;padding:8px 10px;mso-pattern:${thBg} none;">${escapeHtml(h)}</th>`
  })
  html += `</tr>`

  // Rows
  rows.forEach((row, i) => {
    const isAlt = i % 2 === 1
    const bg = isAlt ? '#f1f5f9' : '#ffffff'
    html += `<tr>`
    row.forEach((cell, idx) => {
      const raw = cell == null ? '' : String(cell)
      const isMoney = raw.includes('₱')
      const isNum = /^-?[\d,]+$/.test(raw.replace(/[₱\s]/g, ''))
      const align = isMoney || isNum ? 'right' : (idx === 0 ? 'left' : 'left')
      const bold = idx === 0 ? 'font-weight:bold;' : ''
      // keep peso symbol rendering in Excel
      html += `<td style="background:${bg};color:#0f172a;font-size:9pt;${bold}text-align:${align};border:1px solid #cbd5e1;padding:6px 8px;">${escapeHtml(raw)}</td>`
    })
    html += `</tr>`
  })

  if (rows.length === 0) {
    html += `<tr><td colspan="${cols}" style="background:#fffbeb;color:#92400e;font-size:9pt;text-align:center;border:1px solid #fde68a;padding:10px;">No records for this period.</td></tr>`
  }

  // Summary
  if (summary && summary.length) {
    html += `<tr><td colspan="${cols}" style="height:8px;border:none;"></td></tr>`
    summary.forEach(s => {
      html += `<tr><td colspan="${cols - 1}" style="background:#e0f2fe;color:#0c4a6e;font-size:9pt;font-weight:bold;text-align:right;border:1px solid #bae6fd;padding:7px 10px;">${escapeHtml(s.label)}</td><td style="background:#e0f2fe;color:#0c2d4a;font-size:9pt;font-weight:800;text-align:right;border:1px solid #bae6fd;padding:7px 10px;">${escapeHtml(s.value)}</td></tr>`
    })
  }

  // Footer
  html += `<tr><td colspan="${cols}" style="height:10px;border:none;"></td></tr>`
  if (footer) {
    html += `<tr><td colspan="${cols}" style="color:#64748b;font-size:7.5pt;text-align:center;border:none;padding:4px;">${escapeHtml(footer)}</td></tr>`
  }
  html += `<tr><td colspan="${cols}" style="color:#94a3b8;font-size:7pt;text-align:center;border:none;padding:2px;font-style:italic;">This spreadsheet was generated automatically from Tubig Irosin Inventory. Keep for BIR / audit trail.</td></tr>`

  html += `</table>`

  return wrap(html)
}

function monthLabelFrom(date) {
  try { return date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' }) } catch { return '' }
}

function sanitizeFilename(s) {
  return s.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')
}

// ---- Specific exports ----

export function exportDashboardExcel({ events, inventory, currentDate }) {
  // derive month
  const d = currentDate instanceof Date ? currentDate : new Date()
  // use events latest month if empty (same logic as DashboardView)
  let monthKey = d.toISOString().slice(0,7)
  let monthEvents = events.filter(e => e.date.startsWith(monthKey))
  let effective = d
  if (monthEvents.length === 0 && events.length) {
    const latest = [...events].sort((a,b)=> b.date.localeCompare(a.date))[0]
    monthKey = latest.date.slice(0,7)
    monthEvents = events.filter(e => e.date.startsWith(monthKey))
    effective = new Date(latest.date + 'T00:00:00')
  }
  const monthLabel = monthLabelFrom(effective)
  const isSale = e => e.type === 'sale' || e.type === 'delivery'
  const monthSales = monthEvents.filter(isSale).reduce((s,e)=>s+e.amount,0)
  const saleTotal = monthEvents.filter(e=>e.type==='sale').reduce((s,e)=>s+e.amount,0)
  const delTotal = monthEvents.filter(e=>e.type==='delivery').reduce((s,e)=>s+e.amount,0)
  const expenseTotal = monthEvents.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0)

  // barangay rows
  const map = {}
  monthEvents.filter(isSale).forEach(e=>{
    const k = (e.customer || 'Other').replace(/^Brgy\.?\s*/i,'').trim() || 'Other'
    map[k] = (map[k]||0)+e.amount
  })
  const barangayRows = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=> [k, peso(v), v])
  // daily rows
  const daysInMonth = new Date(effective.getFullYear(), effective.getMonth()+1, 0).getDate()
  const dailyRows = Array.from({length: daysInMonth}, (_,i)=>{
    const day = String(i+1).padStart(2,'0')
    const iso = `${monthKey}-${day}`
    const v = events.filter(e=>e.date===iso && isSale(e)).reduce((s,e)=>s+e.amount,0)
    const count = events.filter(e=>e.date===iso && isSale(e)).length
    return [day, iso, String(count), peso(v)]
  }).filter(r => r[3] !== '₱0' || Number(r[2])>0)

  // recent
  const recentRows = [...events].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,15).map(e=> [e.date, e.type.toUpperCase(), e.title, e.customer||'—', e.amount? peso(e.amount):'—', e.note||''])

  // Build multi-section HTML: we concatenate multiple table sections inside one sheet with spacers
  const title = `TUBIG IROSIN — DASHBOARD`
  const subtitle = `Irosin, Sorsogon  •  ${monthLabel}  •  ${monthEvents.length} events  •  ${inventory.length} SKUs`

  let htmlTables = ''

  const section = ({ subTitle, headers, rows, summary }) => {
    let t = `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:10px;">`
    t += `<tr><td colspan="${headers.length}" style="background:#0c2d4a;color:#fff;font-size:11pt;font-weight:bold;text-align:left;padding:8px;border:1px solid #0c2d4a;">${escapeHtml(subTitle)}</td></tr>`
    t += `<tr>`
    headers.forEach(h=> t+= `<th style="background:#1a7bb8;color:#fff;font-size:8.5pt;font-weight:bold;text-align:center;border:1px solid #0c2d4a;padding:6px;">${escapeHtml(h)}</th>`)
    t+=`</tr>`
    rows.forEach((row,i)=>{
      const bg = i%2?'#f1f5f9':'#ffffff'
      t+=`<tr>`
      row.forEach((cell, idx)=>{
        const raw = String(cell)
        const isMoney = raw.includes('₱')
        const align = isMoney ? 'right' : (idx===0?'left':'left')
        const bold = idx===0? 'font-weight:bold;':''
        t+= `<td style="background:${bg};color:#0f172a;font-size:8.5pt;${bold}text-align:${align};border:1px solid #cbd5e1;padding:5px 7px;">${escapeHtml(raw)}</td>`
      })
      t+=`</tr>`
    })
    if (!rows.length) t+= `<tr><td colspan="${headers.length}" style="background:#fffbeb;color:#92400e;font-size:8.5pt;text-align:center;border:1px solid #fde68a;padding:8px;">No records</td></tr>`
    if (summary) {
      summary.forEach(s=>{
        t+= `<tr><td colspan="${headers.length-1}" style="background:#e0f2fe;color:#0c4a6e;font-weight:bold;text-align:right;border:1px solid #bae6fd;padding:6px;">${escapeHtml(s.label)}</td><td style="background:#e0f2fe;color:#0c2d4a;font-weight:800;text-align:right;border:1px solid #bae6fd;">${escapeHtml(s.value)}</td></tr>`
      })
    }
    t+=`</table><div style="height:10px;"></div>`
    return t
  }

  // assemble
  let combined = `<table border="1" cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="background:#0c2d4a;color:#fff;font-size:14pt;font-weight:bold;text-align:center;padding:12px;border:1px solid #0c2d4a;">${escapeHtml(title)}</td></tr><tr><td style="background:#0e4a7a;color:#dbeafe;font-size:9pt;text-align:center;padding:7px;border:1px solid #0e4a7a;">${escapeHtml(subtitle)}</td></tr><tr><td style="background:#f8fafc;color:#64748b;font-size:7.5pt;text-align:center;padding:4px;border:none;">Generated: ${escapeHtml(nowPHString())} &nbsp;|&nbsp; Offline Mode — Tubig Irosin</td></tr></table><div style="height:12px;"></div>`

  const kpiHeaders = ['Metric','Value']
  const kpiRows = [
    ['Month Sales (sale + delivery)', peso(monthSales)],
    ['Walk-in Sales', peso(saleTotal)],
    ['Delivery Sales', peso(delTotal)],
    ['Expenses (month)', peso(expenseTotal)],
    ['Net', peso(monthSales - expenseTotal)],
    ['Total Transactions (month)', String(monthEvents.length)],
  ]
  combined += section({ subTitle: `KPIs — ${monthLabel}`, headers: kpiHeaders, rows: kpiRows })

  combined += section({ subTitle: `Daily Sales Trend — ${monthLabel}`, headers: ['Day','Date','Orders','Sales'], rows: dailyRows, summary: [{label:'Month Sales Total', value: peso(monthSales)}] })

  combined += section({ subTitle: `Revenue by Barangay — ${monthLabel}`, headers: ['Barangay','Revenue','Raw'], rows: barangayRows.map(r=> [r[0], r[1], String(r[2])]).map(r=> [r[0], r[1]]), summary: barangayRows[0]? [{label: `Top: ${barangayRows[0][0]} (${Math.round((barangayRows[0][2]/monthSales)*100)}% of sales)`, value: barangayRows[0][1]}]: [] })

  // expense breakdown
  const expMap = {}
  monthEvents.filter(e=>e.type==='expense').forEach(e=>{
    const cat = (e.title || 'Other').split(' -')[0].split(' ')[0].trim() || 'Other'
    expMap[cat]=(expMap[cat]||0)+e.amount
  })
  const expRows = Object.entries(expMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=> [k, peso(v)])
  combined += section({ subTitle: `Expense Breakdown — ${monthLabel}`, headers: ['Category','Amount'], rows: expRows.length? expRows : [['—','₱0']], summary: [{label:'Total Expenses', value: peso(expenseTotal)}] })

  // inventory
  const invRows = inventory.map(it=> [it.icon + ' ' + it.name, it.sku, String(it.stockFilled), String(it.stockEmpty), String(it.threshold), it.stockFilled <= it.threshold ? 'LOW' : 'OK', it.price? peso(it.price):'—'])
  combined += section({ subTitle: `Inventory & Supplies — Stock Levels`, headers: ['Product','SKU','Filled','Empty','Min','Status','Price'], rows: invRows })

  combined += section({ subTitle: `Recent Transactions — Latest 15`, headers: ['Date','Type','Title','Barangay/Customer','Amount','Note'], rows: recentRows })

  const full = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>table{border-collapse:collapse} td,th{font-family:Calibri,Arial,sans-serif}</style></head><body>${combined}<div style="text-align:center;color:#94a3b8;font-size:7pt;font-style:italic;padding:8px;">This workbook was generated automatically — keep for BIR / audit trail • Tubig Irosin, Irosin Sorsogon</div></body></html>`
  const filename = `Tubig_Irosin_Dashboard_${sanitizeFilename(monthLabel)}_${monthKey}.xls`
  downloadBlob(full, filename, 'application/vnd.ms-excel')
}

export function exportInventoryExcel(inventory) {
  const headers = ['#','Product','SKU','Filled','Empty','Threshold','Unit','Status','Price / unit']
  const rows = inventory.map((it, i)=> {
    const status = it.stockFilled <= it.threshold ? 'LOW' : it.stockFilled <= it.threshold*2 ? 'WATCH' : 'HEALTHY'
    return [String(i+1), it.icon + ' ' + it.name, it.sku, String(it.stockFilled), String(it.stockEmpty), String(it.threshold), it.unit, status, it.price? peso(it.price):'—']
  })
  const summary = [
    { label: 'Total SKUs', value: String(inventory.length) },
    { label: 'Total Filled', value: String(inventory.reduce((s,it)=>s+it.stockFilled,0)) + ' gals/cases' },
    { label: 'Total Empty', value: String(inventory.reduce((s,it)=>s+it.stockEmpty,0)) },
    { label: 'Low Stock Items', value: String(inventory.filter(it=> it.stockFilled <= it.threshold).length) },
  ]
  const html = buildWorkbookSheet({
    title: 'TUBIG IROSIN — INVENTORY & SUPPLIES',
    subtitle: `Stock & Supplies  •  ${inventory.length} products  •  ${nowPHString()}`,
    headers, rows, summary,
    footer: 'Low stock highlighted — reorder before threshold. Caps & filters are non-revenue items.'
  })
  downloadBlob(html, `Tubig_Irosin_Inventory_${new Date().toISOString().slice(0,10)}.xls`)
}

export function exportExpensesExcel(expensesList, monthEvents) {
  const list = monthEvents ? monthEvents.filter(e=>e.type==='expense').map(e=> ({date:e.date, category:(e.title||'Other').split(' -')[0], desc:e.title, amount:e.amount})) : expensesList.map(e=> ({...e, category:e.category, desc:e.desc}))
  const headers = ['#','Date','Category','Description','Amount']
  const rows = list.map((e,i)=> [String(i+1), e.date, e.category, e.desc||e.title||'', peso(e.amount)])
  const total = list.reduce((s,e)=>s+e.amount,0)
  const summary = [{label:'Total Expenses', value: peso(total)}, {label:'Avg per Expense', value: list.length? peso(Math.round(total/list.length)): '₱0'}]
  const html = buildWorkbookSheet({
    title: 'TUBIG IROSIN — EXPENSES',
    subtitle: `Costs & Bills  •  ${list.length} entries  •  Total ${peso(total)}`,
    headers, rows, summary,
    footer: 'Electricity, fuel, caps, water, maintenance — keep receipts for audit.'
  })
  downloadBlob(html, `Tubig_Irosin_Expenses_${new Date().toISOString().slice(0,10)}.xls`)
}

export function exportHiramExcel( _hiramRecords ) {
  // import not needed, caller passes records
  const headers = ['#','Customer','Phone','Barangay','Borrowed','Returned','Balance','Due Date','Status']
  const rows = _hiramRecords.map((r,i)=> {
    const bal = r.borrowed - r.returned
    return [String(i+1), r.customer, r.phone, r.barangay, String(r.borrowed), String(r.returned), String(bal), r.due, r.status.toUpperCase()]
  })
  const outstanding = _hiramRecords.filter(r=>r.status!=='returned').reduce((s,r)=>s+(r.borrowed-r.returned),0)
  const summary = [
    {label:'Outstanding Gallons', value: `${outstanding} gals`},
    {label:'Active Borrowers', value: String(_hiramRecords.filter(r=>r.status!=='returned').length)},
    {label:'Overdue', value: String(_hiramRecords.filter(r=>r.status==='overdue').length)},
  ]
  const html = buildWorkbookSheet({
    title: 'TUBIG IROSIN — HIRAM TRACKER',
    subtitle: `Borrowed Gallons  •  ${outstanding} gals outstanding  •  ${ _hiramRecords.length } records`,
    headers, rows, summary,
    footer: 'Hiram = borrowed containers. Follow up overdue via calendar hiram due alerts.'
  })
  downloadBlob(html, `Tubig_Irosin_Hiram_${new Date().toISOString().slice(0,10)}.xls`)
}

export function exportCalendarExcel(events) {
  const headers = ['#','Date','Type','Title','Barangay / Customer','Amount','Note']
  const rows = [...events].sort((a,b)=> a.date.localeCompare(b.date)).map((e,i)=> [String(i+1), e.date, e.type.toUpperCase(), e.title, e.customer||'—', e.amount? peso(e.amount):'—', e.note||''])
  const saleTotal = events.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)
  const summary = [
    {label:'Total Entries', value: String(events.length)},
    {label:'Total Sales + Deliveries', value: peso(saleTotal)},
    {label:'Expenses Count', value: String(events.filter(e=>e.type==='expense').length)},
  ]
  const html = buildWorkbookSheet({
    title: 'TUBIG IROSIN — CALENDAR & SALES SCHEDULE',
    subtitle: `All Calendar Events  •  ${events.length} entries  •  Auto-export`,
    headers, rows, summary,
    footer: 'Each row = calendar cell entry. Amount in ₱. Hiram entries have ₱0.'
  })
  downloadBlob(html, `Tubig_Irosin_Calendar_${new Date().toISOString().slice(0,10)}.xls`)
}

export function exportReportsExcel({ events, inventory }) {
  // reuse dashboard logic but with reports title
  // delegate to dashboard but with different filename
  // For professional look, just call dashboard export with Reports prefix
  // Build slight variant: Revenue by Barangay + Summary same as ReportsView static but dynamic

  // Reuse dashboard exporter but change title via manual html
  // Quick: call exportDashboardExcel and rename? Instead build here
  const d = new Date()
  let monthKey = d.toISOString().slice(0,7)
  let monthEvents = events.filter(e => e.date.startsWith(monthKey))
  let effective = d
  if (monthEvents.length===0 && events.length){
    const latest = [...events].sort((a,b)=> b.date.localeCompare(a.date))[0]
    monthKey = latest.date.slice(0,7)
    monthEvents = events.filter(e=>e.date.startsWith(monthKey))
    effective = new Date(latest.date+'T00:00:00')
  }
  const monthLabel = monthLabelFrom(effective)
  const isSale = e=> e.type==='sale'||e.type==='delivery'
  const monthSales = monthEvents.filter(isSale).reduce((s,e)=>s+e.amount,0)
  const expenseTotal = monthEvents.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0)
  const map={}
  monthEvents.filter(isSale).forEach(e=>{
    const k=(e.customer||'Other').replace(/^Brgy\.?\s*/i,'').trim()||'Other'
    map[k]=(map[k]||0)+e.amount
  })
  const barangayRows = Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=> [k, peso(v)])
  const headers = ['Barangay','Revenue']
  const html = buildWorkbookSheet({
    title: `TUBIG IROSIN — REPORTS & ANALYTICS`,
    subtitle: `${monthLabel}  •  ${monthEvents.length} events  •  Professional Export`,
    headers, rows: barangayRows.length? barangayRows: [['No data','₱0']],
    summary: [
      {label:'Month Sales', value: peso(monthSales)},
      {label:'Month Expenses', value: peso(expenseTotal)},
      {label:'Net', value: peso(monthSales-expenseTotal)},
      {label:'Inventory SKUs', value: String(inventory.length)},
    ],
    footer: 'Insight: Top barangay drives majority — prioritize deliveries.'
  })
  downloadBlob(html, `Tubig_Irosin_Reports_${sanitizeFilename(monthLabel)}_${monthKey}.xls`)
}

export function exportAllBackup({ events, inventory }) {
  // JSON backup + also Excel combined? For now JSON
  const payload = { generated: nowPHString(), events, inventory }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Tubig_Irosin_Backup_${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
