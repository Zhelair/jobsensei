import React, { useState } from 'react'
import { ArrowRight, Check, Mic, Search, Target } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const PREVIEWS = ['workspace', 'research', 'interview', 'learning', 'offers']
export default function HomeLayout({ onStart, onExplore, onPro, onByok, children, legalLinks }) {
  const { t } = useLanguage()
  const [preview, setPreview] = useState('workspace')
  function movePreview(event) {
    const index = PREVIEWS.indexOf(preview)
    const next = event.key === 'ArrowRight' ? (index + 1) % PREVIEWS.length : event.key === 'ArrowLeft' ? (index + PREVIEWS.length - 1) % PREVIEWS.length : event.key === 'Home' ? 0 : event.key === 'End' ? PREVIEWS.length - 1 : null
    if (next === null) return
    event.preventDefault()
    setPreview(PREVIEWS[next])
    document.getElementById(`home-tab-${PREVIEWS[next]}`)?.focus()
  }
  return <div className="home-page">
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="home-eyebrow">{t('home.eyebrow')}</p>
        <h1>{t('home.confident')}<br /><span>{t('home.hired')}</span></h1>
        <h2>{t('home.subtitle')}</h2>
        <p className="home-description">{t('home.description')}</p>
        <div className="flex flex-wrap gap-3 mt-6"><button className="btn-primary" onClick={onStart}>{t('onboarding.freeCta')} <ArrowRight size={16} /></button><a className="btn-secondary" href="#product-demo" onClick={e => { e.preventDefault(); document.getElementById('product-demo')?.scrollIntoView({ behavior: 'smooth' }) }}>{t('home.seeHow')}</a></div>
        <button className="home-text-link mt-4" onClick={onExplore}>{t('welcome.exploreWorkspace')} <ArrowRight size={14} /></button>
      </div>
      <figure className="home-product-frame"><div className="home-window-label"><span className="home-window-dot" /> JobSensei <span>{t('home.oneWorkspace')}</span></div><img className="home-desktop-preview" src="/product-previews/workspace.png" width="1040" height="620" alt={t('welcome.chapter.roles.title')} /><div className="home-mobile-preview"><p className="home-eyebrow">{t('applications.workspace.overview.title')}</p><h3>Fraud Analyst</h3><p>Example Payments · {t('home.sample')}</p><div className="home-preview-steps">{['capture','research','tailor','predict','mock','followup'].map((key,index) => <div key={key}><span>{index < 4 ? <Check size={14}/> : index + 1}</span>{t(`today.steps.${key}.title`)}</div>)}</div></div><figcaption className="home-desktop-caption">{t('welcome.sampleCaption')}</figcaption><figcaption className="home-mobile-caption">{t('home.sampleCaption')}</figcaption></figure>
    </section>
    <section className="home-steps" aria-label={t('home.workflow')}>
      {[['focus', Search], ['evidence', Target], ['practice', Mic]].map(([key, Icon], index) => <div key={key}><span className="home-step-number">{index + 1}</span><Icon size={20} /><h3>{t(`home.steps.${key}.title`)}</h3><p>{t(`home.steps.${key}.copy`)}</p></div>)}
    </section>
    <section id="product-demo" className="home-section">
      <p className="home-eyebrow">{t('home.oneWorkspace')}</p><h2>{t('home.demoTitle')}</h2><p>{t('home.demoCopy')}</p>
      <div className="home-demo-tabs" role="tablist" aria-label={t('welcome.screenTour')}>{PREVIEWS.map(key => <button key={key} role="tab" tabIndex={preview === key ? 0 : -1} onKeyDown={movePreview} aria-selected={preview === key} aria-controls="home-demo-panel" id={`home-tab-${key}`} onClick={() => setPreview(key)}>{t(`home.preview.${key}`)}</button>)}</div>
      <figure id="home-demo-panel" role="tabpanel" aria-labelledby={`home-tab-${preview}`} className="home-demo-frame"><img src={`/product-previews/${preview}.png`} loading="lazy" width="1040" height="620" alt={t(`home.preview.${preview}`)} /><figcaption>{t('welcome.sampleCaption')}</figcaption></figure>
    </section>
    <section className="home-section" aria-label={t('settings.pricingLink')}>
      <h2>{t('home.pricingTitle')}</h2><p>{t('home.pricingCopy')}</p>
      <div className="home-pricing">{[{name:'Free',price:'€0',credits:'465',requests:'15',action:onStart,cta:t('onboarding.freeCta')},{name:'Pro',price:'€8',credits:'25,110',requests:'810',action:onPro,cta:t('onboarding.proCta')}].map(plan => <div key={plan.name} className={`home-plan ${plan.name === 'Pro' ? 'home-plan-pro' : ''}`}><h3>{plan.name}</h3><div className="home-price">{plan.price}<span>{t('onboarding.perMonth')}</span></div><ul><li><Check size={16} />{t('home.credits', { count: plan.credits })}</li><li><Check size={16} />{t('home.requests', { count: plan.requests })}</li></ul><button className={plan.name === 'Pro' ? 'btn-primary' : 'btn-secondary'} onClick={plan.action}>{plan.cta} <ArrowRight size={16} /></button></div>)}</div>
      <p className="home-pricing-note">{t('home.taxNote')}</p><button className="home-text-link" onClick={onByok}>{t('welcome.ctaByok')} <ArrowRight size={14} /></button>
    </section>
    <section className="home-section home-access" id="home-access">{children}</section>
    <section className="home-section home-faq"><h2>{t('home.faqTitle')}</h2>{['local','ai','cancel'].map(key => <details key={key}><summary>{t(`home.faq.${key}.question`)}</summary><p>{t(`home.faq.${key}.answer`)}</p></details>)}</section>
    <footer className="home-footer"><p>{t('welcome.localPrivacy')}</p><div>{legalLinks.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</div></footer>
  </div>
}
