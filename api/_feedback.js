import { authenticateSupabaseUser, canSendCustomAuthEmails, sendTransactionalEmail } from './_lib/authBridge.js'
import { reserveServiceRequest, finishServiceRequest } from './_lib/serviceRequests.js'

const categories = { bug: 'Bug report', idea: 'Suggestion', other: 'Feedback' }
const escape = value => value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = req.body
  if (!body || typeof body !== 'object' || Buffer.byteLength(JSON.stringify(body)) > 12000) return res.status(400).json({ error: 'Invalid feedback' })
  if (body.website) return res.status(400).json({ error: 'Unable to submit feedback' })
  const { category, requestId } = body
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!Object.hasOwn(categories, category) || !uuid.test(requestId || '') || message.length < 10 || message.length > 4000 || name.length > 80) return res.status(400).json({ error: 'Check the feedback fields and message length' })
  const { user } = await authenticateSupabaseUser(req)
  if (!user?.email) return res.status(401).json({ error: 'Sign in to send feedback' })
  if (!process.env.FEEDBACK_TO_EMAIL || !canSendCustomAuthEmails()) return res.status(503).json({ error: 'Feedback delivery is not configured yet' })
  let reserved = false
  try {
    const gate = await reserveServiceRequest(req, user, 'feedback', requestId, JSON.stringify({ category,name,message }))
    if (gate === 'sent' || gate === 'duplicate') return res.status(200).json({ sent: true, duplicate: true })
    if (gate !== 'reserved') return res.status(gate === 'conflict' ? 409 : 429).json({ error: 'Please wait before sending again' })
    reserved = true
    const text = `Category: ${categories[category]}\nName: ${name || '(not supplied)'}\nReply email: ${user.email}\n\n${message}`
    await sendTransactionalEmail({
      to: process.env.FEEDBACK_TO_EMAIL,
      subject: `[JobSensei][${categories[category]}]`,
      text, html: `<pre style="white-space:pre-wrap">${escape(text)}</pre>`,
      replyTo: user.email, idempotencyKey: `feedback/${requestId}`,
    })
    await finishServiceRequest(requestId, 'sent')
    return res.status(200).json({ sent: true })
  } catch {
    if (reserved) await finishServiceRequest(requestId, 'failed').catch(() => {})
    return res.status(503).json({ error: 'Feedback could not be delivered. Your message is still available to copy.' })
  }
}
