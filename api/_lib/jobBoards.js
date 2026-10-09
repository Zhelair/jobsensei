// Only fixed official API hosts are fetched; result URLs never become arbitrary
// server-side fetch targets. Employer APIs verify availability, not role fit.
export async function verifyBoardListing(job) {
  const url = new URL(job.url)
  const parts = url.pathname.split('/').filter(Boolean)
  let endpoint
  if (url.hostname === 'jobs.lever.co' && parts.length === 2) {
    endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}?mode=json`
  } else if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname) && parts[1] === 'jobs' && /^\d+$/.test(parts[2] || '')) {
    endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(parts[0])}/jobs/${parts[2]}`
  }
  if (!endpoint) return job
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) })
    if ([404, 410].includes(response.status)) return null
    if (!response.ok) return job
    const data = await response.json()
    if (!data.id || !(data.text || data.title)) return job
    return { ...job, availability: 'open', availabilityCheckedAt: new Date().toISOString(),
      title: String(data.text || data.title).slice(0, 300),
      ...(Number.isFinite(data.createdAt) ? { postedAt: new Date(data.createdAt).toISOString() } : {}),
    }
  } catch { return job }
}
