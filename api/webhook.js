// Placeholder — BMAC webhook handler (for future webhook-based verification)
// Currently not used. Access code verification is handled by /api/verify-member.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  return res.status(200).json({ ok: true })
}
