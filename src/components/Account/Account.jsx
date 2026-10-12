import React from 'react'
import Settings from '../Settings/Settings'
import Feedback from './Feedback'
import { useLanguage } from '../../context/LanguageContext'

export default function Account() {
  const { t } = useLanguage()
  return <div className="account-page">
    <header className="account-heading px-4 md:px-6 pt-6"><h2 className="section-title">{t('account.title')}</h2><p className="section-sub">{t('account.subtitle')}</p></header>
    <nav aria-label={t('nav.account')} className="account-jump-nav w-full px-4 md:px-6 pt-4">
      {[['plan','planNav'],['resume','resumeNav'],['devices','devicesNav'],['support','supportNav']].map(([target,key]) => <button key={target} onClick={() => document.getElementById(`account-${target}`)?.scrollIntoView({ behavior:'smooth', block:'start' })}>{t(`account.${key}`)}</button>)}
    </nav>
    <Settings mode="account" />
    <div id="account-support" className="w-full px-4 md:px-6 pb-8"><Feedback /></div>
  </div>
}
