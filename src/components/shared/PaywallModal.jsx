import React, { useState } from 'react'
import { useAI } from '../../context/AIContext'
import { Coffee, X, Check, ExternalLink } from 'lucide-react'

const BMAC_URL = 'https://buymeacoffee.com/niksales73l'

export default function PaywallModal() {
  const { showPaywall, closePaywall, verifyBmac } = useAI()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!showPaywall) return null

  async function handleVerify() {
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      await verifyBmac(email.trim())
      setDone(true)
      setTimeout(() => { closePaywall(); setDone(false); setEmail('') }, 1500)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
      <div className="relative w-full max-w-sm bg-navy-800 border border-white/10 rounded-2xl shadow-2xl p-6">
        {/* Close */}
        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border border-yellow-500/20 flex items-center justify-center mb-3">
            <Coffee size={28} className="text-yellow-400" />
          </div>
          <h2 className="font-display font-bold text-white text-xl mb-1">Unlock AI Features</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Support JobSensei and get instant access to all AI-powered features — no API key needed.
          </p>
        </div>

        {/* Primary CTA */}
        <a
          href={BMAC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full justify-center mb-4 bg-yellow-500 hover:bg-yellow-400 text-black border-0"
        >
          <Coffee size={16} />
          Support on Buy Me a Coffee
          <ExternalLink size={13} className="opacity-60" />
        </a>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-500 text-xs">Already a supporter?</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Verify existing membership */}
        {done ? (
          <div className="flex items-center justify-center gap-2 text-green-400 py-2">
            <Check size={16} /> Access activated!
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="input-field text-sm w-full"
              type="email"
              placeholder="Your Buy Me a Coffee email..."
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
            <button
              onClick={handleVerify}
              disabled={!email.trim() || loading}
              className="btn-secondary w-full justify-center"
            >
              <Coffee size={14} />
              {loading ? 'Verifying...' : 'Verify Membership'}
            </button>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          </div>
        )}

        {/* Fallback link to Settings */}
        <p className="text-slate-600 text-xs text-center mt-4">
          Have your own API key?{' '}
          <button
            onClick={closePaywall}
            className="text-teal-400 hover:underline"
            // Settings is always accessible — user can navigate there after closing
          >
            Add it in Settings
          </button>
        </p>
      </div>
    </div>
  )
}
