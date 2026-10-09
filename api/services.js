import feedback from './_feedback.js'
import research from './_research.js'
import discoverJobs from './_discover-jobs.js'
import billing from './_billing.js'

// These handlers are bundled into one function; public URLs are preserved by rewrites.
const handlers = new Map([
  ['feedback', feedback],
  ['research', research],
  ['discover-jobs', discoverJobs],
  ['billing', billing],
])

export default function handler(req, res) {
  const service = req.query?.service
  const target = typeof service === 'string' ? handlers.get(service) : null
  if (!target) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(404).json({ error: 'Unknown service' })
  }
  return target(req, res)
}
