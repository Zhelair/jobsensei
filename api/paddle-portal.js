import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  getPaddleWebhookConfig,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  const { apiKey, apiBaseUrl } = getPaddleWebhookConfig()
  if (!apiKey || !apiBaseUrl) {
    return res.status(503).json({ error: 'Paddle billing is not configured on this deployment yet.' })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('billing_subscriptions').select('customer_id')
      .eq('user_id', user.id).order('last_event_at', { ascending: false }).limit(1)
    if (subscriptionError) throw subscriptionError
    const customerId = subscriptions?.[0]?.customer_id || ''
    if (!customerId) {
      return res.status(404).json({ error: 'No Paddle subscription was found for this JobSensei account.' })
    }

    const response = await fetch(`${apiBaseUrl}/customers/${customerId}/portal-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error('paddle-portal create failed:', payload)
      return res.status(502).json({ error: 'Unable to open Paddle billing right now.' })
    }

    const url = payload?.data?.urls?.general?.overview || ''
    if (!url) {
      console.error('paddle-portal missing overview url:', payload)
      return res.status(502).json({ error: 'Paddle did not return a billing portal link.' })
    }

    return res.status(200).json({ url })
  } catch (err) {
    console.error('paddle-portal failed:', err)
    return res.status(500).json({ error: 'Unable to open Paddle billing right now.' })
  }
}
