#!/usr/bin/env node
// Test Supabase Postgres pooler connection via `pg`.
// Usage: node supabase/test-connection.mjs
// Reads .env DATABASE_URL (or uses inline fallback).
import pg from 'pg'
import dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'

if (existsSync('.env')) dotenv.config()
else if (existsSync('.env.local')) dotenv.config({ path: '.env.local' })

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres.ddzlawodgqziuoanudbb:%40waterstationRogel89@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

// Also support individual PG* vars
const cfg = process.env.PGHOST
  ? {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 6543),
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres.ddzlawodgqziuoanudbb',
      password: process.env.PGPASSWORD || '@waterstationRogel89',
      ssl: { rejectUnauthorized: false },
    }
  : { connectionString: url, ssl: { rejectUnauthorized: false } }

console.log('→ Testing Postgres pooler connection...')
console.log(`  host=${cfg.host || '(from DATABASE_URL)'} port=${cfg.port || 6543} db=${cfg.database || 'postgres'} user=${cfg.user || '...'} `)

const client = new pg.Client(cfg)
try {
  await client.connect()
  console.log('✔ Connected')
  const r = await client.query('select now() as now, version() as ver')
  console.log('  now():', r.rows[0].now)
  console.log('  version:', r.rows[0].ver.slice(0, 80) + '…')

  // Check if schema exists
  try {
    const t = await client.query(`select count(*)::int as c from information_schema.tables where table_schema='public' and table_name='products'`)
    console.log(`  public.products table exists? ${t.rows[0].c ? 'YES' : 'NO — run supabase/schema.sql first'}`)
    if (t.rows[0].c) {
      const counts = await client.query(`
        select 'products' as tbl, count(*)::int as c from public.products union all
        select 'inventory_items', count(*) from public.inventory_items union all
        select 'events', count(*) from public.events union all
        select 'hiram_records', count(*) from public.hiram_records union all
        select 'expenses', count(*) from public.expenses union all
        select 'orders', count(*) from public.orders
      `)
      console.log('  Row counts:')
      counts.rows.forEach(r => console.log(`    ${r.tbl}: ${r.c}`))
    }
  } catch (e) {
    console.log('  (could not check tables)', e.message)
  }
  console.log('\n✔ Test complete. If tables missing, run: npm run db:push  or  psql "<DATABASE_URL>" -f supabase/schema.sql')
} catch (e) {
  console.error('✘ Connection failed:', e.message)
  console.error(e)
  process.exitCode = 1
} finally {
  try { await client.end() } catch {}
}
