import React, { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react'

const STEPS = [
  {
    num: 1,
    title: 'Create a DeepSeek account',
    desc: 'Go to platform.deepseek.com and sign up with your email. Check your inbox and confirm the verification email before moving on.',
    img: '/guides/deepseek/step-1.png',
    link: 'https://platform.deepseek.com',
    linkLabel: 'Open DeepSeek Platform',
  },
  {
    num: 2,
    title: 'Navigate to API Keys',
    desc: 'After logging in, click your profile icon in the top-right corner. Select "API Keys" from the dropdown menu.',
    img: '/guides/deepseek/step-2.png',
  },
  {
    num: 3,
    title: 'Generate your key',
    desc: 'Click "Create new secret key", give it any name (e.g. "JobSensei"), then copy the key immediately — DeepSeek will not show it again.',
    img: '/guides/deepseek/step-3.png',
  },
  {
    num: 4,
    title: 'Add credits (EUR 3 minimum)',
    desc: 'Open "Top Up" in the left sidebar. Add at least EUR 3 to activate the API. At DeepSeek pricing, EUR 3 will last months of typical use.',
    img: '/guides/deepseek/step-4.png',
  },
]

function StepCard({ step }) {
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
            <span>Screenshot goes here</span>
            <span className="font-mono text-slate-700">public/guides/deepseek/step-{step.num}.png</span>
          </div>
        ) : (
          <img
            src={step.img}
            alt={`Step ${step.num} — ${step.title}`}
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

  return (
    <div className="card border-teal-500/20">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-teal-400" />
          <span className="font-display font-semibold text-white text-sm">DeepSeek Setup Guide</span>
          <span className="badge-teal">Recommended</span>
        </div>
        {open
          ? <ChevronUp size={15} className="text-slate-400" />
          : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-slate-400 text-xs leading-relaxed">
            DeepSeek is the recommended AI for JobSensei — extremely capable, very cheap, and no waitlist.
            Follow these 4 steps to get your API key.
          </p>

          {STEPS.map(step => <StepCard key={step.num} step={step} />)}

          <div className="bg-navy-900 rounded-xl p-3 text-xs space-y-1 border border-teal-500/10">
            <p className="text-slate-400">
              Done? Select <span className="text-teal-400 font-mono">DeepSeek</span> in the provider dropdown above,
              paste your key in the API Key field, and use model{' '}
              <span className="text-teal-400 font-mono">deepseek-chat</span>. Hit Test to confirm.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
