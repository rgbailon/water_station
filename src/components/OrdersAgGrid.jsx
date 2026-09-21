import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

import { peso } from '../utils/dateUtils'
import {
  productById,
  getOrderStatus,
  getPaymentStatus,
  getValidStatuses,
  resolveStatusForOrder,
  autoMoveNotice,
  needsPickup,
  canCancelOrder,
  formatOrderDateShort,
  getOrderDisplayTotal,
} from '../data/ordersData'

ModuleRegistry.registerModules([AllCommunityModule])

const STATUS_META = {
  PENDING: { label: 'Pending', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  CONFIRMED: { label: 'Order Confirmed', color: '#1a7bb8', bg: '#e0f2fe', border: '#bae6fd' },
  TO_PICK_UP: { label: 'To Pick Up', color: '#ea580c', bg: '#ffedd5', border: '#fdba74' },
  PREPARING: { label: 'Preparing', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#059669', bg: '#dcfce7', border: '#a7f3d0' },
  DELIVERED: { label: 'Delivered', color: '#334155', bg: '#e2e8f0', border: '#cbd5e1' },
  CANCELED: { label: 'Canceled', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
}

function StatusPill({ statusId }) {
  const m = STATUS_META[statusId] || STATUS_META.PENDING
  return <span className="pill" style={{ background: m.bg, color: m.color, borderColor: m.border }}>{m.label}</span>
}

function stop(e) {
  e.stopPropagation()
}

// ---- cell renderers (AG Grid passes { data, value, ... }) ----

function OrderIdCell(props) {
  const order = props.data
  if (!order) return null
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={stop} onMouseDown={stop}>
      <b style={{ fontFamily: 'var(--mono)', color: 'var(--slate-900)', fontSize: 13 }}>{order.orderId}</b>
      <button
        className="btn-xs"
        style={{ padding: '2px 6px', fontSize: 10 }}
        title="Copy"
        onClick={(e) => {
          e.stopPropagation()
          try { navigator.clipboard.writeText(order.orderId) } catch {}
          props.context?.showToast?.('Copied ' + order.orderId)
        }}
      >
        ⎘
      </button>
    </div>
  )
}

function DateCell(props) {
  const order = props.data
  if (!order) return null
  return (
    <div style={{ lineHeight: 1.35, padding: '2px 0' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-900)' }}>{formatOrderDateShort(order.date)}</div>
      <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{order.status}</div>
    </div>
  )
}

function CustomerCell(props) {
  const order = props.data
  if (!order) return null
  return (
    <div style={{ lineHeight: 1.4, padding: '2px 0' }}>
      <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: 13 }}>{order.customerName}</div>
      <div style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>{order.phone || '—'} • {order.address}</div>
      {order.notes && (
        <div style={{ fontSize: 11.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 6px', marginTop: 4, display: 'inline-block' }}>
          📝 {order.notes}
        </div>
      )}
    </div>
  )
}

function ItemsCell(props) {
  const order = props.data
  if (!order) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 0' }}>
      {(order.items || []).map((it, i) => {
        const p = it.product || productById[it.productId]
        if (!p) return null
        const isBorrow = it.is_borrow || p?.bottleSituation === 'BORROW'
        return (
          <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{p.name} ({p.container})</span>
            <span style={{ color: 'var(--slate-500)' }}>×{it.quantity}</span>
            {isBorrow && <span className="pill amber" style={{ fontSize: 10, padding: '1px 5px' }}>Borrow</span>}
          </div>
        )
      })}
    </div>
  )
}

function BorrowedCell(props) {
  const order = props.data
  if (!order) return null
  const borrowed = order.borrowedCount ?? order.borrowed_count ?? 0
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
      {borrowed > 0
        ? <span className="pill amber" style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderColor: '#fde68a' }}>🤝 {borrowed} gals</span>
        : <span className="pill slate" style={{ fontSize: 11 }}>— 0</span>}
      {borrowed > 0 && <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginTop: 2 }}>Audit</div>}
    </div>
  )
}

function PaymentCell(props) {
  const order = props.data
  if (!order) return null
  const ps = getPaymentStatus(order).id
  const onPaymentChange = props.context?.onPaymentChange
  return (
    <div style={{ textAlign: 'center' }} onClick={stop} onMouseDown={stop}>
      <select
        value={ps}
        onClick={stop}
        onMouseDown={stop}
        onChange={(e) => { e.stopPropagation(); onPaymentChange?.(order.orderId, e.target.value) }}
        style={{
          padding: '4px 6px', borderRadius: 8,
          border: `1px solid ${ps === 'PAID' ? '#a7f3d0' : '#fde68a'}`,
          fontSize: 11, fontWeight: 600,
          background: ps === 'PAID' ? '#dcfce7' : '#fef3c7',
          color: ps === 'PAID' ? '#065f46' : '#92400e',
        }}
      >
        <option value="PAID">Paid</option>
        <option value="UNPAID">Unpaid</option>
      </select>
    </div>
  )
}

function TotalCell(props) {
  const order = props.data
  if (!order) return null
  const total = getOrderDisplayTotal(order)
  const borrowed = order.borrowedCount ?? order.borrowed_count ?? 0
  const isUnpaid = getPaymentStatus(order).id === 'UNPAID'
  return (
    <div style={{ textAlign: 'left', fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.35 }}>
      <div>{peso(total)}</div>
      {borrowed > 0 && isUnpaid && total !== order.total && (
        <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>container price</div>
      )}
      {borrowed > 0 && isUnpaid && (
        <div style={{ fontSize: 10, color: '#92400e' }}>borrowed {borrowed} gals</div>
      )}
    </div>
  )
}

function StatusCell(props) {
  const order = props.data
  if (!order) return null
  return <StatusPill statusId={getOrderStatus(order).id} />
}

function ChangeStatusCell(props) {
  const order = props.data
  if (!order) return null
  const st = getOrderStatus(order)
  const onStatusChange = props.context?.onStatusChange
  const showToast = props.context?.showToast
  return (
    <div onClick={stop} onMouseDown={stop}>
      <select
        value={st.id}
        onClick={stop}
        onMouseDown={stop}
        onChange={(e) => {
          e.stopPropagation()
          const requested = e.target.value
          const next = resolveStatusForOrder(order, requested)
          if (next !== requested) {
            const notice = autoMoveNotice(next)
            showToast?.(notice || `Auto-moved → ${next}`)
          }
          onStatusChange?.(order.orderId, next)
        }}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 600, background: 'var(--white)' }}
      >
        {getValidStatuses(order).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      {!needsPickup(order) && <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginTop: 2 }}>No pick-up</div>}
    </div>
  )
}

function ActionCell(props) {
  const order = props.data
  if (!order) return null
  const st = getOrderStatus(order)
  const canCancel = canCancelOrder(order)
  const ctx = props.context || {}
  const btn = (label, title, bg, onClick) => (
    <button
      className="btn-xs primary"
      style={{ padding: '6px 10px', background: bg, borderColor: bg, color: 'white', width: '100%' }}
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onMouseDown={stop}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0' }} onClick={stop} onMouseDown={stop}>
      <button className="btn-xs" style={{ padding: '6px 10px', width: '100%' }} onClick={(e) => { e.stopPropagation(); ctx.onView?.(order) }} onMouseDown={stop}>View</button>
      {st.id === 'PENDING' && btn('✓ Confirm', 'Confirm order', '#1a7bb8', () => ctx.onStatusChange?.(order.orderId, 'CONFIRMED'))}
      {needsPickup(order) && (st.id === 'CONFIRMED' || st.id === 'TO_PICK_UP') && btn('🛻 Picked Up', 'Empties collected — move to Preparing', '#7c3aed', () => ctx.onStatusChange?.(order.orderId, 'PREPARING'))}
      {st.id === 'PREPARING' && btn('🚚 Out for Delivery', 'Ready — move to Out for Delivery (delivery list)', '#059669', () => ctx.onStatusChange?.(order.orderId, 'OUT_FOR_DELIVERY'))}
      {st.id === 'OUT_FOR_DELIVERY' && btn('✓ Delivered', 'Delivered to customer', '#334155', () => ctx.onStatusChange?.(order.orderId, 'DELIVERED'))}
      {canCancel && (
        <button className="btn-xs danger" style={{ padding: '6px 10px', width: '100%' }} onClick={(e) => { e.stopPropagation(); ctx.onCancel?.(order.orderId) }} onMouseDown={stop}>Cancel</button>
      )}
    </div>
  )
}

export default function OrdersAgGrid({ rowData, onView, onStatusChange, onPaymentChange, onCancel, showToast }) {
  const [isDark, setIsDark] = useState(() => {
    try { return document.documentElement.getAttribute('data-theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    try {
      const el = document.documentElement
      const obs = new MutationObserver(() => setIsDark(el.getAttribute('data-theme') === 'dark'))
      obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
      return () => obs.disconnect()
    } catch { return undefined }
  }, [])

  const context = useMemo(() => ({
    onView, onStatusChange, onPaymentChange, onCancel, showToast,
  }), [onView, onStatusChange, onPaymentChange, onCancel, showToast])

  // ---- sticky top horizontal scrollbar (synced with the grid's own bottom scrollbar) ----
  // NOTE: v36 renamed its internals — the real horizontal scroll element is
  // `.ag-body-horizontal-scroll-viewport`. Driving sync through it (instead of
  // header/body viewports) keeps top bar, header and rows aligned on all versions.
  const gridWrapRef = useRef(null)
  const topScrollRef = useRef(null)
  const syncingRef = useRef(false)

  const getBottomScroll = useCallback(() => {
    const wrap = gridWrapRef.current
    if (!wrap) return null
    return wrap.querySelector('.ag-body-horizontal-scroll-viewport')
  }, [])

  const syncTopSpacer = useCallback(() => {
    const top = topScrollRef.current
    if (!top) return
    const bottom = getBottomScroll()
    const spacer = top.firstElementChild
    if (!spacer || !bottom) return
    spacer.style.width = `${bottom.scrollWidth}px`
    if (!syncingRef.current) top.scrollLeft = bottom.scrollLeft
  }, [getBottomScroll])

  const attachBottomListener = useCallback(() => {
    const bottom = getBottomScroll()
    const top = topScrollRef.current
    if (!bottom || !top || bottom.dataset.topSync === '1') return
    bottom.dataset.topSync = '1'
    bottom.addEventListener('scroll', () => {
      if (syncingRef.current) return
      syncingRef.current = true
      top.scrollLeft = bottom.scrollLeft
      requestAnimationFrame(() => { syncingRef.current = false })
    })
  }, [getBottomScroll])

  useEffect(() => { syncTopSpacer() }, [rowData, syncTopSpacer])

  useEffect(() => {
    attachBottomListener()
    const onResize = () => syncTopSpacer()
    window.addEventListener('resize', onResize)
    const t1 = setTimeout(() => { attachBottomListener(); syncTopSpacer() }, 300)
    const t2 = setTimeout(() => { attachBottomListener(); syncTopSpacer() }, 1000)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t1); clearTimeout(t2) }
  }, [attachBottomListener, syncTopSpacer])

  const handleTopScroll = () => {
    if (syncingRef.current) return
    const top = topScrollRef.current
    if (!top) return
    const bottom = getBottomScroll()
    if (!bottom) return
    syncingRef.current = true
    // drive the grid through its own scrollbar — header + rows follow automatically
    bottom.scrollLeft = top.scrollLeft
    requestAnimationFrame(() => { syncingRef.current = false })
  }

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressHeaderMenuButton: false,
  }), [])

  const columnDefs = useMemo(() => ([
    {
      headerName: 'Order number',
      field: 'orderId',
      width: 140,
      pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: OrderIdCell,
    },
    {
      headerName: 'Date & time',
      field: 'date',
      width: 165,
      sort: 'desc',
      comparator: (a, b) => (a ?? 0) - (b ?? 0),
      filter: 'agTextColumnFilter',
      filterValueGetter: (p) => (p.data ? `${formatOrderDateShort(p.data.date)} ${p.data.status || ''}` : ''),
      cellRenderer: DateCell,
    },
    {
      headerName: 'Customer',
      field: 'customerName',
      width: 230,
      wrapText: true,
      autoHeight: true,
      filter: 'agTextColumnFilter',
      filterValueGetter: (p) => (p.data ? `${p.data.customerName || ''} ${p.data.phone || ''} ${p.data.address || ''} ${p.data.notes || ''}` : ''),
      cellRenderer: CustomerCell,
    },
    {
      headerName: 'Items',
      field: 'items',
      flex: 1,
      minWidth: 240,
      wrapText: true,
      autoHeight: true,
      sortable: false,
      filter: 'agTextColumnFilter',
      filterValueGetter: (p) => (p.data?.items || []).map((it) => (it.product || productById[it.productId])?.name || '').join(' '),
      valueGetter: (p) => (p.data?.items || []).reduce((s, it) => s + (it.quantity || 0), 0),
      cellRenderer: ItemsCell,
    },
    {
      headerName: 'Borrowed',
      colId: 'borrowed',
      width: 115,
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueGetter: (p) => p.data?.borrowedCount ?? p.data?.borrowed_count ?? 0,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: BorrowedCell,
    },
    {
      headerName: 'Payment',
      colId: 'paymentStatus',
      width: 125,
      sortable: true,
      filter: 'agTextColumnFilter',
      valueGetter: (p) => (p.data ? getPaymentStatus(p.data).id : ''),
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: PaymentCell,
    },
    {
      headerName: 'Total',
      colId: 'total',
      width: 140,
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueGetter: (p) => (p.data ? getOrderDisplayTotal(p.data) : 0),
      valueFormatter: (p) => peso(p.value ?? 0),
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
      cellRenderer: TotalCell,
    },
    {
      headerName: 'Status',
      colId: 'status',
      width: 150,
      sortable: true,
      filter: 'agSetColumnFilter',
      valueGetter: (p) => (p.data ? getOrderStatus(p.data).id : ''),
      cellRenderer: StatusCell,
    },
    {
      headerName: 'Change status',
      colId: 'changeStatus',
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: ChangeStatusCell,
    },
    {
      headerName: 'Action',
      colId: 'action',
      width: 170,
      sortable: false,
      filter: false,
      wrapText: true,
      autoHeight: true,
      cellRenderer: ActionCell,
    },
  ]), [])

  return (
    <div className="orders-grid-wrap">
      <div ref={topScrollRef} className="orders-grid-top-scroll" onScroll={handleTopScroll}>
        <div className="orders-grid-top-scroll-inner" />
      </div>
      <div
        ref={gridWrapRef}
        className={isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'}
        style={{ width: '100%' }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          context={context}
          getRowId={(p) => p.data.orderId}
          domLayout="autoHeight"
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          animateRows
          enableCellTextSelection
          ensureDomOrder
          suppressRowClickSelection
          overlayNoRowsTemplate="No orders found."
          onRowDoubleClicked={(e) => { if (e.data) onView?.(e.data) }}
          onGridReady={() => { attachBottomListener(); requestAnimationFrame(syncTopSpacer) }}
          onFirstDataRendered={() => { attachBottomListener(); syncTopSpacer() }}
          onModelUpdated={syncTopSpacer}
          onColumnResized={syncTopSpacer}
          onDisplayedColumnsChanged={syncTopSpacer}
          onGridSizeChanged={syncTopSpacer}
        />
      </div>
    </div>
  )
}
