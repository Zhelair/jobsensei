import React, { useEffect, useRef, useState } from 'react'
import { useAI } from '../../context/AIContext'
import { useApp } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  Zap, Check, Trash2, Eye, EyeOff, FileText, Upload, Download, X,
  Coffee, ChevronDown, ChevronUp, LogOut, ExternalLink, Puzzle,
  Globe, Volume2,
} from 'lucide-react'
import DeepSeekGuide from './DeepSeekGuide'

export default function Settings() {
  const {
    provider, model, apiKey, customBaseUrl, saveConfig, PROVIDERS, PROVIDER_CONFIGS,
    bmacToken, bmacEmail, verifyBmac, clearBmacToken, restoreToProxy, isConnected,
  } = useAI()
  const { profile, setShowOnboarding } = useApp()
  const { activeProject, getProjectData, updateProjectData, exportProject, exportAll, importProjects } = useProject()
  const {
    t, language, setLanguage, languageOption, languages,
    voices, voiceName, setVoiceName, activeVoice, voiceSupport,
  } = useLanguage()

  const [form, setForm] = useState({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showOwnKey, setShowOwnKey] = useState(!bmacToken)

  const [bmacInput, setBmacInput] = useState('')
  const [bmacLoading, setBmacLoading] = useState(false)
  const [bmacError, setBmacError] = useState('')

  const resume = getProjectData('resume')
  const [resumeText, setResumeText] = useState(resume || '')
  const [resumeSaved, setResumeSaved] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => {
    setForm({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  }, [provider, model, apiKey, customBaseUrl])

  useEffect(() => {
    if (!bmacToken) setShowOwnKey(true)
  }, [bmacToken])

  function update(k, v) {
    if (k === 'provider') {
      setForm(f => ({ ...f, provider: v, model: PROVIDER_CONFIGS[v].defaultModel }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  async function testConnection() {
    if (!bmacToken) {
      setTestResult('locked')
      return
    }
    setTesting(true)
    setTestResult(null)
    const cfg = PROVIDER_CONFIGS[form.provider]
    const baseUrl = form.provider === PROVIDERS.CUSTOM ? form.customBaseUrl : cfg.baseUrl
    try {
      const isAnthropic = form.provider === PROVIDERS.ANTHROPIC
      const res = await fetch(
        isAnthropic ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: isAnthropic
            ? { 'Content-Type': 'application/json', 'x-api-key': form.apiKey, 'anthropic-version': '2023-06-01' }
            : { 'Content-Type': 'application/json', Authorization: `Bearer ${form.apiKey}` },
          body: JSON.stringify(isAnthropic
            ? { model: form.model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
            : { model: form.model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        },
      )
      setTestResult(res.ok ? 'success' : 'error')
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }

  function save() {
    if (!bmacToken) {
      setTestResult('locked')
      return
    }
    saveConfig(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleBmacVerify() {
    if (!bmacInput.trim()) return
    setBmacLoading(true)
    setBmacError('')
    try {
      await verifyBmac(bmacInput.trim())
      setBmacInput('')
    } catch (e) {
      setBmacError(e.message)
    }
    setBmacLoading(false)
  }

  function saveResume() {
    updateProjectData('resume', resumeText)
    setResumeSaved(true)
    setTimeout(() => setResumeSaved(false), 2000)
  }

  function clearResume() {
    setResumeText('')
    updateProjectData('resume', '')
  }

  async function handleResumeFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setExtracting(true)
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        const text = await file.text()
        setResumeText(text)
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items.map(item => item.str).join(' ')
          fullText += pageText + '\n'
        }
        const cleaned = fullText.trim().replace(/\s{3,}/g, '\n')
        setResumeText(cleaned || '[PDF had no readable text. Please paste your resume below.]')
      } else {
        const text = await file.text()
        setResumeText(text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'))
      }
    } catch (err) {
      console.error('Resume parse error:', err)
      setResumeText('[Could not read file. Please paste your resume text below.]')
    }
    setExtracting(false)
    e.target.value = ''
  }

  async function handleImportProject(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const count = await importProjects(file)
      setImportMsg(`Imported ${count} project${count > 1 ? 's' : ''}.`)
    } catch {
      setImportMsg('Invalid file format.')
    }
    setTimeout(() => setImportMsg(''), 3000)
    e.target.value = ''
  }

  function clearAllData() {
    if (confirm('This will clear all JobSensei data. Are you sure?')) {
      ['js_profile', 'js_stats', 'js_ai_config', 'js_onboarding_done', 'js_projects', 'js_active_project',
        'js_interview_sessions', 'js_topics', 'js_applications', 'js_star_stories', 'js_company_notes'].forEach(k => localStorage.removeItem(k))
      window.location.reload()
    }
  }

  function previewVoice() {
    if (!window.speechSynthesis || !activeVoice) return
    window.speechSynthesis.cancel()
    const previewSamples = {
      bg: 'Здравейте, аз съм JobSensei. Ако гласът звучи странно, браузърът няма добър български voice.',
      ru: 'Здравствуйте, я JobSensei. Это выбранный голос браузера.',
      de: 'Guten Tag, ich bin JobSensei. Dies ist die ausgewählte Browser-Stimme.',
      'es-ES': 'Hola, soy JobSensei. Esta es la voz seleccionada del navegador.',
      'es-US': 'Hola, soy JobSensei. Esta es la voz seleccionada del navegador.',
      fr: 'Bonjour, je suis JobSensei. Voici la voix de navigateur sélectionnée.',
      it: 'Buongiorno, sono JobSensei. Questa è la voce del browser selezionata.',
      pl: 'Dzień dobry, tu JobSensei. To jest wybrany głos przeglądarki.',
      'pt-BR': 'Olá, eu sou o JobSensei. Esta é a voz selecionada do navegador.',
    }
    const utterance = new SpeechSynthesisUtterance(previewSamples[language] || 'Hello, I am JobSensei. This is the selected browser voice.')
    utterance.lang = languageOption.speechLang
    utterance.voice = activeVoice
    window.speechSynthesis.speak(utterance)
  }

  const voiceSupportCopy = voiceSupport === 'exact'
    ? t('settings.voiceExact')
    : voiceSupport === 'related'
      ? t('settings.voiceRelated')
      : voiceSupport === 'fallback'
        ? t('settings.voiceFallback')
        : t('settings.voiceNone')

  const hasPlanAccess = !!bmacToken
  const usingOwnKey = hasPlanAccess && !!apiKey
  const usingJobsenseiAI = !!bmacToken && !apiKey
  const currentProviderLabel = PROVIDER_CONFIGS[form.provider]?.label || 'Custom'
  const planBadgeClass = usingOwnKey
    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
    : usingJobsenseiAI
      ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
      : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'

  const planTitle = usingOwnKey
    ? 'Using your own API key'
    : usingJobsenseiAI
      ? 'JobSensei AI active'
      : 'No AI access connected'

  const planCopy = usingOwnKey
    ? `Your workspace is running on ${currentProviderLabel} with ${form.model}.`
    : usingJobsenseiAI
      ? 'JobSensei is powering AI for this workspace. You can still switch to your own key at any time.'
      : 'Unlock JobSensei first, then use hosted AI or connect your own API key.'

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in space-y-4">
      <h2 className="section-title mb-1">{t('settings.title')}</h2>
      <p className="section-sub">{t('settings.subtitle')}</p>

      <div className="card border-indigo-500/20 bg-indigo-500/5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="min-w-0 max-w-3xl">
            <h3 className="font-display font-semibold text-white text-lg mb-1 flex items-center gap-2">
              <Globe size={17} className="text-indigo-300" /> {t('settings.languageTitle')}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">{t('settings.languageCopy')}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] border ${
            voiceSupport === 'exact'
              ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
              : voiceSupport === 'fallback'
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
                : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
          }`}>
            {activeVoice ? `${activeVoice.name} (${activeVoice.lang})` : 'No voice'}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.interfaceLanguage')}</label>
            <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)}>
              {languages.map(option => (
                <option key={option.code} value={option.code}>
                  {option.nativeLabel} - {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.voice')}</label>
            <select className="input-field" value={voiceName} onChange={e => setVoiceName(e.target.value)}>
              <option value="">{t('settings.voiceAuto')}</option>
              {voices.map(voice => (
                <option key={voice.voiceURI || voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-navy-600 bg-navy-950/60 px-3 py-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-white text-sm font-display font-semibold">{voiceSupportCopy}</div>
              {(languageOption.voiceNote || voiceSupport === 'fallback') && (
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  <span className="text-yellow-300">{t('settings.voiceNote')}:</span> {languageOption.voiceNote || t('settings.voiceFallback')}
                </p>
              )}
            </div>
            <button onClick={previewVoice} disabled={!activeVoice} className="btn-secondary text-xs">
              <Volume2 size={13} /> {t('settings.voicePreview')}
            </button>
          </div>
        </div>
      </div>

      <div className="card border-teal-500/20 bg-teal-500/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 max-w-3xl">
            <div className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wide mb-2">{t('settings.planAccess')}</div>
            <h3 className="font-display font-semibold text-white text-lg mb-1">{planTitle}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{planCopy}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className={`px-2.5 py-1 rounded-full text-[11px] border ${planBadgeClass}`}>
                {usingOwnKey ? 'BYOK mode' : usingJobsenseiAI ? 'JobSensei AI' : 'Free mode'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] border ${isConnected ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                {isConnected ? 'AI connected' : 'AI not connected'}
              </span>
              {activeProject?.name && (
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300">
                  Project: {activeProject.name}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-navy-600 bg-navy-950/70 px-4 py-3 min-w-[220px]">
            <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">Current Mode</div>
            <div className="text-white text-sm font-display font-semibold">
              {usingOwnKey ? currentProviderLabel : usingJobsenseiAI ? 'JobSensei hosted AI' : 'No AI provider'}
            </div>
            <div className="text-slate-400 text-xs mt-1">
              {usingOwnKey ? form.model : usingJobsenseiAI ? (bmacEmail || 'Access active') : 'Connect a plan or API key below.'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <div className={`card ${bmacToken ? 'border-green-500/30 bg-green-500/5' : 'border-teal-500/20'}`}>
            <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
              <Coffee size={16} className="text-yellow-400" /> JobSensei AI
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Use JobSensei-hosted AI through your plan, or activate access with your code. Billing is handled through Buy Me a Coffee.
            </p>

            {bmacToken ? (
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                  <Check size={16} className="text-green-400 flex-shrink-0" />
                  <div>
                    <div className="text-green-400 text-sm font-display font-semibold">Plan active</div>
                    <div className="text-slate-400 text-xs">{bmacEmail}</div>
                  </div>
                </div>
                <button onClick={clearBmacToken} className="btn-ghost text-xs text-slate-400 hover:text-red-400">
                  <LogOut size={13} /> Sign out of JobSensei AI
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <a
                  href="https://buymeacoffee.com/niksales73l/e/515014"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center bg-yellow-500 hover:bg-yellow-400 text-black border-0 text-sm"
                >
                  <Coffee size={14} /> Upgrade via Buy Me a Coffee <ExternalLink size={12} className="opacity-60" />
                </a>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-slate-600 text-xs">already have access?</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <input
                  className="input-field text-sm"
                  type="text"
                  placeholder="Enter your access code or email..."
                  value={bmacInput}
                  onChange={e => { setBmacInput(e.target.value); setBmacError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleBmacVerify()}
                />
                <button
                  onClick={handleBmacVerify}
                  disabled={!bmacInput.trim() || bmacLoading}
                  className="btn-primary w-full justify-center"
                >
                  <Coffee size={14} /> {bmacLoading ? 'Activating...' : 'Activate JobSensei AI'}
                </button>
                {bmacError && <p className="text-red-400 text-xs">{bmacError}</p>}
              </div>
            )}
          </div>

          <div className="card">
            <button
              onClick={() => setShowOwnKey(o => !o)}
              className="w-full flex items-center justify-between gap-3"
            >
              <span className="font-display font-semibold text-white text-sm flex items-center gap-2">
                <Zap size={15} className="text-teal-400" /> Bring your own API key
              </span>
              {showOwnKey ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>

            <p className="text-slate-400 text-xs mt-2">
              Optional after unlock. Use your own OpenAI, DeepSeek, Anthropic, or compatible endpoint instead of JobSensei-hosted AI.
            </p>

            {showOwnKey && (
              <div className="mt-4 space-y-3">
                {!hasPlanAccess ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4">
                    <div className="text-yellow-300 text-sm font-display font-semibold mb-1">Unlock JobSensei to use BYOK</div>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                      Personal API keys are still a premium app mode. Activate your access code above first, then this setup opens.
                    </p>
                    <button
                      onClick={() => {
                        document.querySelector('input[placeholder="Enter your access code or email..."]')?.focus()
                      }}
                      className="btn-secondary text-xs"
                    >
                      <Coffee size={13} /> Enter access code
                    </button>
                  </div>
                ) : (
                  <>
                <DeepSeekGuide />
                <div className="rounded-xl border border-navy-600 bg-navy-900/60 px-3 py-3">
                  <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">Current BYOK status</div>
                  <div className="text-white text-sm">
                    {usingOwnKey ? `${currentProviderLabel} - ${form.model}` : 'No personal API key saved yet'}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Provider</label>
                  <select className="input-field" value={form.provider} onChange={e => update('provider', e.target.value)}>
                    {Object.entries(PROVIDER_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">API Key</label>
                  <div className="relative">
                    <input
                      className="input-field pr-10 font-mono text-xs"
                      type={showKey ? 'text' : 'password'}
                      placeholder="Enter your API key..."
                      value={form.apiKey}
                      onChange={e => update('apiKey', e.target.value)}
                    />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs mt-1">Stored locally on this device. Never sent to JobSensei.</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Model</label>
                  <input
                    className="input-field font-mono text-xs"
                    placeholder="e.g. deepseek-v4-flash"
                    value={form.model}
                    onChange={e => update('model', e.target.value)}
                  />
                </div>
                {form.provider === PROVIDERS.CUSTOM && (
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Custom Base URL</label>
                    <input
                      className="input-field font-mono text-xs"
                      placeholder="https://..."
                      value={form.customBaseUrl}
                      onChange={e => update('customBaseUrl', e.target.value)}
                    />
                  </div>
                )}
                <div className="bg-navy-900 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                  <div><span className="text-slate-400">DeepSeek:</span> deepseek-v4-flash / deepseek-v4-pro</div>
                  <div><span className="text-slate-400">OpenAI:</span> gpt-5.4-mini / gpt-5.5</div>
                  <div><span className="text-slate-400">Anthropic:</span> claude-sonnet-4-6 / claude-haiku-4-5-20251001</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={testConnection} disabled={!form.apiKey || testing} className="btn-secondary flex-1 justify-center">
                    <Zap size={14} /> {testing ? 'Testing...' : 'Test'}
                  </button>
                  <button onClick={save} className={`btn-primary flex-1 justify-center ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
                    {saved ? <><Check size={14} /> Saved!</> : 'Save Config'}
                  </button>
                </div>
                {testResult === 'success' && <p className="text-green-400 text-sm text-center">Connection successful.</p>}
                {testResult === 'error' && <p className="text-red-400 text-sm text-center">Connection failed. Check the key and model name.</p>}
                {testResult === 'locked' && <p className="text-yellow-400 text-sm text-center">Unlock JobSensei before using BYOK.</p>}

                {bmacToken && apiKey && (
                  <div className="pt-2 border-t border-navy-700">
                    <button
                      onClick={() => {
                        restoreToProxy()
                        setForm(f => ({
                          ...f,
                          apiKey: '',
                          provider: PROVIDERS.DEEPSEEK,
                          model: PROVIDER_CONFIGS[PROVIDERS.DEEPSEEK].defaultModel,
                          customBaseUrl: '',
                        }))
                      }}
                      className="btn-ghost text-xs text-yellow-400 hover:text-yellow-300 w-full justify-center"
                    >
                      <Coffee size={13} /> Switch back to JobSensei AI
                    </button>
                    <p className="text-slate-600 text-xs text-center mt-1">Keeps your plan active and clears the personal API key from this device.</p>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-semibold text-white mb-3">{t('settings.profile')}</h3>
            {profile ? (
              <div className="space-y-1 text-sm mb-3">
                <div><span className="text-slate-400">Name:</span> <span className="text-white">{profile.name || '-'}</span></div>
                <div><span className="text-slate-400">Role:</span> <span className="text-white">{profile.currentRole || '-'}</span></div>
                <div><span className="text-slate-400">Target:</span> <span className="text-white">{profile.targetRole || '-'}</span></div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-3">No profile set yet.</p>
            )}
            <button onClick={() => setShowOnboarding(true)} className="btn-secondary text-sm">
              {profile ? 'Edit Profile' : 'Set Up Profile'}
            </button>
          </div>

          <div className="card border-teal-500/20">
            <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
              <Puzzle size={16} className="text-teal-400" /> Chrome Extension
            </h3>
            <p className="text-slate-400 text-xs mb-3">
              Capture job pages or selected JD text into your tracker.
            </p>
            <div className="rounded-xl border border-navy-600 bg-navy-900/60 p-3 mb-3 space-y-1.5">
              {[
                'Download and unzip the package.',
                'Open chrome://extensions and enable Developer mode.',
                'Load unpacked and select the extension folder.',
              ].map((step, i) => (
                <div key={step} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-teal-400 font-mono">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/jobsensei-capture-extension.zip" download className="btn-secondary text-xs">
                <Download size={13} /> Download ZIP
              </a>
              <button disabled className="btn-ghost text-xs opacity-60 cursor-not-allowed">
                <ExternalLink size={13} /> Chrome Store soon
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
              <FileText size={16} className="text-teal-400" /> {t('settings.resumeTitle')}
            </h3>
            <p className="text-slate-400 text-xs mb-3">Saved per project. Used to prefill your background across the main tools.</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs flex-1 justify-center">
                <Upload size={13} /> {extracting ? 'Reading...' : 'Upload (.txt, .pdf)'}
              </button>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.rtf" className="hidden" onChange={handleResumeFile} />
              {resumeText && (
                <button onClick={clearResume} className="btn-ghost text-xs text-red-400 hover:text-red-300 px-2">
                  <X size={14} />
                </button>
              )}
            </div>
            <textarea
              className="textarea-field h-36 text-xs mb-3"
              placeholder="Or paste your resume or CV text here directly..."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
            <button onClick={saveResume} className={`btn-primary text-sm ${resumeSaved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
              {resumeSaved ? <><Check size={14} /> Saved!</> : 'Save Resume To Project'}
            </button>
            <p className="text-slate-600 text-xs mt-2">For visual design analysis, use the Visual Review tool inside the application workflow.</p>
          </div>

          <div className="card">
            <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
              <FileText size={16} className="text-teal-400" /> {t('settings.projectData')}
            </h3>
            <div className="text-slate-400 text-xs mb-3">
              Active project: <span className="text-white">{activeProject?.name || 'No project selected'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => activeProject && exportProject(activeProject.id)} className="btn-secondary text-xs">
                <Download size={13} /> Export This
              </button>
              <button onClick={exportAll} className="btn-secondary text-xs">
                <Download size={13} /> Export All
              </button>
              <button onClick={() => importRef.current?.click()} className="btn-secondary text-xs">
                <Upload size={13} /> Import
              </button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportProject} />
            </div>
            {importMsg && <p className="text-xs mt-2 text-slate-300">{importMsg}</p>}
          </div>

          <div className="card border-red-500/20">
            <h3 className="font-display font-semibold text-white mb-1">Data Management</h3>
            <p className="text-slate-400 text-xs mb-3">Local data controls for this device.</p>
            <button onClick={clearAllData} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm">
              <Trash2 size={14} /> Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
