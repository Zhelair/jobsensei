import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Copy } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Feedback() {
  const { secureUser, secureSession } = useAuth()
  const [category, setCategory] = useState('other')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [sent, setSent] = useState(false)
  const card = useRef(null)
  const request = useRef(null)
  useEffect(() => {
    function open(event) {
      if (event.detail?.category === 'source') {
        setCategory('source')
        setSourceUrl(event.detail?.url || '')
      }
      card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    window.addEventListener('jobsensei:open-feedback', open)
    const pending = sessionStorage.getItem('js_feedback_source')
    if (pending) { sessionStorage.removeItem('js_feedback_source'); open({ detail: { category: 'source', url: pending === 'request' ? '' : pending } }) }
    return () => window.removeEventListener('jobsensei:open-feedback', open)
  }, [])
  async function submit(event) {
    event.preventDefault()
    if (busy || sent || !secureSession?.access_token) return
    setBusy(true); setNotice('')
    const fields = { category, name, message, sourceUrl: category === 'source' ? sourceUrl : '', country: category === 'source' ? country : '', website }
    const signature = JSON.stringify(fields)
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() }
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secureSession.access_token}` },
        body: JSON.stringify({ ...fields, requestId: request.current.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to send feedback')
      setSent(true); setNotice('Thank you—your feedback was sent.')
    } catch (error) { setNotice(error.message || 'Unable to send feedback. You can copy your message below.') }
    finally { setBusy(false) }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${category === 'source' ? `Source request: ${sourceUrl}\nCountry: ${country}\n\n` : ''}${message}`)
      setNotice('Feedback copied.')
    } catch { setNotice('Copy is unavailable. Select and copy your message manually.') }
  }
  return <section ref={card} className="card mt-6" aria-labelledby="feedback-heading">
    <h2 id="feedback-heading" className="font-display font-bold text-white flex items-center gap-2"><MessageSquare size={18} className="text-teal-400" /> Feedback & support</h2>
    <p className="text-slate-300 text-sm mt-2 mb-2">Report a bug, suggest an improvement, or request a job source.</p>
    {secureUser && <button type="button" className="btn-ghost text-xs mb-3" onClick={() => { setCategory('source'); setSent(false) }}>Missing your job board? Request a source.</button>}
    {!secureUser ? <p className="text-slate-300 text-sm">Sign in to your JobSensei account to send feedback.</p> : <form onSubmit={submit} className="space-y-4" onChange={() => setSent(false)}>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-slate-300 text-sm">Category<select className="input-field w-full mt-1" value={category} onChange={e => setCategory(e.target.value)} disabled={busy}>
          <option value="other">General feedback</option><option value="bug">Bug report</option><option value="idea">Suggestion</option><option value="source">Request a job source</option>
        </select></label>
        <label className="text-slate-300 text-sm">Name (optional)<input className="input-field w-full mt-1" value={name} onChange={e => setName(e.target.value)} maxLength={80} disabled={busy} autoComplete="name" /></label>
      </div>
      <p className="text-slate-300 text-sm">Replies will use your account email: <span className="font-semibold">{secureUser.email}</span></p>
      {category === 'source' && <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-slate-300 text-sm">Website URL<input type="url" required className="input-field w-full mt-1" placeholder="https://www.jobs.bg" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} maxLength={500} disabled={busy} /></label>
        <label className="text-slate-300 text-sm">Country (optional)<input className="input-field w-full mt-1" value={country} onChange={e => setCountry(e.target.value)} maxLength={80} disabled={busy} /></label>
      </div>}
      <label className="block text-slate-300 text-sm">What would you like to share?<textarea className="input-field w-full mt-1 min-h-[120px]" required minLength={10} maxLength={4000} value={message} onChange={e => setMessage(e.target.value)} disabled={busy} placeholder="A bug, confusing moment, suggestion, or requested job website…" /></label>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
      <p className="text-slate-300 text-xs">Sending shares your message, optional name and account email with the developer through our email provider. No resume, conversation or diagnostic files are attached. Please omit sensitive information.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary" disabled={busy || sent || message.trim().length < 10}><Send size={15} />{busy ? 'Sending…' : sent ? 'Sent' : 'Send feedback'}</button><button type="button" className="btn-secondary" disabled={!message.trim()} onClick={copy}><Copy size={15} />Copy feedback</button></div>
      {notice && <p role="status" aria-live="polite" className="text-slate-300 text-sm">{notice}</p>}
    </form>}
  </section>
}
