import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const chapters = [
  ['experience', 'workspace'], ['roles', 'applications'], ['research', 'research'],
  ['application', 'prep-tools'], ['learning', 'learning'], ['interview', 'interview'], ['offers', 'offers'],
]

export default function ProductStory() {
  const { t, languages } = useLanguage()
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const sections = useRef([])
  const activeRef = useRef(0)
  activeRef.current = active

  useEffect(() => {
    let frame = null
    function update() {
      frame = null
      const center = document.documentElement.clientHeight / 2
      const nearest = sections.current.map((element, index) => {
        const rect = element.getBoundingClientRect()
        return { index, distance: Math.abs(rect.top + rect.height / 2 - center) }
      }).sort((a, b) => a.distance - b.distance)[0]
      if (nearest) setActive(nearest.index)
    }
    function schedule() { if (frame === null) frame = window.requestAnimationFrame(update) }
    // The app scrolls inside its main panel, so listen in capture phase.
    document.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      document.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [])

  function select(index) {
    setActive(index)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sections.current[index]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
  }
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (activeRef.current === chapters.length - 1) setPlaying(false)
      else select(activeRef.current + 1)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [playing])

  const [key, image] = chapters[active]
  return <section aria-label={t('welcome.storyTitle')}>
    <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-3">{t('welcome.storyTitle')}</h2>
    <p className="text-slate-400 text-sm mb-6">{t('welcome.storyIntro')}</p>
    <div className="grid lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] gap-6 lg:gap-10 items-start">
      <div>
        {chapters.map(([chapter, asset], index) => <article key={chapter} data-chapter={index} ref={element => { sections.current[index] = element }}
          className={`py-8 lg:min-h-[24rem] flex flex-col justify-center border-t transition-colors ${active === index ? 'border-teal-500/40' : 'border-navy-600'}`}>
          <span className="text-teal-300 text-xs font-display tracking-widest mb-3">0{index + 1}</span>
          <h3 className="font-display text-2xl font-semibold text-white mb-3">{t(`welcome.chapter.${chapter}.title`)}</h3>
          <p className="text-slate-300 leading-relaxed">{t(`welcome.chapter.${chapter}.copy`)}</p>
          {['learning', 'interview'].includes(chapter) && <p className="text-slate-400 text-sm mt-4">{t('welcome.voiceNote')}</p>}
          <img className="lg:hidden mt-5 rounded-2xl border border-navy-600 w-full" src={`/product-previews/${asset}.png`} loading="lazy" width="1040" height="620" alt={t(`welcome.chapter.${chapter}.title`)} />
        </article>)}
      </div>
      <figure className="hidden lg:block sticky top-6 rounded-3xl border border-navy-600 bg-navy-950/70 p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-slate-300 text-sm font-display">{t('welcome.screenTour')}</span>
          <button className="btn-secondary text-xs" aria-pressed={playing} onClick={() => {
            if (!playing && active === chapters.length - 1) select(0)
            setPlaying(!playing)
          }}>{playing ? <Pause size={14} /> : <Play size={14} />}{t(playing ? 'welcome.pauseTour' : 'welcome.playTour')}</button>
        </div>
        <img key={image} src={`/product-previews/${image}.png`} className="w-full rounded-xl border border-navy-600 bg-navy-900 object-contain aspect-[1040/620]" width="1040" height="620" alt={t(`welcome.chapter.${key}.title`)} />
        <figcaption className="text-slate-400 text-xs leading-relaxed mt-3">{t('welcome.sampleCaption')}</figcaption>
        <div className="flex justify-between items-center mt-4">
          <button className="btn-ghost" aria-label={t('welcome.previousChapter')} disabled={active === 0} onClick={() => { setPlaying(false); select(active - 1) }}><ChevronLeft size={18} /></button>
          <span className="text-slate-400 text-xs">{active + 1} / {chapters.length}</span>
          <button className="btn-ghost" aria-label={t('welcome.nextChapter')} disabled={active === chapters.length - 1} onClick={() => { setPlaying(false); select(active + 1) }}><ChevronRight size={18} /></button>
        </div>
      </figure>
    </div>
    <div className="card mt-6">
      <h3 className="font-display font-semibold text-white mb-2">{t('welcome.languagesTitle')}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{languages.map(option => option.nativeLabel).join(' · ')}</p>
      <p className="text-slate-400 text-sm mt-2">{t('welcome.voiceNote')}</p>
    </div>
  </section>
}
