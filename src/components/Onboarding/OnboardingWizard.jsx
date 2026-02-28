import React, { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { GraduationCap, ChevronRight, ChevronLeft, Check, Upload, FileText, Coffee } from 'lucide-react'

export default function OnboardingWizard() {
  const { saveProfile } = useApp()
  const { saveConfig, PROVIDERS, PROVIDER_CONFIGS, verifyBmac } = useAI()
  const { updateProjectData } = useProject()

  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: '', currentRole: '', experience: '', industry: '',
    targetRole: '', targetIndustries: '', targetCompanies: '',
    provider: PROVIDERS.DEEPSEEK, apiKey: '', model: 'deepseek-chat', customBaseUrl: '',
    resume: '',
  })
  const [extractingResume, setExtractingResume] = useState(false)
  const resumeFileRef = useRef(null)
  const [bmacInput, setBmacInput] = useState('')
  const [bmacLoading, setBmacLoading] = useState(false)
  const [bmacError, setBmacError] = useState('')
  const [bmacVerified, setBmacVerified] = useState(false)

  async function handleBmacVerify() {
    if (!bmacInput.trim()) return
    setBmacLoading(true); setBmacError('')
    try {
      await verifyBmac(bmacInput.trim())
      setBmacVerified(true)
    } catch (e) {
      setBmacError(e.message)
    }
    setBmacLoading(false)
  }

  function update(k, v) { setData(d => ({ ...d, [k]: v })) }

  async function handleOnboardingResumeFile(e) {
    const file = e.target.files[0]; if (!file) return
    setExtractingResume(true)
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        update('resume', await file.text())
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map(item => item.str).join(' ') + '\n'
        }
        update('resume', fullText.trim().replace(/\s{3,}/g, '\n') || '[PDF had no readable text. Paste below.]')
      } else {
        update('resume', (await file.text()).replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'))
      }
    } catch {
      update('resume', '[Could not read file. Please paste your resume below.]')
    }
    setExtractingResume(false)
    e.target.value = ''
  }

  function finish() {
    saveProfile({
      name: data.name, currentRole: data.currentRole,
      experience: data.experience, industry: data.industry,
      targetRole: data.targetRole, targetIndustries: data.targetIndustries,
      targetCompanies: data.targetCompanies,
    })
    saveConfig({ provider: data.provider, apiKey: data.apiKey, model: data.model, customBaseUrl: data.customBaseUrl })
    if (data.resume?.trim()) updateProjectData('resume', data.resume)
  }

  const steps = [
    {
      title: 'Who are you?',
      subtitle: 'Tell us about your background so we can personalize everything.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Your name</label>
            <input className="input-field" placeholder="Nikita" value={data.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Current / most recent role</label>
            <input className="input-field" placeholder="Financial Crime Investigations Expert" value={data.currentRole} onChange={e => update('currentRole', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Years of experience</label>
            <input className="input-field" placeholder="4+ years" value={data.experience} onChange={e => update('experience', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Industry</label>
            <input className="input-field" placeholder="Fintech / Gambling / Financial Crime" value={data.industry} onChange={e => update('industry', e.target.value)} />
          </div>
        </div>
      )
    },
    {
      title: "What are you hunting for?",
      subtitle: 'Help us tailor your interview prep and gap analysis.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Target role type</label>
            <input className="input-field" placeholder="Senior FRAML Analyst, Compliance Manager..." value={data.targetRole} onChange={e => update('targetRole', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Preferred industries</label>
            <input className="input-field" placeholder="Fintech, Banking, Payments..." value={data.targetIndustries} onChange={e => update('targetIndustries', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 font-body mb-1.5 block">Any specific companies on your radar? (optional)</label>
            <input className="input-field" placeholder="Revolut, N26, Stripe..." value={data.targetCompanies} onChange={e => update('targetCompanies', e.target.value)} />
          </div>
        </div>
      )
    },
    {
      title: 'Upload your Resume / CV',
      subtitle: 'One upload fills Interview Prep, Gap Analysis, and all Tools automatically.',
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => resumeFileRef.current?.click()}
              className="btn-secondary flex-1 justify-center"
            >
              <Upload size={14} />
              {extractingResume ? 'Reading…' : 'Upload .txt or .pdf'}
            </button>
            <input
              ref={resumeFileRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,.rtf"
              className="hidden"
              onChange={handleOnboardingResumeFile}
            />
          </div>
          <textarea
            className="textarea-field h-32 text-xs"
            placeholder="Or paste your resume / CV text here…"
            value={data.resume}
            onChange={e => update('resume', e.target.value)}
          />
          {data.resume?.trim() ? (
            <p className="text-teal-400 text-xs text-center flex items-center justify-center gap-1.5">
              <Check size={13} /> Resume captured · {data.resume.length.toLocaleString()} characters
            </p>
          ) : (
            <p className="text-slate-500 text-xs text-center">
              You can skip this and upload it later in Settings.
            </p>
          )}
        </div>
      )
    },
    {
      title: 'Activate JobSensei AI',
      subtitle: 'Choose how to power the AI features.',
      content: (
        <div className="space-y-4">
          {/* BMAC option */}
          <div className={`rounded-xl border p-4 space-y-3 ${bmacVerified ? 'border-green-500/30 bg-green-500/5' : 'border-teal-500/20'}`}>
            <div className="flex items-center gap-2">
              <Coffee size={15} className="text-yellow-400" />
              <span className="font-display font-semibold text-white text-sm">Buy Me a Coffee Supporter</span>
            </div>
            {bmacVerified ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={15}/> Verified! AI powered by JobSensei.
              </div>
            ) : (
              <>
                <a
                  href="https://buymeacoffee.com/niksales73l"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center bg-yellow-500 hover:bg-yellow-400 text-black border-0"
                >
                  <Coffee size={14}/> Buy Me a Coffee
                </a>
                <p className="text-slate-400 text-xs text-center">Already a supporter? Enter your access code below.</p>
                <input
                  className="input-field text-sm"
                  type="text"
                  placeholder="Enter your access code..."
                  value={bmacInput}
                  onChange={e => { setBmacInput(e.target.value); setBmacError('') }}
                />
                <button
                  onClick={handleBmacVerify}
                  disabled={!bmacInput.trim() || bmacLoading}
                  className="btn-primary w-full justify-center"
                >
                  <Coffee size={14}/> {bmacLoading ? 'Verifying...' : 'Activate Access'}
                </button>
                {bmacError && <p className="text-red-400 text-xs">{bmacError}</p>}
              </>
            )}
          </div>

          <p className="text-slate-600 text-xs text-center">Once active, you can manage access in Settings.</p>
        </div>
      )
    },
  ]

  return (
    <div className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl animate-in">
        {/* Header */}
        <div className="p-6 border-b border-navy-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-xl">Welcome to JobSensei</h2>
              <p className="text-slate-400 text-xs">Your AI-powered job hunt companion</p>
            </div>
          </div>
          {/* Step indicators */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-teal-500' : 'bg-navy-600'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="font-display font-semibold text-white text-lg mb-1">{steps[step].title}</h3>
          <p className="text-slate-400 text-sm mb-5">{steps[step].subtitle}</p>
          {steps[step].content}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="btn-ghost"><ChevronLeft size={16} /> Back</button>
            : <button onClick={finish} className="text-slate-500 text-sm hover:text-slate-300 transition-colors">Skip for now</button>
          }
          {step < steps.length - 1
            ? <button onClick={() => setStep(s => s + 1)} className="btn-primary">Next <ChevronRight size={16} /></button>
            : <button onClick={finish} className="btn-primary"><Check size={16} /> Get Started</button>
          }
        </div>
      </div>
    </div>
  )
}
