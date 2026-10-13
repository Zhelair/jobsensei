// Read-only checks. Never prints keys, tokens, account rows or customer content.
const origin = process.argv[2] || 'https://jobsensei.app'
const html = await (await fetch(origin)).text()
const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match => new URL(match[1], origin))
let secretLikeMatches = 0
for (const url of scripts) {
  if (url.origin !== new URL(origin).origin) continue
  const source = await (await fetch(url)).text()
  secretLikeMatches += (source.match(/(?:sk-[A-Za-z0-9]{24,}|pdl_(?:live|sdbx)_apikey_[A-Za-z0-9_]+|sb_secret_[A-Za-z0-9_]+)/g) || []).length
  for (const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    try {
      if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role') secretLikeMatches++
    } catch { /* Ignore non-JWT matches. */ }
  }
}
console.log(JSON.stringify({ bundledScripts: scripts.length, secretLikeMatches }))
const statusResponse = await fetch(`${origin}/api/auth-status`)
const status = await statusResponse.json()
let publishedRole = null
try { publishedRole = JSON.parse(Buffer.from(status.supabase.anonKey.split('.')[1], 'base64url').toString()).role } catch {}
console.log(JSON.stringify({ authStatus: statusResponse.status, secureAccountsEnabled: status.secureAccountsEnabled, customAuthEmailsEnabled: status.customAuthEmailsEnabled, publishedSupabaseKeyRole: publishedRole }))
if (status.supabase?.url && status.supabase?.anonKey) {
  for (const table of ['accounts','device_registrations','plan_grants','billing_checkouts','billing_subscriptions','billing_events','billing_refunded_transactions','hosted_credit_events','secure_audit_events','service_requests']) {
    const response = await fetch(`${status.supabase.url}/rest/v1/${table}?select=*&limit=0`, {
      method: 'HEAD', headers: { apikey: status.supabase.anonKey, Authorization: `Bearer ${status.supabase.anonKey}`, Prefer: 'count=exact' },
    })
    console.log(JSON.stringify({ anonymousTableProbe: table, status: response.status, contentRange: response.headers.get('content-range') }))
  }
}
