// Run with an isolated PGlite installation path as argv[2]. No production access.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql as 'select null::uuid';`)
for (const file of ['secure-auth-bridge.sql', 'secure-hosted-credits.sql', 'account-billing-hardening.sql']) {
  const sql = (await readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8'))
    .replaceAll('create extension if not exists pgcrypto;', '')
  await db.exec(sql)
}
const user = '11111111-1111-4111-8111-111111111111'
const checkout = '22222222-2222-4222-8222-222222222222'
await db.exec(`insert into auth.users values('${user}');
  insert into accounts(user_id,email,plan_tier,plan_status) values('${user}','fixture@example.invalid','free','active');
  insert into billing_checkouts(id,user_id,transaction_id) values('${checkout}','${user}','txn_fixture');`)
const now = new Date()
const start = now.toISOString()
const end = new Date(+now + 31 * 86400000).toISOString()
const subscription = { id: 'sub_fixture', customer_id: 'ctm_fixture', status: 'active', custom_data: { jobsensei_checkout_id: checkout }, scheduled_change: null }
const transaction = { id: 'txn_fixture', billing_period: { starts_at: start, ends_at: end } }
async function event(id, sub = subscription, txn = null, at = start) {
  return db.query('select apply_paddle_billing_event($1,$2,$3,$4) as result', [id, at, sub, txn])
}
async function account() { return (await db.query('select * from accounts')).rows[0] }
await event('evt_paid', subscription, transaction)
assert.equal((await account()).plan_tier, 'pro')
assert.equal((await account()).credit_balance, 25110)
await db.query('update accounts set credit_balance=25079 where user_id=$1', [user])
await event('evt_paid', subscription, transaction)
assert.equal((await account()).credit_balance, 25079, 'duplicate payment must not refill')
await event('evt_updated')
assert.equal((await account()).credit_balance, 25079, 'ordinary update must not refill')
await event('evt_cancel_scheduled', { ...subscription, scheduled_change: { action: 'cancel', effective_at: end } })
assert.equal((await account()).plan_tier, 'pro', 'scheduled cancellation keeps paid access')
assert.equal((await account()).credit_balance, 25079)
await event('evt_old_paid', subscription, { ...transaction, billing_period: { starts_at: new Date(+now-62*86400000).toISOString(), ends_at: new Date(+now-31*86400000).toISOString() } }, new Date(+now-31*86400000).toISOString())
assert.equal((await account()).credit_balance, 25079, 'old payment must not refill')
const nextEnd = new Date(+now + 62 * 86400000).toISOString()
await event('evt_renewal', subscription, { id: 'txn_renewal', billing_period: { starts_at: end, ends_at: nextEnd } })
assert.equal((await account()).credit_balance, 25110, 'a new paid period grants one allowance')
await db.query('update accounts set credit_balance=25079 where user_id=$1', [user])
await event('evt_renewal_retry_different_event', subscription, { id: 'txn_renewal', billing_period: { starts_at: end, ends_at: nextEnd } })
assert.equal((await account()).credit_balance, 25079, 'the same paid period cannot grant twice under different event IDs')
await event('evt_canceled', { ...subscription, status: 'canceled' })
assert.equal((await account()).plan_tier, 'free')
assert.equal((await account()).credit_balance, 465)
await db.query('update accounts set deletion_requested_at=now() where user_id=$1', [user])
await event('evt_after_delete', subscription, { ...transaction, billing_period: { starts_at: end, ends_at: new Date(+now+62*86400000).toISOString() } })
assert.equal((await account()).plan_tier, 'free', 'deletion blocks late payment grants')
assert.equal((await db.query("select has_table_privilege('authenticated','public.accounts','UPDATE') as allowed")).rows[0].allowed, false)
assert.equal((await db.query("select has_function_privilege('authenticated','apply_paddle_billing_event(text,timestamptz,jsonb,jsonb)','EXECUTE') as allowed")).rows[0].allowed, false)
const user2 = '33333333-3333-4333-8333-333333333333'
await db.exec(`insert into auth.users values('${user2}'); insert into accounts(user_id,email,plan_tier,plan_status) values('${user2}','second@example.invalid','free','active');`)
const reserve = await db.query('select reserve_billing_checkout($1,$2) as result', [user2,'44444444-4444-4444-8444-444444444444'])
assert.equal(reserve.rows[0].result.status,'reserved')
assert.equal((await db.query('select reserve_billing_checkout($1,$2) as result', [user2,'55555555-5555-4555-8555-555555555555'])).rows[0].result.status,'busy')
await db.exec("update billing_checkouts set transaction_id='txn_second' where user_id='33333333-3333-4333-8333-333333333333'")
assert.equal((await db.query('select reserve_billing_checkout($1,$2) as result', [user2,'55555555-5555-4555-8555-555555555555'])).rows[0].result.status,'reused')
for(let index=0;index<20;index++) {
  const requestId = `66666666-6666-4666-8666-${String(index).padStart(12,'0')}`
  const result = await db.query('select reserve_discovery_search($1,$2,$3) as result',[user2,`query${index}`,requestId])
  assert.equal(result.rows[0].result.status,'reserved')
}
assert.equal((await db.query('select reserve_discovery_search($1,$2,$3) as result',[user2,'blocked','77777777-7777-4777-8777-777777777777'])).rows[0].result.status,'limited')
await db.close()
console.log('PASS: SQL migrations, paid grant, duplicates, ordinary updates, scheduled cancellation, stale payment, cancellation, deletion and permissions.')
