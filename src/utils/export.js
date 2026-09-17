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
  // distribute ~900px total width
  const totalW = 900
  const colW = Math.floor(totalW / Math.max(1, cols))
  const colWidths = headers.map((_, i) => (i === 0 ? Math.floor(colW*1.4) : Math.floor((totalW - Math.floor(colW*1.4)) / (cols-1)) ))
  // adjust first col wider, rest equal
  const wrap = (html) => `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(title.slice(0,31))}</x:Name><x:WorksheetOptions><x:DisplayGridlines/><x:FitToPage/><x:Print><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight></x:Print></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>table{border-collapse:collapse} td,th{font-family:Calibri,Arial,sans-serif;vertical-align:middle} br{mso-data-placement:same-cell}</style></head><body>${html}</body></html>`

  let html = `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;table-layout:fixed;">`
  html += `<colgroup>${colWidths.map(w=> `<col style="width:${w}px">`).join('')}</colgroup>`

  // Title banner
  html += `<tr style="height:28px;"><td colspan="${cols}" style="background:${headerBg};color:#ffffff;font-size:14pt;font-weight:bold;text-align:center;padding:12px;border:1px solid ${headerBg};mso-pattern:${headerBg} none;letter-spacing:0.02em;">${escapeHtml(title)}</td></tr>`
  html += `<tr style="height:22px;"><td colspan="${cols}" style="background:${subBg};color:#dbeafe;font-size:10pt;font-weight:600;text-align:center;padding:8px;border:1px solid ${subBg};">${escapeHtml(subtitle)}</td></tr>`
  html += `<tr><td colspan="${cols}" style="background:#f1f5f9;color:#475569;font-size:8pt;text-align:center;padding:6px;border:1px solid #e2e8f0;">Generated: ${escapeHtml(nowPHString())} &nbsp;|&nbsp; Asia/Manila • Tubig Irosin • Irosin, Sorsogon • Professional Spreadsheet • Offline Mode</td></tr>`
  html += `<tr><td colspan="${cols}" style="height:8px;border:none;"></td></tr>`

  // Headers
  html += `<tr style="height:24px;">`
  headers.forEach((h,i) => {
    const w = colWidths[i]
    html += `<th style="background:${thBg};color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;border:1px solid #0c2d4a;padding:9px 8px;mso-pattern:${thBg} none;width:${w}px;word-wrap:break-word;white-space:normal;vertical-align:middle;">${escapeHtml(h)}</th>`
  })
  html += `</tr>`

  // Rows
  rows.forEach((row, i) => {
    const isAlt = i % 2 === 1
    const bg = isAlt ? '#f1f5f9' : '#ffffff'
    html += `<tr style="height:22px;">`
    row.forEach((cell, idx) => {
      const raw = cell == null ? '' : String(cell)
      const isMoney = raw.includes('₱')
      const isNum = /^-?[\d,]+$/.test(raw.replace(/[₱\s]/g, ''))
      const align = isMoney || isNum ? 'right' : 'left'
      const bold = idx === 0 ? 'font-weight:bold;' : ''
      html += `<td style="background:${bg};color:#0f172a;font-size:10pt;${bold}text-align:${align};border:1px solid #94a3b8;padding:7px 8px;word-wrap:break-word;white-space:normal;vertical-align:middle;">${escapeHtml(raw)}</td>`
    })
    html += `</tr>`
  })

  if (rows.length === 0) {
    html += `<tr><td colspan="${cols}" style="background:#fffbeb;color:#92400e;font-size:10pt;text-align:center;border:1px solid #fde68a;padding:12px;">No records for this period.</td></tr>`
  }

  // Summary
  if (summary && summary.length) {
    html += `<tr><td colspan="${cols}" style="height:8px;border:none;background:#ffffff;"></td></tr>`
    summary.forEach(s => {
      html += `<tr style="height:22px;"><td colspan="${cols - 1}" style="background:#dbeafe;color:#0c4a6e;font-size:10pt;font-weight:bold;text-align:right;border:1px solid #93c5fd;padding:8px 10px;">${escapeHtml(s.label)}</td><td style="background:#dbeafe;color:#0c2d4a;font-size:10pt;font-weight:800;text-align:right;border:1px solid #93c5fd;padding:8px 10px;">${escapeHtml(s.value)}</td></tr>`
    })
  }

  // Footer
  html += `<tr><td colspan="${cols}" style="height:12px;border:none;"></td></tr>`
  if (footer) {
    html += `<tr><td colspan="${cols}" style="color:#475569;font-size:8pt;text-align:center;border:none;padding:6px;border-top:1px solid #e2e8f0;">${escapeHtml(footer)}</td></tr>`
  }
  html += `<tr><td colspan="${cols}" style="color:#64748b;font-size:7.5pt;text-align:center;border:none;padding:4px;font-style:italic;border-top:2px solid #0c2d4a;">This spreadsheet was generated automatically from Tubig Irosin Inventory. Keep for BIR / audit trail. • Each cell aligned on fixed grid — ready to print.</td></tr>`

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
  const d = currentDate instanceof Date ? currentDate : new Date()
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
  const net = monthSales - expenseTotal

  const map = {}
  monthEvents.filter(isSale).forEach(e=>{
    const k = (e.customer || 'Other').replace(/^Brgy\.?\s*/i,'').trim() || 'Other'
    map[k] = (map[k]||0)+e.amount
  })
  const barangayRows = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=> [k, peso(v)])
  const daysInMonth = new Date(effective.getFullYear(), effective.getMonth()+1, 0).getDate()
  const dailyRows = Array.from({length: daysInMonth}, (_,i)=>{
    const day = String(i+1).padStart(2,'0')
    const iso = `${monthKey}-${day}`
    const v = events.filter(e=>e.date===iso && isSale(e)).reduce((s,e)=>s+e.amount,0)
    const count = events.filter(e=>e.date===iso && isSale(e)).length
    return [day, iso, String(count), peso(v)]
  }).filter(r => r[3] !== '₱0' || Number(r[2])>0)
  const recentRows = [...events].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,15).map(e=> [e.date, e.type.toUpperCase(), e.title, e.customer||'—', e.amount? peso(e.amount):'—', e.note||''])

  const title = `TUBIG IROSIN — DASHBOARD`
  const subtitle = `Water Refilling Station • Irosin, Sorsogon  •  ${monthLabel}  •  ${monthEvents.length} events  •  ${inventory.length} SKUs`

  // helper for aligned, properly sized tables
  const section = ({ subTitle, headers, rows, summary, colWidths }) => {
    const cols = headers.length
    const widths = colWidths || headers.map(()=> 140)
    let t = `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;table-layout:fixed;margin-bottom:14px;">`
    // colgroup for Excel column widths → aligns each cell
    t += `<colgroup>`
    widths.forEach(w=> t+= `<col style="width:${w}px">`)
    t += `</colgroup>`
    // section header
    t += `<tr><td colspan="${cols}" style="background:#0c2d4a;color:#ffffff;font-size:12pt;font-weight:bold;text-align:left;padding:10px 12px;border:1px solid #0c2d4a;mso-pattern:#0c2d4a none;">${escapeHtml(subTitle)}</td></tr>`
    // column titles
    t += `<tr>`
    headers.forEach((h,i)=>{
      const w = widths[i] || 140
      t+= `<th style="background:#1a7bb8;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;border:1px solid #0c2d4a;padding:9px 8px;mso-pattern:#1a7bb8 none;width:${w}px;word-wrap:break-word;white-space:normal;">${escapeHtml(h)}</th>`
    })
    t+=`</tr>`
    // data rows
    rows.forEach((row,i)=>{
      const bg = i%2?'#f1f5f9':'#ffffff'
      t+=`<tr style="height:22px;">`
      row.forEach((cell, idx)=>{
        const raw = String(cell ?? '')
        const isMoney = raw.includes('₱')
        const isNum = /^\d+$/.test(raw.replace(/[,₱\s]/g,''))
        const align = isMoney || isNum ? 'right' : 'left'
        const bold = idx===0? 'font-weight:bold;':''
        const wrap = 'word-wrap:break-word;white-space:normal;'
        t+= `<td style="background:${bg};color:#0f172a;font-size:10pt;${bold}text-align:${align};border:1px solid #94a3b8;padding:7px 8px;${wrap}">${escapeHtml(raw)}</td>`
      })
      t+=`</tr>`
    })
    if (!rows.length) {
      t+= `<tr><td colspan="${cols}" style="background:#fffbeb;color:#92400e;font-size:10pt;text-align:center;border:1px solid #fde68a;padding:12px;">No records for this period.</td></tr>`
    }
    // summary rows
    if (summary && summary.length) {
      t+= `<tr><td colspan="${cols}" style="height:6px;border:none;background:#ffffff;"></td></tr>`
      summary.forEach(s=>{
        t+= `<tr><td colspan="${cols-1}" style="background:#dbeafe;color:#0c4a6e;font-size:10pt;font-weight:bold;text-align:right;border:1px solid #93c5fd;padding:8px 10px;">${escapeHtml(s.label)}</td><td style="background:#dbeafe;color:#0c2d4a;font-size:10pt;font-weight:800;text-align:right;border:1px solid #93c5fd;padding:8px 10px;">${escapeHtml(s.value)}</td></tr>`
      })
    }
    t+=`</table>`
    return t
  }

  // Master header table (aligned to widest width)
  let combined = `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;table-layout:fixed;"><colgroup><col style="width:900px"></colgroup>`
  combined += `<tr><td style="background:#0c2d4a;color:#ffffff;font-size:16pt;font-weight:bold;text-align:center;padding:14px;border:1px solid #0c2d4a;mso-pattern:#0c2d4a none;letter-spacing:0.02em;">${escapeHtml(title)}</td></tr>`
  combined += `<tr><td style="background:#0e4a7a;color:#dbeafe;font-size:10pt;font-weight:600;text-align:center;padding:8px;border:1px solid #0e4a7a;">${escapeHtml(subtitle)}</td></tr>`
  combined += `<tr><td style="background:#f1f5f9;color:#475569;font-size:8pt;text-align:center;padding:6px;border:1px solid #e2e8f0;">Generated: ${escapeHtml(nowPHString())} &nbsp;|&nbsp; Asia/Manila • Offline Mode — Tubig Irosin • Professional Spreadsheet</td></tr>`
  combined += `</table><div style="height:16px;"></div>`

  // KPIs
  combined += section({
    subTitle: `KPIs — ${monthLabel}`,
    headers: ['Metric','Value'],
    colWidths: [520, 380],
    rows: [
      ['Month Sales (sale + delivery)', peso(monthSales)],
      ['Walk-in Sales', peso(saleTotal)],
      ['Delivery Sales', peso(delTotal)],
      ['Expenses (month)', peso(expenseTotal)],
      ['Net (Sales − Expenses)', peso(net)],
      ['Total Transactions (month)', String(monthEvents.length)],
      ['Avg per Transaction', peso(Math.round(monthSales/Math.max(1, monthEvents.filter(isSale).length)))],
    ],
    summary: [{label:'Net Position', value: net>=0? `PROFIT ${peso(net)}` : `LOSS ${peso(net)}`}]
  })

  // Daily
  combined += section({
    subTitle: `Daily Sales Trend — ${monthLabel}`,
    headers: ['Day','Date (YYYY-MM-DD)','Orders','Sales (₱)'],
    colWidths: [90, 260, 150, 400],
    rows: dailyRows.length? dailyRows : [['—','—','0','₱0']],
    summary: [{label:'Month Sales Total', value: peso(monthSales)}, {label:'Peak Day', value: (()=>{ const p=[...dailyRows].sort((a,b)=> parseInt(String(b[3]).replace(/[^\d]/g,'')||0)-parseInt(String(a[3]).replace(/[^\d]/g,'')||0))[0]; return p? `${p[1]} • ${p[3]}`:'—' })()}]
  })

  // Barangay
  combined += section({
    subTitle: `Revenue by Barangay — ${monthLabel}`,
    headers: ['Barangay','Revenue (₱)'],
    colWidths: [550, 350],
    rows: barangayRows.length? barangayRows : [['No data','₱0']],
    summary: barangayRows[0]? [{label:`Top: ${barangayRows[0][0]} (${monthSales? Math.round((parseInt(String(barangayRows[0][1]).replace(/[^\d]/g,'')) / monthSales)*100):0}% of sales)`, value: barangayRows[0][1]}] : []
  })

  // Expense
  const expMap = {}
  monthEvents.filter(e=>e.type==='expense').forEach(e=>{
    const cat = (e.title || 'Other').split(' -')[0].split(' ')[0].trim() || 'Other'
    expMap[cat]=(expMap[cat]||0)+e.amount
  })
  const expRows = Object.entries(expMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=> [k, peso(v)])
  combined += section({
    subTitle: `Expense Breakdown — ${monthLabel}`,
    headers: ['Category','Amount (₱)'],
    colWidths: [550, 350],
    rows: expRows.length? expRows : [['—','₱0']],
    summary: [{label:'Total Expenses', value: peso(expenseTotal)}, {label:'Cost vs Sales', value: monthSales? `${Math.round((expenseTotal/monthSales)*100)}% of sales` : '—'}]
  })

  // Inventory
  const invRows = inventory.map(it=> [it.icon + ' ' + it.name, it.sku, String(it.stockFilled), String(it.stockEmpty), String(it.threshold), it.stockFilled <= it.threshold ? 'LOW — reorder' : it.stockFilled <= it.threshold*2 ? 'WATCH' : 'HEALTHY', it.price? peso(it.price):'—'])
  combined += section({
    subTitle: `Inventory & Supplies — Stock Levels (${inventory.length} SKUs)`,
    headers: ['Product','SKU','Filled','Empty','Min','Status','Price / unit'],
    colWidths: [260, 140, 90, 90, 90, 150, 130],
    rows: invRows,
    summary: [
      {label:'Total Filled', value: String(inventory.reduce((s,it)=>s+it.stockFilled,0))},
      {label:'Total Empty', value: String(inventory.reduce((s,it)=>s+it.stockEmpty,0))},
      {label:'Low Stock Items', value: String(inventory.filter(it=> it.stockFilled <= it.threshold).length)},
    ]
  })

  // Recent
  combined += section({
    subTitle: `Recent Transactions — Latest 15`,
    headers: ['Date','Type','Title','Barangay / Customer','Amount','Note'],
    colWidths: [120, 110, 220, 180, 120, 200],
    rows: recentRows,
  })

  const full = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><meta name=ProgId content=Excel.Sheet><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Dashboard</x:Name><x:WorksheetOptions><x:Print><x:ValidPrinterInfo/><x:PaperSizeIndex>9</x:PaperSizeIndex><x:HorizontalResolution>300</x:HorizontalResolution><x:VerticalResolution>300</x:VerticalResolution></x:Print><x:DisplayGridlines/><x:FitToPage/><x:Print><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight></x:Print></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>table{border-collapse:collapse} td,th{font-family:Calibri,Arial,sans-serif;vertical-align:middle} br{mso-data-placement:same-cell}</style></head><body style="background:#ffffff;">${combined}<div style="text-align:center;color:#64748b;font-size:8pt;padding:12px;border-top:2px solid #0c2d4a;margin-top:10px;">Tubig Irosin • Irosin, Sorsogon • Generated ${escapeHtml(nowPHString())} • Keep for BIR / audit trail • Professional spreadsheet — each section aligned on fixed cell grid</div></body></html>`
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

export function exportOrdersExcel(orders) {
  const headers = ['Order Number', 'Date & Time', 'Customer', 'Phone', 'Address', 'Items', 'Quantity', 'Subtotal', 'Delivery Fee', 'Total', 'Payment', 'Schedule', 'Status', 'Canceled', 'Notes']
  const rows = [...orders].sort((a, b) => b.date - a.date).map(o => {
    // database-driven status (no timers)
    const status = o.status || (o.isCanceled || o.is_canceled ? 'CANCELED' : 'PENDING')
    const d = new Date(o.date)
    const datePH = d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const itemsStr = o.items.map(it => {
      const p = it.product || { name: `PID ${it.productId}` }
      return `${p.name} x${it.quantity}`
    }).join('; ')
    const qtyTotal = o.items.reduce((s, it) => s + it.quantity, 0)
    return [o.orderId, datePH, o.customerName, o.phone || '—', o.address || '—', itemsStr, String(qtyTotal), peso(o.subtotal), peso(o.deliveryFee), peso(o.total), o.payment, o.schedule, status, o.isCanceled ? 'YES' : 'NO', o.notes || '—']
  })
  const totalRevenue = orders.filter(o => !o.isCanceled).reduce((s, o) => s + o.total, 0)
  const summary = [
    { label: 'Total Orders', value: String(orders.length) },
    { label: 'Canceled Orders', value: String(orders.filter(o => o.isCanceled).length) },
    { label: 'Total Sales', value: peso(totalRevenue) },
    { label: 'Average Order Value', value: orders.filter(o => !o.isCanceled).length ? peso(Math.round(totalRevenue / orders.filter(o => !o.isCanceled).length)) : '₱0' },
  ]
  const html = buildWorkbookSheet({
    title: 'TUBIG IROSIN — CUSTOMER ORDERS',
    subtitle: `${orders.length} orders • ${peso(totalRevenue)} total sales • All orders from this device`,
    headers, rows, summary,
    footer: 'Order status is database-driven. Update status manually in Supabase/orders table.',
  })
  downloadBlob(html, `Tubig_Irosin_Orders_${new Date().toISOString().slice(0, 10)}.xls`)
}

export function exportProductsExcel(products) {
  const headers = ['#', 'Product', 'Size', 'Container', 'Description', 'Price', 'Water Type', 'Bottle Type', 'Available']
  const rows = products.map((p, i) => [
    String(i + 1),
    p.name,
    p.size,
    p.container,
    p.description,
    peso(p.price),
    p.typeLabel || p.type,
    p.bottleLabel || p.bottleSituation,
    p.type === 'PURIFIED' ? 'Yes' : 'Coming soon',
  ])
  const summary = [
    { label: 'Total Products', value: String(products.length) },
    { label: 'Ready to Order', value: String(products.filter(p => p.type === 'PURIFIED').length) },
    { label: 'Coming Soon', value: String(products.filter(p => p.type !== 'PURIFIED').length) },
  ]
  const html = buildWorkbookSheet({
    title: 'TUBIG IROSIN — WATER PRODUCTS',
    subtitle: `${products.length} products • Purified ready to order • Mineral and Alkaline coming soon`,
    headers, rows, summary,
    footer: 'Prices depend on bottle type: With Gallon, New Gallon, or Borrow.',
  })
  downloadBlob(html, `Tubig_Irosin_Products_${new Date().toISOString().slice(0, 10)}.xls`)
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
