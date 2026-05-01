import React, { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

function StepCard({ step, t }) {
  const [imgMissing, setImgMissing] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs flex items-center justify-center font-mono font-bold flex-shrink-0">
          {step.num}
        </span>
        <h4 className="font-display font-semibold text-white text-sm">{step.title}</h4>
      </div>

      <p className="text-slate-400 text-xs leading-relaxed pl-8">{step.desc}</p>

      <div className="pl-8">
        {imgMissing ? (
          <div className="h-24 rounded-xl border border-dashed border-navy-600 flex flex-col items-center justify-center text-slate-600 text-xs gap-1 select-none">
            <span>{t('settings.deepseekGuide.screenshot')}</span>
            <span className="font-mono text-slate-700">public/guides/deepseek/step-{step.num}.png</span>
          </div>
        ) : (
          <img
            src={step.img}
            alt={`Step ${step.num} - ${step.title}`}
            className="w-full rounded-xl border border-navy-600 object-contain"
            onError={() => setImgMissing(true)}
          />
        )}
      </div>

      {step.link && (
        <div className="pl-8">
          <a
            href={step.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs inline-flex"
          >
            <ExternalLink size={12} /> {step.linkLabel}
          </a>
        </div>
      )}
    </div>
  )
}

export default function DeepSeekGuide() {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const steps = [
    {
      num: 1,
      title: t('settings.deepseekGuide.step1.title'),
      desc: t('settings.deepseekGuide.step1.desc'),
      img: '/guides/deepseek/step-1.png',
      link: 'https://platform.deepseek.com',
      linkLabel: t('settings.deepseekGuide.step1.link'),
    },
    {
      num: 2,
      title: t('settings.deepseekGuide.step2.title'),
      desc: t('settings.deepseekGuide.step2.desc'),
      img: '/guides/deepseek/step-2.png',
    },
    {
      num: 3,
      title: t('settings.deepseekGuide.step3.title'),
      desc: t('settings.deepseekGuide.step3.desc'),
      img: '/guides/deepseek/step-3.png',
    },
    {
      num: 4,
      title: t('settings.deepseekGuide.step4.title'),
      desc: t('settings.deepseekGuide.step4.desc'),
      img: '/guides/deepseek/step-4.png',
    },
  ]

  return (
    <div className="card border-teal-500/20">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-teal-400" />
          <span className="font-display font-semibold text-white text-sm">{t('settings.deepseekGuide.title')}</span>
          <span className="badge-teal">{t('common.recommended')}</span>
        </div>
        {open
          ? <ChevronUp size={15} className="text-slate-400" />
          : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-slate-400 text-xs leading-relaxed">{t('settings.deepseekGuide.copy')}</p>

          {steps.map(step => <StepCard key={step.num} step={step} t={t} />)}

          <div className="bg-navy-900 rounded-xl p-3 text-xs space-y-1 border border-teal-500/10">
            <p className="text-slate-400">
              {t('settings.deepseekGuide.donePrefix')}{' '}
              <span className="text-teal-400 font-mono">DeepSeek</span>{' '}
              {t('settings.deepseekGuide.doneMiddle')}{' '}
              <span className="text-teal-400 font-mono">deepseek-v4-flash</span>.{' '}
              {t('settings.deepseekGuide.doneSuffix')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
