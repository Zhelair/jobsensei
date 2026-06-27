import React, { useState } from 'react'
import { useAI } from '../../context/AIContext'
import { SECTIONS, useApp } from '../../context/AppContext'
import { useLanguage } from '../../context/LanguageContext'
import { CreditCard, X, Check, ExternalLink } from 'lucide-react'
import { openProCheckout } from '../../lib/billing'

export default function PaywallModal() {
  const { showPaywall, closePaywall, unlockAccess } = useAI()
  const { setActiveSection } = useApp()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState('')

  if (!showPaywall) return null

  async function handleVerify() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await unlockAccess(email.trim())
      if (result?.mode === 'magic_link') {
        closePaywall()
        setEmail('')
        return
      } else {
        setDone(true)
        setTimeout(() => {
          closePaywall()
          setDone(false)
          setEmail('')
        }, 1500)
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function handleCheckout() {
    try {
      await openProCheckout({
        email: email.trim(),
      })
    } catch (e) {
      setError(e.message || 'Unable to open Paddle checkout right now.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
      <div className="relative w-full max-w-sm bg-navy-800 border border-white/10 rounded-2xl shadow-2xl p-6">
        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border border-yellow-500/20 flex items-center justify-center mb-3">
            <CreditCard size={28} className="text-yellow-400" />
          </div>
          <h2 className="font-display font-bold text-white text-xl mb-1">{t('paywall.title')}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{t('paywall.copy')}</p>
        </div>

        <button
          onClick={handleCheckout}
          className="btn-primary w-full justify-center mb-4 bg-yellow-500 hover:bg-yellow-400 text-black border-0"
        >
          <CreditCard size={16} />
          {t('paywall.cta')}
          <ExternalLink size={13} className="opacity-60" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-500 text-xs">{t('paywall.alreadySupporter')}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-green-400 py-2">
            <Check size={16} /> {t('paywall.activated')}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="input-field text-sm w-full"
              type="email"
              placeholder={t('paywall.codePlaceholder')}
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); setNotice('') }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
            <p className="text-slate-600 text-xs">{t('paywall.codeHint')}</p>
            <button
              onClick={handleVerify}
              disabled={!email.trim() || loading}
              className="btn-secondary w-full justify-center"
            >
              <CreditCard size={14} />
              {loading ? t('paywall.verifying') : t('paywall.activate')}
            </button>
            {notice && <p className="text-green-400 text-xs text-center">{notice}</p>}
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          </div>
        )}

        <p className="text-slate-600 text-xs text-center mt-4">
          {t('paywall.byokPrefix')}{' '}
          <button
            onClick={() => {
              closePaywall()
              setActiveSection(SECTIONS.SETTINGS)
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('jobsensei:open-byok-settings'))
              }, 80)
            }}
            className="text-teal-400 hover:underline"
          >
            {t('paywall.byokLink')}
          </button>
        </p>
      </div>
    </div>
  )
}
