import {
  ACTIVE_PLAN_STATUSES,
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  ensureSecureAccountAccess,
  ensureSecureDeviceAccess,
  readSecureDeviceContext,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

function toAccountSummary(account, deviceAccess, accessSync = {}) {
  if (!account) return null

  return {
    email: account.email,
    planStatus: account.plan_status,
    planSource: account.plan_source,
    planTier: account.plan_tier,
    linkedAt: account.linked_at,
    linked: Boolean(account.linked_at),
    planActive: ACTIVE_PLAN_STATUSES.has(account.plan_status),
    planExpiresAt: account.plan_expires_at || accessSync.planExpiresAt || null,
    creditBalance: Number.isFinite(Number(account.credit_balance)) ? Math.max(0, Number(account.credit_balance)) : null,
    creditsRemaining: Number.isFinite(Number(account.credit_balance)) ? Math.max(0, Number(account.credit_balance)) : null,
    creditsResetAt: account.credit_period_ends_at || null,
    creditPeriodEndsAt: account.credit_period_ends_at || null,
    creditPeriodStartedAt: account.credit_period_started_at || null,
    devices: deviceAccess?.devices || [],
    approvedDeviceCount: deviceAccess?.approvedCount || 0,
    deviceLimit: deviceAccess?.deviceLimit || 0,
    currentDevice: deviceAccess?.currentDevice || null,
    currentDeviceApproved: Boolean(deviceAccess?.currentDeviceApproved),
    currentDeviceMissing: Boolean(deviceAccess?.currentDeviceMissing),
    deviceBlockedReason: deviceAccess?.blockedReason || null,
    replacementCooldownUntil: deviceAccess?.replacementCooldownUntil || null,
  }
}

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  try {
    const supabase = createSupabaseAdminClient()
    const deviceContext = readSecureDeviceContext(req)

    const accessSync = await ensureSecureAccountAccess({
      supabase,
      user,
    })

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('email, plan_status, plan_source, plan_tier, plan_expires_at, linked_at, credit_balance, credit_period_started_at, credit_period_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (accountError) {
      console.error('account-status query failed:', accountError)
      return res.status(500).json({ error: 'Unable to load secure account status right now.' })
    }

    const deviceAccess = await ensureSecureDeviceAccess({
      supabase,
      user,
      ...deviceContext,
      autoApprove: ACTIVE_PLAN_STATUSES.has(account?.plan_status),
    })

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email || '',
      },
      account: toAccountSummary(account, deviceAccess, accessSync),
      claimedGrantCount: accessSync.claimedGrantCount,
    })
  } catch (err) {
    console.error('account-status failed:', err)
    return res.status(500).json({ error: 'Unable to load secure account status right now.' })
  }
}
