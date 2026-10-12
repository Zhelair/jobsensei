import React from 'react'
import { ArrowLeft, MoreHorizontal, Wand2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useVisuals } from '../../context/VisualsContext'

export default function SessionHeader({ title, context, onBack, children }) {
  const { t } = useLanguage()
  const { enabled, setEnabled, triggerConfetti } = useVisuals()
  return <div className="mobile-session-header">
    <div className="session-title-row">
      <button onClick={onBack} className="session-icon" aria-label={t('chat.back')}><ArrowLeft size={20} /></button>
      <div className="min-w-0 flex-1"><h2 className="font-display font-semibold truncate">{title}</h2><p className="text-xs text-slate-400 truncate">{context}</p></div>
      <details className="session-options"><summary className="session-icon" aria-label={t('chat.more')}><MoreHorizontal size={20} /></summary><div className="session-options-panel">{children}<button className="btn-ghost" title={enabled ? t('topbar.visualsOnTitle') : t('topbar.visualsOffTitle')} onClick={() => { setEnabled(!enabled); if (!enabled) triggerConfetti(70) }}><Wand2 size={16} />{t('topbar.visualsMenu')}: {enabled ? t('common.on') : t('common.off')}</button></div></details>
    </div>
  </div>
}
