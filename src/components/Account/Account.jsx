import React from 'react'
import Settings from '../Settings/Settings'
import Feedback from './Feedback'
import { useLanguage } from '../../context/LanguageContext'

export default function Account() {
  const { t } = useLanguage()
  return <><nav aria-label={t('nav.account')} className="account-jump-nav max-w-4xl md:max-w-5xl xl:max-w-[72rem] mx-auto px-4 md:px-6 pt-4">{[['plan','planNav'],['resume','resumeNav'],['devices','devicesNav'],['support','supportNav']].map(([target,key]) => <button key={target} onClick={() => document.getElementById(`account-${target}`)?.scrollIntoView({ behavior:'smooth', block:'start' })}>{t(`account.${key}`)}</button>)}</nav><Settings mode="account" /><div id="account-support" className="max-w-4xl md:max-w-5xl xl:max-w-[72rem] mx-auto px-4 md:px-6 pb-8"><Feedback /></div></>
}
