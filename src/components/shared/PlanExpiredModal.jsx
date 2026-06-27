import React from 'react'
import { CreditCard, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { SECTIONS, useApp } from '../../context/AppContext'
import { openProCheckout } from '../../lib/billing'

function formatNoticeDate(value) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

export default function PlanExpiredModal() {
  const { planExpiredNotice, dismissPlanExpiredNotice, secureUser } = useAuth()
  const { t } = useLanguage()
  const { setActiveSection } = useApp()

  if (!planExpiredNotice) return null

  const expiredDate = formatNoticeDate(planExpiredNotice.previousExpiresAt)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
      <div className="relative w-full max-w-md bg-navy-800 border border-white/10 rounded-2xl shadow-2xl p-6">
        <button
          onClick={dismissPlanExpiredNotice}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border border-yellow-500/20 flex items-center justify-center mb-3">
            <CreditCard size={28} className="text-yellow-400" />
          </div>
          <h2 className="font-display font-bold text-white text-xl mb-1">{t('planExpiredModal.title')}</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {t('planExpiredModal.copy', {
              date: expiredDate || t('planExpiredModal.dateFallback'),
            })}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100 leading-relaxed mb-4">
          {t('planExpiredModal.note')}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              openProCheckout({
                email: secureUser?.email || planExpiredNotice?.email || '',
              }).catch(() => {})
            }}
            className="btn-primary flex-1 justify-center bg-yellow-500 hover:bg-yellow-400 text-black border-0"
          >
            <CreditCard size={15} />
            {t('planExpiredModal.renew')}
          </button>
          <button
            onClick={() => {
              dismissPlanExpiredNotice()
              setActiveSection(SECTIONS.ACCOUNT)
            }}
            className="btn-secondary flex-1 justify-center"
          >
            {t('planExpiredModal.stayFree')}
          </button>
        </div>
      </div>
    </div>
  )
}
