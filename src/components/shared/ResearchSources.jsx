import React from 'react'
import { researchNotice } from '../../lib/research'

export default function ResearchSources({ metadata }) {
  if (!metadata) return null
  const sources = (Array.isArray(metadata.sources) ? metadata.sources : []).filter(source => {
    try { return ['https:', 'http:'].includes(new URL(source.url).protocol) } catch { return false }
  })
  return <div className="text-slate-300 text-xs my-3">
    {metadata.fallback ? <p role="status">{researchNotice(metadata.reason)}</p> : <>
      <p>Web-assisted AI research{metadata.checkedAt ? ` · Checked ${new Date(metadata.checkedAt).toLocaleDateString()}` : ''}. Sources support the web context; verify important claims.</p>
      {sources.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold">Sources ({sources.length})</summary><ul className="mt-2 space-y-2">{sources.map((source, i) => <li key={`${source.url}-${i}`}><a className="text-teal-400 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title || new URL(source.url).hostname}</a></li>)}</ul></details>}
    </>}
  </div>
}
