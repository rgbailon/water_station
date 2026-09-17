/**
 * useSupabaseSync — generic hook to sync a table with Supabase + localStorage fallback.
 * Keeps current behavior offline; when env is configured it loads from DB and
 * writes back on every change (optimistic, debounced).
 */
import { useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from './supabaseClient'

export function useSupabaseSync({
  key,              // localStorage key for fallback
  initialData,      // initial mock data fallback
  fetchFn,          // async () => data[]  (supabase)
  upsertFn,         // async (item) => void  — single item upsert
  deleteFn,         // async (id) => void
  serialize,        // optional: (data) => string for LS
  deserialize,      // optional: (raw) => data
}) {
  const [data, setData] = useState(() => {
    if (!isSupabaseConfigured()) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = deserialize ? deserialize(raw) : JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length) return parsed
        }
      } catch {}
      return initialData
    }
    return initialData
  })
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [error, setError] = useState(null)
  const didLoad = useRef(false)

  // initial fetch from supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false
    setLoading(true)
    fetchFn()
      .then(rows => {
        if (cancelled) return
        if (Array.isArray(rows) && rows.length) {
          setData(rows)
          try { localStorage.setItem(key, serialize ? serialize(rows) : JSON.stringify(rows)) } catch {}
        } else if (Array.isArray(rows) && rows.length === 0) {
          // seed if empty and we have initialData
          if (initialData?.length) {
            // optimistic: keep initialData, caller can seed explicitly
          }
        }
        didLoad.current = true
        setError(null)
      })
      .catch(err => {
        console.warn(`[sync:${key}] fetch failed, using local fallback`, err)
        setError(err?.message || String(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // persist fallback copy always (for offline)
  useEffect(() => {
    if (didLoad.current) {
      // we have synced at least once; keep LS mirror
      try { localStorage.setItem(key, serialize ? serialize(data) : JSON.stringify(data)) } catch {}
    } else if (!isSupabaseConfigured()) {
      try { localStorage.setItem(key, serialize ? serialize(data) : JSON.stringify(data)) } catch {}
    }
  }, [data, key, serialize])

  // helpers that also write to supabase (fire-and-forget with error toast via console)
  const upsert = async (item) => {
    setData(prev => {
      const idx = prev.findIndex(p => String(p.id ?? p.orderId ?? p.order_id) === String(item.id ?? item.orderId ?? item.order_id))
      if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, ...item } : p)
      return [...prev, item]
    })
    if (isSupabaseConfigured() && upsertFn) {
      try { await upsertFn(item) } catch (e) { console.warn(`[sync:${key}] upsert failed`, e) }
    }
  }

  const remove = async (id) => {
    setData(prev => prev.filter(p => String(p.id ?? p.orderId) !== String(id)))
    if (isSupabaseConfigured() && deleteFn) {
      try { await deleteFn(id) } catch (e) { console.warn(`[sync:${key}] delete failed`, e) }
    }
  }

  return { data, setData, loading, error, upsert, remove, isConfigured: isSupabaseConfigured() }
}
