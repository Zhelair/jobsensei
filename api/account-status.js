import {
  ACTIVE_PLAN_STATUSES,
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  ensureSecureAccountAccess,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

function toAccountSummary(account) {
  if (!account) return null

  return {
    email: account.email,
    planStatus: account.plan_status,
    planSource: account.plan_source,
    linkedAt: account.linked_at,
    linked: Boolean(account.linked_at),
    planActive: ACTIVE_PLAN_STATUSES.has(account.plan_status),
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

    const accessSync = await ensureSecureAccountAccess({
      supabase,
      user,
    })

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('email, plan_status, plan_source, linked_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (accountError) {
      console.error('account-status query failed:', accountError)
      return res.status(500).json({ error: 'Unable to load secure account status right now.' })
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email || '',
      },
      account: toAccountSummary(account),
      claimedGrantCount: accessSync.claimedGrantCount,
    })
  } catch (err) {
    console.error('account-status failed:', err)
    return res.status(500).json({ error: 'Unable to load secure account status right now.' })
  }
}
