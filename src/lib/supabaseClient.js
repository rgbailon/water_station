import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null
let warnOnce = false

function missingEnv() {
  return !url || !anon || String(anon).includes('REPLACE_WITH')
}

if (!missingEnv()) {
  client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: { headers: { 'x-application-name': 'irosin-water-inventory' } },
  })
} else if (!warnOnce) {
  warnOnce = true
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. ' +
      'App will run in offline (localStorage) mode. ' +
      'Set them in .env from Supabase Dashboard → Project Settings → API.',
  )
}

/**
 * Supabase client or null if env not configured.
 * Check with `isSupabaseConfigured()` before calling.
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = client

export function isSupabaseConfigured() {
  return !!client && !missingEnv()
}

export function getSupabaseConfig() {
  return { url, hasAnonKey: !!anon && !String(anon).includes('REPLACE_WITH'), configured: isSupabaseConfigured() }
}

// Direct Postgres pooler info (for docs / debugging - never expose password in logs)
export const PG_POOLER = {
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.ddzlawodgqziuoanudbb',
  // password intentionally not exported; read from process env on server
  projectRef: 'ddzlawodgqziuoanudbb',
  supabaseUrl: 'https://ddzlawodgqziuoanudbb.supabase.co',
}
