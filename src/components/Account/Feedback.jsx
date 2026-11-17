import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Copy, Coffee } from 'lucide-react'
import { BMAC_ENABLED, openBmacCheckout } from '../../lib/billing'
import { useAuth } from '../../context/AuthContext'

export default function Feedback() {
  const { secureUser, secureSession } = useAuth()
  const [category, setCategory] = useState('other')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [sent, setSent] = useState(false)
  const card = useRef(null)
  const request = useRef(null)
  useEffect(() => {
    function open(event) {
      card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      card.current?.focus({ preventScroll: true })
    }
    window.addEventListener('jobsensei:open-feedback', open)
    return () => window.removeEventListener('jobsensei:open-feedback', open)
  }, [])
  async function submit(event) {
    event.preventDefault()
    if (busy || sent || !secureSession?.access_token) return
    setBusy(true); setNotice('')
    const fields = { category, name, message, website }
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
      await navigator.clipboard.writeText(message)
      setNotice('Feedback copied.')
    } catch { setNotice('Copy is unavailable. Select and copy your message manually.') }
  }
  return <section ref={card} tabIndex={-1} className="card mt-6" aria-labelledby="feedback-heading">
    <h2 id="feedback-heading" className="font-display font-bold text-white flex items-center gap-2"><MessageSquare size={18} className="text-teal-400" /> Feedback & support</h2>
    <p className="text-slate-300 text-sm mt-2 mb-2">Report a bug or suggest an improvement.</p>
    {BMAC_ENABLED && <div className="my-4">
      <button type="button" className="btn-secondary" onClick={() => { try { openBmacCheckout() } catch (error) { setNotice(error.message) } }}><Coffee size={15} />Support on Buy Me a Coffee</button>
      <p className="text-slate-400 text-xs mt-2">Voluntary support. New Pro subscriptions will be available in Account once checkout is enabled.</p>
    </div>}
    {!secureUser ? <p className="text-slate-300 text-sm">Sign in to your JobSensei account to send feedback.</p> : <form onSubmit={submit} className="space-y-4" onChange={() => setSent(false)}>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-slate-300 text-sm">Category<select className="input-field w-full mt-1" value={category} onChange={e => setCategory(e.target.value)} disabled={busy}>
          <option value="other">General feedback</option><option value="bug">Bug report</option><option value="idea">Suggestion</option>
        </select></label>
        <label className="text-slate-300 text-sm">Name (optional)<input className="input-field w-full mt-1" value={name} onChange={e => setName(e.target.value)} maxLength={80} disabled={busy} autoComplete="name" /></label>
      </div>
      <p className="text-slate-300 text-sm">Replies will use your account email: <span className="font-semibold">{secureUser.email}</span></p>

      <label className="block text-slate-300 text-sm">What would you like to share?<textarea className="input-field w-full mt-1 min-h-[120px]" required minLength={10} maxLength={4000} value={message} onChange={e => setMessage(e.target.value)} disabled={busy} placeholder="A bug, confusing moment, or suggestion…" /></label>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
      <p className="text-slate-300 text-xs">Sending shares your message, optional name and account email with the developer through our email provider. No resume, conversation or diagnostic files are attached. Please omit sensitive information.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary" disabled={busy || sent || message.trim().length < 10}><Send size={15} />{busy ? 'Sending…' : sent ? 'Sent' : 'Send feedback'}</button><button type="button" className="btn-secondary" disabled={!message.trim()} onClick={copy}><Copy size={15} />Copy feedback</button></div>
      {notice && <p role="status" aria-live="polite" className="text-slate-300 text-sm">{notice}</p>}
    </form>}
  </section>
}
