import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { peso } from '../utils/dateUtils'
import { getOrderDisplayTotal } from '../data/ordersData'

const OVERRIDES_KEY = 'customer_overrides'
const CUSTOM_KEY = 'custom_customers'

// Irosin town proper, Sorsogon — default map center when a customer has no pin yet
const IROSIN_DEFAULT = { lat: 12.9899, lng: 124.0332 }

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed ?? fallback
    }
  } catch {}
  return fallback
}

const norm = (s) => String(s || '').trim().toLowerCase()
const custKey = (name, phone) => `${norm(name)}|${norm(phone)}`

function parseBarangay(address) {
  const a = String(address || '').trim()
  if (!a) return '—'
  // "Brgy. Monbon, Irosin - Purok 3" → "Brgy. Monbon" | "Brgy. Patag - Hall" → "Brgy. Patag"
  const first = a.split(',')[0].trim()
  return first.split('-')[0].trim() || '—'
}

function fmtDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

// ---- Coordinates helpers ----
function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}
function isValidLat(n) { return Number.isFinite(n) && n >= -90 && n <= 90 }
function isValidLng(n) { return Number.isFinite(n) && n >= -180 && n <= 180 }
function hasPin(lat, lng) {
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined &&
    String(lat) !== '' && String(lng) !== '' &&
    isValidLat(Number(lat)) && isValidLng(Number(lng))
}
function fmtCoord(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return v.toFixed(6)
}
function fmtCoords(lat, lng) {
  if (!hasPin(lat, lng)) return ''
  return `${fmtCoord(lat)}, ${fmtCoord(lng)}`
}
const googleMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`
const osmUrl = (lat, lng) => `https://www.openstreetmap.org/?mlat=${Number(lat)}&mlon=${Number(lng)}#map=17/${Number(lat)}/${Number(lng)}`
function osmEmbedUrl(lat, lng) {
  const la = Number(lat), lo = Number(lng)
  const d = 0.008
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lo - d}%2C${la - d}%2C${lo + d}%2C${la + d}&layer=mapnik&marker=${la}%2C${lo}`
}

const emptyForm = { mode: 'add', key: null, id: null, name: '', phone: '', barangay: '', address: '', notes: '', lat: '', lng: '' }

// ---- Lazy Leaflet loader (no npm dep, no API key — OpenStreetMap tiles) ----
function ensureLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.L) return Promise.resolve(window.L)
  if (ensureLeaflet._p) return ensureLeaflet._p
  ensureLeaflet._p = new Promise((resolve, reject) => {
    try {
      const cssId = 'leaflet-cdn-css'
      if (!document.getElementById(cssId)) {
        const css = document.createElement('link')
        css.id = cssId
        css.rel = 'stylesheet'
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(css)
      }
      const jsId = 'leaflet-cdn-js'
      const existing = document.getElementById(jsId)
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L))
        existing.addEventListener('error', () => reject(new Error('Could not load map library — check internet connection')))
        return
      }
      const s = document.createElement('script')
      s.id = jsId
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.async = true
      s.onload = () => (window.L ? resolve(window.L) : reject(new Error('Map library failed to load')))
      s.onerror = () => reject(new Error('Could not load map library — check internet connection'))
      document.body.appendChild(s)
    } catch (e) { reject(e) }
  })
  return ensureLeaflet._p
}

function MapPicker({ initialLat, initialLng, onSave, onClose }) {
  const mapEl = useRef(null)
  const mapObj = useRef(null)
  const markerObj = useRef(null)
  const [pos, setPos] = useState(() => {
    const la = toNumOrNull(initialLat)
    const lo = toNumOrNull(initialLng)
    return hasPin(la, lo) ? { lat: la, lng: lo } : { ...IROSIN_DEFAULT }
  })
  const [mapError, setMapError] = useState('')
  const [mapLoading, setMapLoading] = useState(true)
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [locating, setLocating] = useState(false)
  const posRef = useRef(pos)
  posRef.current = pos

  const moveMarker = (lat, lng) => {
    const p = { lat: Number(lat), lng: Number(lng) }
    setPos(p)
    try {
      if (markerObj.current) markerObj.current.setLatLng([p.lat, p.lng])
      if (mapObj.current) mapObj.current.panTo([p.lat, p.lng])
    } catch {}
  }

  useEffect(() => {
    let cancelled = false
    setMapLoading(true)
    setMapError('')
    ensureLeaflet().then(L => {
      if (cancelled || !mapEl.current) return
      // fresh mount each time the picker opens
      if (mapObj.current) { try { mapObj.current.remove() } catch {} mapObj.current = null }
      const start = posRef.current
      const map = L.map(mapEl.current).setView([start.lat, start.lng], hasPin(initialLat, initialLng) ? 16 : 14)
      mapObj.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)
      const pinIcon = L.divIcon({
        className: '',
        html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📍</div>',
        iconSize: [30, 32],
        iconAnchor: [15, 30],
      })
      const marker = L.marker([start.lat, start.lng], { draggable: true, icon: pinIcon }).addTo(map)
      markerObj.current = marker
      marker.on('dragend', () => {
        const ll = marker.getLatLng()
        setPos({ lat: Number(ll.lat.toFixed(6)), lng: Number(ll.lng.toFixed(6)) })
      })
      map.on('click', (e) => {
        const ll = e.latlng
        marker.setLatLng(ll)
        setPos({ lat: Number(ll.lat.toFixed(6)), lng: Number(ll.lng.toFixed(6)) })
      })
      setTimeout(() => { try { map.invalidateSize() } catch {} }, 200)
      setMapLoading(false)
    }).catch(err => {
      if (!cancelled) { setMapError(err?.message || 'Map failed to load'); setMapLoading(false) }
    })
    return () => {
      cancelled = true
      try { if (mapObj.current) mapObj.current.remove() } catch {}
      mapObj.current = null
      markerObj.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = async () => {
    const query = q.trim()
    if (!query) return
    setSearching(true)
    setResults([])
    try {
      // Bias to Irosin so "Purok 3 Monbon" finds the right place
      const withTown = /irosin|sorsogon/i.test(query) ? query : `${query}, Irosin, Sorsogon, Philippines`
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&q=${encodeURIComponent(withTown)}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Search failed (${res.status})`)
      const rows = await res.json()
      setResults(Array.isArray(rows) ? rows : [])
      if (Array.isArray(rows) && rows.length > 0) {
        moveMarker(Number(rows[0].lat), Number(rows[0].lon))
      } else {
        alert('No places found — try a barangay + landmark (e.g., "Monbon chapel Irosin").')
      }
    } catch (e) {
      alert(`Place search failed: ${e?.message || e}`)
    } finally {
      setSearching(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported on this device'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        moveMarker(Number(p.coords.latitude.toFixed(6)), Number(p.coords.longitude.toFixed(6)))
      },
      (err) => {
        setLocating(false)
        alert(`Could not get location: ${err?.message || err} — allow location permission and try again.`)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  return createPortal((
    <div className="modal-overlay" style={{ zIndex: 80 }} onClick={onClose}>
      <div className="modal modal-wide" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>📍 Pin customer location</h3>
            <p>Click the map or drag the pin • Search a landmark • Save writes the coordinates</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearch() }}
              placeholder='Search place — e.g., "Monbon chapel" or "Patag hall"'
              style={{ flex: '1 1 220px', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13 }}
            />
            <button className="btn-xs" onClick={doSearch} disabled={searching}>{searching ? 'Searching…' : '🔍 Search'}</button>
            <button className="btn-xs" onClick={useMyLocation} disabled={locating}>{locating ? 'Locating…' : '◎ My location'}</button>
          </div>
          {results.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
              {results.map((r, i) => (
                <button
                  key={`${r.place_id || i}`}
                  className="btn-xs"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', fontWeight: 600 }}
                  onClick={() => moveMarker(Number(r.lat), Number(r.lon))}
                  title={`${r.lat}, ${r.lon}`}
                >
                  📌 {r.display_name?.slice(0, 110)}
                </button>
              ))}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <div ref={mapEl} style={{ height: 340, borderRadius: 12, border: '1px solid var(--slate-200)', background: '#e2e8f0', zIndex: 1 }} />
            {(mapLoading || mapError) && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(248,250,252,.92)', borderRadius: 12, fontSize: 13, color: 'var(--slate-600)', padding: 16, textAlign: 'center' }}>
                {mapLoading ? 'Loading map… (needs internet for tiles)' : (
                  <span>⚠ {mapError}<br />You can still paste coordinates manually below.</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
            <span className="pill blue" style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>📌 {fmtCoord(pos.lat)}, {fmtCoord(pos.lng)}</span>
            <a href={googleMapsUrl(pos.lat, pos.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700 }}>Verify in Google Maps ↗</a>
            <span style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>Tip: find the house on satellite view, click it, then Save.</span>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onSave(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)))}>Save pin</button>
        </div>
      </div>
    </div>
  ), document.body)
}

export default function CustomersView({ orders = [] }) {
  const [search, setSearch] = useState('')
  const [barangayFilter, setBarangayFilter] = useState('ALL')
  const [pinFilter, setPinFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('recent')
  const [form, setForm] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [locating, setLocating] = useState(false)
  const [overrides, setOverrides] = useState(() => loadJSON(OVERRIDES_KEY, {}))
  const [custom, setCustom] = useState(() => loadJSON(CUSTOM_KEY, []))

  useEffect(() => { try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides)) } catch {} }, [overrides])
  useEffect(() => { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)) } catch {} }, [custom])

  // ---- Derive customers from real orders (canceled excluded) ----
  const derived = useMemo(() => {
    const map = new Map()
    for (const o of (orders || [])) {
      if (o.isCanceled || o.is_canceled) continue
      const name = (o.customerName || '').trim() || 'Walk-in'
      const phone = (o.phone || '').trim()
      const key = custKey(name, phone)
      let c = map.get(key)
      if (!c) {
        c = { key, name, phone, address: '', orders: 0, spent: 0, borrowed: 0, unpaid: 0, lastOrder: 0 }
        map.set(key, c)
      }
      c.orders += 1
      const total = Number(getOrderDisplayTotal(o)) || 0
      c.spent += total
      c.borrowed += (o.borrowedCount ?? o.borrowed_count ?? 0)
      const pay = String(o.payment_status ?? o.paymentStatus ?? '').toUpperCase()
      if (pay !== 'PAID') c.unpaid += total
      const ts = new Date(o.date).getTime()
      if (!Number.isNaN(ts) && (!c.lastOrder || ts > c.lastOrder)) {
        c.lastOrder = ts
        c.name = name
        if (phone) c.phone = phone
        if ((o.address || '').trim()) c.address = o.address.trim()
      }
    }
    return [...map.values()]
  }, [orders])

  // ---- Merge manual edits (precise location + pinned GPS) over order-derived details ----
  const customers = useMemo(() => {
    const rows = derived.map(d => {
      const ov = overrides[d.key]
      const lat = toNumOrNull(ov?.lat ?? ov?.latitude)
      const lng = toNumOrNull(ov?.lng ?? ov?.longitude)
      return {
        ...d,
        displayName: ov?.name?.trim() || d.name,
        displayPhone: ov?.phone ?? d.phone,
        barangay: ov?.barangay?.trim() || parseBarangay(d.address),
        precise: ov?.address?.trim() || d.address || '—',
        rawAddress: d.address,
        notes: ov?.notes || '',
        lat: hasPin(lat, lng) ? lat : null,
        lng: hasPin(lat, lng) ? lng : null,
        edited: Boolean(ov),
        manual: false,
      }
    })
    for (const m of (custom || [])) {
      const lat = toNumOrNull(m?.lat ?? m?.latitude)
      const lng = toNumOrNull(m?.lng ?? m?.longitude)
      rows.push({
        key: `custom:${m.id}`,
        id: m.id,
        name: m.name,
        displayName: m.name,
        phone: m.phone || '',
        displayPhone: m.phone || '',
        address: m.address || '',
        rawAddress: m.address || '',
        barangay: (m.barangay || '').trim() || '—',
        precise: (m.address || '').trim() || '—',
        notes: m.notes || '',
        lat: hasPin(lat, lng) ? lat : null,
        lng: hasPin(lat, lng) ? lng : null,
        orders: 0, spent: 0, borrowed: 0, unpaid: 0, lastOrder: 0,
        edited: true,
        manual: true,
      })
    }
    return rows
  }, [derived, overrides, custom])

  const barangays = useMemo(() => {
    const set = new Set(customers.map(c => c.barangay).filter(b => b && b !== '—'))
    return ['ALL', ...Array.from(set).sort()]
  }, [customers])

  const filtered = useMemo(() => {
    const rows = customers.filter(c => {
      if (barangayFilter !== 'ALL' && c.barangay !== barangayFilter) return false
      if (pinFilter === 'PINNED' && !hasPin(c.lat, c.lng)) return false
      if (pinFilter === 'NO_PIN' && hasPin(c.lat, c.lng)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${c.displayName} ${c.displayPhone} ${c.barangay} ${c.precise} ${c.notes} ${hasPin(c.lat, c.lng) ? `${c.lat} ${c.lng}` : ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const by = {
      recent: (a, b) => b.lastOrder - a.lastOrder,
      orders: (a, b) => b.orders - a.orders || b.spent - a.spent,
      spent: (a, b) => b.spent - a.spent,
      name: (a, b) => a.displayName.localeCompare(b.displayName),
    }[sortBy] || ((a, b) => b.lastOrder - a.lastOrder)
    return [...rows].sort(by)
  }, [customers, barangayFilter, pinFilter, search, sortBy])

  const totals = useMemo(() => ({
    count: customers.length,
    withPhone: customers.filter(c => (c.displayPhone || '').trim()).length,
    withLocation: customers.filter(c => c.precise && c.precise !== '—').length,
    withPin: customers.filter(c => hasPin(c.lat, c.lng)).length,
    borrowed: customers.filter(c => c.borrowed > 0).length,
  }), [customers])

  // ---- Add / edit form (single modal, portal so it centers on screen) ----
  const openAdd = () => setForm({ ...emptyForm, mode: 'add' })
  const openEdit = (c) => setForm({
    mode: 'edit',
    key: c.key,
    id: c.manual ? c.id : null,
    name: c.displayName,
    phone: c.displayPhone || '',
    barangay: c.barangay === '—' ? '' : c.barangay,
    address: c.manual ? (c.rawAddress || '') : (overrides[c.key]?.address ?? c.rawAddress ?? ''),
    notes: c.notes || '',
    lat: hasPin(c.lat, c.lng) ? String(c.lat) : '',
    lng: hasPin(c.lat, c.lng) ? String(c.lng) : '',
  })

  const setFormLatLng = (lat, lng) => {
    setForm(f => f ? { ...f, lat: String(lat), lng: String(lng) } : f)
    setShowPicker(false)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported on this device'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        setForm(f => f ? {
          ...f,
          lat: Number(p.coords.latitude.toFixed(6)).toString(),
          lng: Number(p.coords.longitude.toFixed(6)).toString(),
        } : f)
      },
      (err) => {
        setLocating(false)
        alert(`Could not get location: ${err?.message || err} — allow location permission and try again.`)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  const formHasPin = form ? hasPin(toNumOrNull(form.lat), toNumOrNull(form.lng)) : false

  const saveForm = () => {
    if (!form) return
    if (!form.name.trim()) { alert('Customer name is required'); return }
    const lat = toNumOrNull(form.lat)
    const lng = toNumOrNull(form.lng)
    const pinFilled = String(form.lat).trim() !== '' || String(form.lng).trim() !== ''
    if (pinFilled && (!hasPin(lat, lng))) {
      if ((String(form.lat).trim() !== '' && !isValidLat(lat)) || (String(form.lng).trim() !== '' && !isValidLng(lng))) {
        alert('Invalid coordinates — latitude must be -90…90 and longitude -180…180 (e.g., 12.989900, 124.033200).')
        return
      }
      alert('Incomplete pin — enter both latitude and longitude, or Clear the pin.')
      return
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      barangay: form.barangay.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      lat: hasPin(lat, lng) ? Number(lat.toFixed(6)) : null,
      lng: hasPin(lat, lng) ? Number(lng.toFixed(6)) : null,
    }
    if (form.mode === 'add') {
      const id = `c${Date.now()}`
      setCustom(prev => [...(prev || []), { id, ...payload, createdAt: Date.now() }])
    } else if (form.id) {
      setCustom(prev => (prev || []).map(m => String(m.id) === String(form.id) ? { ...m, ...payload } : m))
    } else {
      setOverrides(prev => ({ ...prev, [form.key]: { ...payload, updatedAt: Date.now() } }))
    }
    setForm(null)
  }

  const resetOverride = (c) => {
    if (c.manual) {
      if (!confirm(`Delete ${c.displayName} from the directory?`)) return
      setCustom(prev => (prev || []).filter(m => String(m.id) !== String(c.id)))
    } else {
      setOverrides(prev => {
        const next = { ...prev }
        delete next[c.key]
        return next
      })
    }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>👥 Customers</h2>
          <p>Directory from real orders • Edit for location • <span className="pill slate" style={{ fontSize: 11 }}>{totals.count} customers</span> <span className="pill blue" style={{ fontSize: 11 }}>{totals.withLocation} with location</span> <span className="pill green" style={{ fontSize: 11 }}>📍 {totals.withPin} pinned</span> <span className="pill amber" style={{ fontSize: 11 }}>{totals.borrowed} borrowed</span></p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Customer</button>
        </div>
      </div>

      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, barangay, landmark, coords..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13, background: 'var(--white)', color: 'var(--slate-700)' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 14 }}>⌕</span>
        </div>
        <select value={barangayFilter} onChange={e => setBarangayFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          {barangays.map(b => <option key={b} value={b}>{b === 'ALL' ? 'All barangays' : b}</option>)}
        </select>
        <select value={pinFilter} onChange={e => setPinFilter(e.target.value)} title="Filter by pinned GPS location" style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: pinFilter !== 'ALL' ? '#dcfce7' : 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All pins ({totals.count})</option>
          <option value="PINNED">📍 Pinned ({totals.withPin})</option>
          <option value="NO_PIN">No pin ({totals.count - totals.withPin})</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="recent">Recent first</option>
          <option value="orders">Most orders</option>
          <option value="spent">Highest spent</option>
          <option value="name">Name A–Z</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} of {customers.length}</span>
        {(search || barangayFilter !== 'ALL' || pinFilter !== 'ALL') && <button className="btn-xs" onClick={() => { setSearch(''); setBarangayFilter('ALL'); setPinFilter('ALL') }}>Clear</button>}
      </div>

      <div className="table-wrap" style={{ paddingTop: 12 }}>
        <table className="table customers-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Barangay</th>
              <th style={{ minWidth: 230 }}>Location / 📍 Pin</th>
              <th style={{ textAlign: 'center' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Spent</th>
              <th style={{ textAlign: 'center' }}>Borrowed</th>
              <th>Last order</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)' }}>
                {customers.length === 0 ? 'No customers yet — they appear here automatically from orders, or add one manually.' : 'No customers match your search.'}
              </td></tr>
            ) : filtered.map(c => {
              const pinned = hasPin(c.lat, c.lng)
              return (
                <tr key={c.key}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                      {c.displayName}
                      {c.edited && <span className="pill blue" style={{ marginLeft: 6, fontSize: 10 }}>Edited</span>}
                      {c.manual && <span className="pill slate" style={{ marginLeft: 6, fontSize: 10 }}>Manual</span>}
                      {pinned && <span className="pill green" style={{ marginLeft: 6, fontSize: 10 }} title={fmtCoords(c.lat, c.lng)}>📍</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate-600)' }}>{c.displayPhone || '—'}</div>
                    {c.notes && <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>📝 {c.notes}</div>}
                  </td>
                  <td><span className="pill slate" style={{ fontSize: 11 }}>{c.barangay}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--slate-600)', lineHeight: 1.5 }}>
                    <div>{c.precise}</div>
                    {pinned ? (
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 11, background: '#dcfce7', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }} title="Pinned GPS coordinates">
                          📍 {fmtCoords(c.lat, c.lng)}
                        </span>
                        <a href={googleMapsUrl(c.lat, c.lng)} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 800 }} title="Open in Google Maps">Maps ↗</a>
                        <button
                          className="btn-xs"
                          style={{ fontSize: 10, padding: '2px 7px' }}
                          title="Copy coordinates"
                          onClick={() => {
                            const t = `${c.lat}, ${c.lng}`
                            try {
                              if (navigator.clipboard) navigator.clipboard.writeText(t)
                              else {
                                const ta = document.createElement('textarea')
                                ta.value = t
                                document.body.appendChild(ta)
                                ta.select()
                                document.execCommand('copy')
                                document.body.removeChild(ta)
                              }
                            } catch {}
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        <button className="btn-xs" style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => openEdit(c)} title="Pin this customer's location on the map">+ 📍 Pin location</button>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.orders}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--slate-900)' }}>{peso(c.spent)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {c.borrowed > 0
                      ? <span className="pill amber" style={{ fontSize: 11, fontWeight: 800 }}>🤝 {c.borrowed}</span>
                      : <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>—</span>}
                    {c.unpaid > 0 && <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700, marginTop: 2 }}>{peso(c.unpaid)} unpaid</div>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>{fmtDate(c.lastOrder)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-xs" onClick={() => openEdit(c)}>✎ Edit</button>
                      {pinned && (
                        <a className="btn-xs" href={googleMapsUrl(c.lat, c.lng)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }} title="Navigate to customer in Google Maps">🗺</a>
                      )}
                      {c.edited && <button className="btn-xs" onClick={() => resetOverride(c)} title={c.manual ? 'Delete this manual entry' : 'Revert to order details'}>{c.manual ? 'Delete' : 'Reset'}</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ margin: '0 18px 18px', background: '#f8fafc', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5, display: 'flex', gap: 10 }}>
        <span>💡</span>
        <span><b>Tip:</b> Customers appear automatically from orders. Click <b>✎ Edit → 📍 Pin on Map</b> to drop a GPS pin for deliveries — riders can open it in Google Maps. Pins are saved on this device (and to Supabase once <code>migration_customer_coordinates.sql</code> is applied) and never change past order records.</span>
      </div>

      {form && createPortal((
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{form.mode === 'add' ? 'Add Customer' : `Edit Customer`}</h3>
                <p>{form.mode === 'add' ? 'Manual entry — for walk-ins not yet in orders' : 'Update details, location & GPS pin — saved on this device'}</p>
              </div>
              <button className="btn-close" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="field">
                  <label>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Juan Dela Cruz" />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g., 0912 345 6789" />
                </div>
              </div>
              <div className="field">
                <label>Barangay</label>
                <input
                  value={form.barangay}
                  onChange={e => setForm(f => ({ ...f, barangay: e.target.value }))}
                  placeholder="e.g., Brgy. Monbon"
                  list="customer-barangays"
                />
                <datalist id="customer-barangays">
                  {barangays.filter(b => b !== 'ALL').map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div className="field">
                <label>Location (street / purok / landmark)</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g., Purok 3 near chapel, green gate" />
              </div>

              <div className="field">
                <label>📍 Pinned location (GPS coordinates)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="Latitude (e.g., 12.989900)"
                    inputMode="decimal"
                    style={{ flex: '1 1 140px' }}
                  />
                  <input
                    value={form.lng}
                    onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                    placeholder="Longitude (e.g., 124.033200)"
                    inputMode="decimal"
                    style={{ flex: '1 1 140px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <button type="button" className="btn-xs" onClick={() => setShowPicker(true)}>📍 Pin on Map</button>
                  <button type="button" className="btn-xs" onClick={useMyLocation} disabled={locating}>{locating ? 'Locating…' : '◎ Use my location'}</button>
                  {formHasPin && (
                    <>
                      <a className="btn-xs" href={googleMapsUrl(toNumOrNull(form.lat), toNumOrNull(form.lng))} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }} title="Open pin in Google Maps">🗺 Google Maps ↗</a>
                      <a className="btn-xs" href={osmUrl(toNumOrNull(form.lat), toNumOrNull(form.lng))} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }} title="Open pin in OpenStreetMap">OSM ↗</a>
                      <button
                        type="button"
                        className="btn-xs"
                        title="Copy coordinates"
                        onClick={() => {
                          const t = `${toNumOrNull(form.lat)}, ${toNumOrNull(form.lng)}`
                          try {
                            if (navigator.clipboard) navigator.clipboard.writeText(t)
                            else {
                              const ta = document.createElement('textarea')
                              ta.value = t
                              document.body.appendChild(ta)
                              ta.select()
                              document.execCommand('copy')
                              document.body.removeChild(ta)
                            }
                          } catch {}
                        }}
                      >
                        Copy
                      </button>
                    </>
                  )}
                  {(String(form.lat).trim() !== '' || String(form.lng).trim() !== '') && (
                    <button type="button" className="btn-xs" onClick={() => setForm(f => ({ ...f, lat: '', lng: '' }))} title="Remove the pin">Clear pin</button>
                  )}
                </div>
                {formHasPin ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
                      📌 {fmtCoords(toNumOrNull(form.lat), toNumOrNull(form.lng))} — delivery pin preview
                    </div>
                    <iframe
                      title="Pin preview"
                      src={osmEmbedUrl(toNumOrNull(form.lat), toNumOrNull(form.lng))}
                      style={{ width: '100%', height: 200, border: '1px solid var(--slate-200)', borderRadius: 10 }}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--slate-500)', marginTop: 6, lineHeight: 1.5 }}>
                    No pin yet — tap <b>📍 Pin on Map</b> and click the house, or stand at the house and tap <b>◎ Use my location</b>. Riders use this pin to navigate in Google Maps.
                  </div>
                )}
              </div>

              <div className="field">
                <label>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g., Deliver before 10am" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-save" onClick={saveForm}>{form.mode === 'add' ? 'Save Customer' : 'Update'}</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {form && showPicker && (
        <MapPicker
          initialLat={toNumOrNull(form.lat)}
          initialLng={toNumOrNull(form.lng)}
          onSave={setFormLatLng}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
