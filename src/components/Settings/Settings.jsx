import React, { useEffect, useRef, useState } from 'react'
import { useAI } from '../../context/AIContext'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
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
  const {
    secureReady, secureAccountsEnabled, secureUser, secureAccount, secureDevices,
    deviceId, deviceLimit, deviceReplacementCooldown, statusError, accountError, sendingMagicLink,
    magicLinkSentTo, linkingAccess, loadingAccount, sendMagicLink, signOutSecure,
    refreshSecureAccount, linkCurrentAccess, revokeSecureDevice, revokingDeviceId,
    deleteSecureAccount, deletingAccount, exportSecureAccountData, exportingAccountData,
  } = useAuth()
  const { profile, setShowOnboarding } = useApp()
  const { activeProject, getProjectData, updateProjectData } = useProject()
  const {
    t, language, setLanguage, languageOption, languages,
    activeVoice, voiceSupport,
  } = useLanguage()

  const [form, setForm] = useState({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showOwnKey, setShowOwnKey] = useState(false)

  const [bmacInput, setBmacInput] = useState('')
  const [bmacLoading, setBmacLoading] = useState(false)
  const [bmacError, setBmacError] = useState('')
  const [secureEmailInput, setSecureEmailInput] = useState('')
  const [secureDeviceLabel, setSecureDeviceLabel] = useState('')
  const [secureDeleteEmailInput, setSecureDeleteEmailInput] = useState('')
  const [secureNotice, setSecureNotice] = useState('')
  const [secureError, setSecureError] = useState('')

  const resume = getProjectData('resume')
  const [resumeText, setResumeText] = useState(resume || '')
  const [resumeSaved, setResumeSaved] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    setForm({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  }, [provider, model, apiKey, customBaseUrl])

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
        setResumeText(cleaned || t('settings.resumePdfFallback'))
      } else {
        const text = await file.text()
        setResumeText(text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'))
      }
    } catch (err) {
      console.error('Resume parse error:', err)
      setResumeText(t('settings.resumeReadError'))
    }
    setExtracting(false)
    e.target.value = ''
  }

  function clearAllData() {
    if (confirm(t('settings.clearAllDataConfirm'))) {
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
  const voiceBadgeLabel = activeVoice
    ? `${activeVoice.name} (${activeVoice.lang})`
    : `${languageOption.nativeLabel} (${languageOption.speechLang})`

  const hasSecureHostedAccess = !!secureAccount?.planActive
  const hasPlanAccess = !!bmacToken || hasSecureHostedAccess
  const usingOwnKey = hasPlanAccess && !!apiKey
  const usingJobsenseiAI = hasPlanAccess && !apiKey
  const hostedPlanIdentity = bmacEmail || secureUser?.email || secureAccount?.email || ''
  const providerLabelFor = providerKey => {
    const config = PROVIDER_CONFIGS[providerKey]
    if (!config) return t('settings.customProvider')
    return config.labelKey ? t(config.labelKey) : (config.label || t('settings.customProvider'))
  }
  const currentProviderLabel = providerLabelFor(form.provider)
  const planBadgeClass = usingOwnKey
    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
    : usingJobsenseiAI
      ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
      : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'

  const planTitle = usingOwnKey
    ? t('settings.planTitleByok')
    : usingJobsenseiAI
      ? t('settings.planTitleHosted')
      : t('settings.planTitleNone')

  const planCopy = usingOwnKey
    ? t('settings.planCopyByok', { provider: currentProviderLabel, model: form.model })
    : usingJobsenseiAI
      ? t('settings.planCopyHosted')
      : t('settings.planCopyNone')

  const pairedCardClass = 'card h-full flex flex-col'
  const approvedSecureDevices = secureDevices.filter(device => !device.revokedAt)
  const secureSignedIn = !!secureUser
  const secureLinked = !!secureAccount?.linked

  async function handleSendMagicLink() {
    if (!secureEmailInput.trim()) return
    setSecureError('')
    setSecureNotice('')
    try {
      await sendMagicLink(secureEmailInput.trim())
      setSecureNotice(t('settings.secureAccountMagicLinkSent', { email: secureEmailInput.trim() }))
    } catch (err) {
      setSecureError(err.message)
    }
  }

  async function handleLinkCurrentAccess() {
    if (!bmacToken) {
      setSecureError(t('settings.secureAccountNeedsLegacy'))
      return
    }

    setSecureError('')
    setSecureNotice('')
    try {
      await linkCurrentAccess({
        legacyToken: bmacToken,
        deviceName: secureDeviceLabel || undefined,
        deviceLabel: secureDeviceLabel || undefined,
      })
      setSecureNotice(t('settings.secureAccountStatusLinked'))
    } catch (err) {
      setSecureError(err.message)
    }
  }

  async function handleRevokeDevice(targetDeviceId) {
    if (!targetDeviceId) return
    if (!confirm(t('settings.secureAccountRevokeConfirm'))) return

    setSecureError('')
    setSecureNotice('')
    try {
      await revokeSecureDevice(targetDeviceId)
      setSecureNotice(t('settings.secureAccountRevokeSuccess'))
    } catch (err) {
      setSecureError(err.message)
    }
  }

  async function handleDeleteSecureAccount() {
    if (!secureUser?.email) return
    if (secureDeleteEmailInput.trim().toLowerCase() !== secureUser.email.toLowerCase()) {
      setSecureError(t('settings.secureAccountDeleteMismatch'))
      setSecureNotice('')
      return
    }

    if (!confirm(t('settings.secureAccountDeleteConfirm'))) return

    setSecureError('')
    setSecureNotice('')
    try {
      await deleteSecureAccount(secureDeleteEmailInput.trim())
      setSecureDeleteEmailInput('')
      setSecureNotice(t('settings.secureAccountDeleteSuccess'))
    } catch (err) {
      setSecureError(err.message)
    }
  }

  async function handleExportSecureAccount() {
    setSecureError('')
    setSecureNotice('')
    try {
      const payload = await exportSecureAccountData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `jobsensei-secure-account-${stamp}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setSecureNotice(t('settings.secureAccountExportSuccess'))
    } catch (err) {
      setSecureError(err.message)
    }
  }

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
            {voiceBadgeLabel}
          </span>
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.interfaceLanguage')}</label>
            <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)}>
              {languages.map(option => (
                <option key={option.code} value={option.code}>
                  {option.nativeLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="flex md:justify-end">
            <button onClick={previewVoice} disabled={!activeVoice} className="btn-secondary text-xs min-h-[46px] w-full md:w-auto md:px-5">
              <Volume2 size={13} /> {t('settings.voicePreview')}
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-navy-600 bg-navy-950/60 px-3 py-2">
          <div className="text-white text-xs font-display font-semibold leading-relaxed">{voiceSupportCopy}</div>
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
                {usingOwnKey ? t('settings.planBadgeByok') : usingJobsenseiAI ? t('settings.planBadgeHosted') : t('settings.planBadgeFree')}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] border ${isConnected ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                {isConnected ? t('settings.planBadgeConnected') : t('settings.planBadgeDisconnected')}
              </span>
              {activeProject?.name && (
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300">
                  {t('settings.projectBadge', { name: activeProject.name })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_240px] gap-4 mt-4 items-start">
          <div className="rounded-2xl border border-navy-600 bg-navy-950/70 px-4 py-4">
            <h4 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
              <Coffee size={15} className="text-yellow-400" /> {t('settings.jobsenseiAccessTitle')}
            </h4>
            <p className="text-slate-400 text-xs mb-4">
              {t('settings.jobsenseiAccessCopy')}
            </p>

            {hasPlanAccess ? (
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                  <Check size={16} className="text-green-400 flex-shrink-0" />
                  <div>
                    <div className="text-green-400 text-sm font-display font-semibold">{t('settings.planActive')}</div>
                    <div className="text-slate-400 text-xs">{hostedPlanIdentity || t('settings.secureAccountStatusLinked')}</div>
                  </div>
                </div>
                {bmacToken && (
                  <button onClick={clearBmacToken} className="btn-ghost text-xs text-slate-400 hover:text-red-400">
                    <LogOut size={13} /> {t('settings.signOut')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <a
                  href="https://buymeacoffee.com/niksales73l/e/515014"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center bg-yellow-500 hover:bg-yellow-400 text-black border-0 text-sm"
                >
                  <Coffee size={14} /> {t('settings.upgradeViaBmac')} <ExternalLink size={12} className="opacity-60" />
                </a>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-slate-600 text-xs">{t('settings.alreadyHaveAccess')}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <input
                  className="input-field text-sm"
                  type="text"
                  placeholder={t('settings.accessCodePlaceholder')}
                  value={bmacInput}
                  onChange={e => { setBmacInput(e.target.value); setBmacError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleBmacVerify()}
                />
                <button
                  onClick={handleBmacVerify}
                  disabled={!bmacInput.trim() || bmacLoading}
                  className="btn-primary w-full justify-center"
                >
                  <Coffee size={14} /> {bmacLoading ? t('settings.activating') : t('settings.activateAccess')}
                </button>
                {bmacError && <p className="text-red-400 text-xs">{bmacError}</p>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-navy-600 bg-navy-950/70 px-4 py-4 min-w-[220px]">
            <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{t('settings.currentMode')}</div>
            <div className="text-white text-sm font-display font-semibold">
              {usingOwnKey ? currentProviderLabel : usingJobsenseiAI ? t('settings.currentModeHosted') : t('settings.currentModeNone')}
            </div>
            <div className="text-slate-400 text-xs mt-1">
              {usingOwnKey ? form.model : usingJobsenseiAI ? (hostedPlanIdentity || t('settings.currentModeAccessActive')) : t('settings.currentModeConnect')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 items-stretch">
        <div className={pairedCardClass}>
          <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
            <FileText size={16} className="text-teal-400" /> {t('settings.resumeTitle')}
          </h3>
          <p className="text-slate-400 text-xs mb-3">{t('settings.resumeCopy')}</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs flex-1 justify-center">
              <Upload size={13} /> {extracting ? t('settings.reading') : t('settings.resumeUpload')}
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
            placeholder={t('settings.resumePastePlaceholder')}
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
          />
          <button onClick={saveResume} className={`btn-primary text-sm ${resumeSaved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
            {resumeSaved ? <><Check size={14} /> {t('settings.saved')}</> : t('settings.resumeSave')}
          </button>
          <p className="text-slate-600 text-xs mt-2">{t('settings.resumeVisualNote')}</p>
        </div>

        <div className={pairedCardClass}>
            <h3 className="font-display font-semibold text-white mb-3">{t('settings.profile')}</h3>
            {profile ? (
              <div className="space-y-1 text-sm mb-3">
                <div><span className="text-slate-400">{t('settings.profileName')}</span> <span className="text-white">{profile.name || '-'}</span></div>
                <div><span className="text-slate-400">{t('settings.profileRole')}</span> <span className="text-white">{profile.currentRole || '-'}</span></div>
                <div><span className="text-slate-400">{t('settings.profileTarget')}</span> <span className="text-white">{profile.targetRole || '-'}</span></div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-3">{t('settings.noProfile')}</p>
            )}
            <button onClick={() => setShowOnboarding(true)} className="btn-secondary text-sm">
              {profile ? t('settings.editProfile') : t('settings.setupProfile')}
            </button>
        </div>

        <div className={`${pairedCardClass} border-indigo-500/20`}>
          <h3 className="font-display font-semibold text-white mb-1">{t('settings.secureAccountTitle')}</h3>
          <p className="text-slate-400 text-xs mb-3">{t('settings.secureAccountCopy')}</p>

          {!secureReady ? (
            <p className="text-slate-500 text-sm">{t('settings.secureAccountLoading')}</p>
          ) : !secureAccountsEnabled ? (
            <p className="text-slate-500 text-sm">{t('settings.secureAccountUnavailable')}</p>
          ) : (
            <div className="space-y-3">
              {secureSignedIn ? (
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3">
                  <div className="text-teal-300 text-sm font-display font-semibold">
                    {t('settings.secureAccountStatusSignedIn', { email: secureUser.email || '' })}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    {secureLinked
                      ? t('settings.secureAccountStatusLinked')
                      : t('settings.secureAccountStatusPending')}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-slate-400 block">{t('settings.secureAccountMagicLinkLabel')}</label>
                  <input
                    className="input-field text-sm"
                    type="email"
                    placeholder={t('settings.secureAccountMagicLinkPlaceholder')}
                    value={secureEmailInput}
                    onChange={e => {
                      setSecureEmailInput(e.target.value)
                      setSecureError('')
                      setSecureNotice('')
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSendMagicLink()}
                  />
                  <button
                    onClick={handleSendMagicLink}
                    disabled={!secureEmailInput.trim() || sendingMagicLink}
                    className="btn-secondary text-sm justify-center"
                  >
                    {sendingMagicLink ? t('settings.activating') : t('settings.secureAccountMagicLinkButton')}
                  </button>
                </div>
              )}

              {secureSignedIn && !secureLinked && (
                <div className="rounded-xl border border-navy-600 bg-navy-950/70 p-3 space-y-2">
                  <div className="text-white text-sm font-display font-semibold">{t('settings.secureAccountLinkButton')}</div>
                  <p className="text-slate-400 text-xs">{t('settings.secureAccountLinkCopy')}</p>
                  <input
                    className="input-field text-sm"
                    type="text"
                    placeholder={t('settings.secureAccountDevicePlaceholder')}
                    value={secureDeviceLabel}
                    onChange={e => setSecureDeviceLabel(e.target.value)}
                  />
                  <button
                    onClick={handleLinkCurrentAccess}
                    disabled={!bmacToken || linkingAccess}
                    className="btn-primary text-sm justify-center"
                  >
                    {linkingAccess ? t('settings.secureAccountLinking') : t('settings.secureAccountLinkButton')}
                  </button>
                  {!bmacToken && <p className="text-slate-500 text-xs">{t('settings.secureAccountNeedsLegacy')}</p>}
                </div>
              )}

              {secureSignedIn && secureLinked && (
                <div className="rounded-xl border border-navy-600 bg-navy-950/70 p-3 space-y-2">
                  <div className="text-slate-300 text-xs">
                    {t('settings.secureAccountDevicesSummary', { count: approvedSecureDevices.length, limit: deviceLimit })}
                  </div>
                  {deviceReplacementCooldown?.active && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-yellow-200 text-[11px] leading-relaxed">
                      New-device approvals unlock on {new Date(deviceReplacementCooldown.endsAt).toLocaleString()}.
                    </div>
                  )}
                  <div className="space-y-2">
                    {approvedSecureDevices.map(device => (
                      <div key={device.id} className="rounded-xl border border-navy-700 bg-navy-900/60 px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-slate-200 text-xs font-display font-semibold flex flex-wrap gap-2 items-center">
                              <span>{device.deviceLabel || device.deviceName || t('settings.secureAccountCurrentDevice')}</span>
                              {device.deviceId === deviceId && (
                                <span className="px-2 py-0.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-[10px] text-teal-300">
                                  {t('settings.secureAccountCurrentBadge')}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] mt-1">
                              {device.lastSeenAt
                                ? t('settings.secureAccountLastSeen', { date: new Date(device.lastSeenAt).toLocaleString() })
                                : t('settings.secureAccountLastSeenUnknown')}
                            </div>
                          </div>
                          {device.deviceId !== deviceId && (
                            <button
                              onClick={() => handleRevokeDevice(device.deviceId)}
                              disabled={revokingDeviceId === device.deviceId}
                              className="btn-ghost text-[11px] text-red-400 hover:text-red-300 px-2 py-1 min-h-0"
                            >
                              {revokingDeviceId === device.deviceId
                                ? t('settings.secureAccountRevoking')
                                : t('settings.secureAccountRevokeButton')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(secureNotice || magicLinkSentTo) && (
                <p className="text-green-400 text-xs">
                  {secureNotice || t('settings.secureAccountMagicLinkSent', { email: magicLinkSentTo })}
                </p>
              )}
              {(secureError || statusError || accountError) && (
                <p className="text-red-400 text-xs">{secureError || statusError || accountError}</p>
              )}

              {secureSignedIn && (
                <div className="flex gap-2 pt-1 mt-auto">
                  <button
                    onClick={() => refreshSecureAccount().catch(() => {})}
                    disabled={loadingAccount}
                    className="btn-secondary text-xs flex-1 justify-center"
                  >
                    {t('settings.secureAccountRefresh')}
                  </button>
                  <button onClick={signOutSecure} className="btn-ghost text-xs flex-1 justify-center">
                    {t('settings.secureAccountSignOut')}
                  </button>
                </div>
              )}

              {secureSignedIn && (
                <div className="rounded-xl border border-navy-600 bg-navy-950/70 p-3 space-y-2">
                  <div className="text-white text-sm font-display font-semibold">{t('settings.secureAccountExportTitle')}</div>
                  <p className="text-slate-400 text-xs">{t('settings.secureAccountExportCopy')}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportSecureAccount}
                      disabled={exportingAccountData}
                      className="btn-secondary text-xs flex-1 justify-center"
                    >
                      {exportingAccountData ? t('settings.secureAccountExporting') : t('settings.secureAccountExportButton')}
                    </button>
                    <a
                      href="/privacy-policy-draft.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-xs flex-1 justify-center"
                    >
                      <ExternalLink size={13} /> {t('settings.privacyPolicyDraft')}
                    </a>
                  </div>
                </div>
              )}

              {secureSignedIn && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                  <div className="text-red-300 text-sm font-display font-semibold">{t('settings.secureAccountDeleteTitle')}</div>
                  <p className="text-slate-400 text-xs">{t('settings.secureAccountDeleteCopy')}</p>
                  <input
                    className="input-field text-sm"
                    type="email"
                    placeholder={t('settings.secureAccountDeletePlaceholder')}
                    value={secureDeleteEmailInput}
                    onChange={e => {
                      setSecureDeleteEmailInput(e.target.value)
                      setSecureError('')
                      setSecureNotice('')
                    }}
                  />
                  <button
                    onClick={handleDeleteSecureAccount}
                    disabled={!secureDeleteEmailInput.trim() || deletingAccount}
                    className="btn-ghost text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 justify-center"
                  >
                    {deletingAccount ? t('settings.secureAccountDeleting') : t('settings.secureAccountDeleteButton')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${pairedCardClass} border-red-500/20`}>
          <h3 className="font-display font-semibold text-white mb-1">{t('settings.dataManagementTitle')}</h3>
          <div className="space-y-2 text-slate-400 text-xs leading-relaxed mb-3">
            {[
              t('settings.dataBullet1'),
              t('settings.dataBullet2'),
              t('settings.dataBullet3'),
              t('settings.dataBullet4'),
              t('settings.dataBullet5'),
              t('settings.dataBullet6'),
            ].map(line => (
              <p key={line} className="flex items-start gap-2">
                <span className="text-slate-500">-</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
          <button onClick={clearAllData} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm mt-auto">
            <Trash2 size={14} /> {t('settings.clearAllData')}
          </button>
        </div>

        <div className={`${pairedCardClass} border-teal-500/20`}>
          <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
            <Puzzle size={16} className="text-teal-400" /> {t('settings.chromeExtensionTitle')}
          </h3>
          <p className="text-slate-400 text-xs mb-3">
            {t('settings.chromeExtensionCopy')}
          </p>
          <div className="rounded-xl border border-navy-600 bg-navy-900/60 p-3 mb-3 space-y-1.5">
            {[
              t('settings.chromeExtensionStep1'),
              t('settings.chromeExtensionStep2'),
              t('settings.chromeExtensionStep3'),
            ].map((step, i) => (
              <div key={step} className="flex gap-2 text-xs text-slate-300">
                <span className="text-teal-400 font-mono">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
            <a href="/jobsensei-capture-extension.zip" download className="btn-secondary text-xs">
              <Download size={13} /> {t('settings.downloadZip')}
            </a>
            <button disabled className="btn-ghost text-xs opacity-60 cursor-not-allowed">
              <ExternalLink size={13} /> {t('settings.chromeStoreSoon')}
            </button>
          </div>
        </div>

        <div className={pairedCardClass}>
          <button
            onClick={() => hasPlanAccess && setShowOwnKey(o => !o)}
            className="w-full flex items-center justify-between gap-3"
            aria-expanded={hasPlanAccess && showOwnKey}
          >
            <span className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <Zap size={15} className="text-teal-400" /> {t('settings.byokTitle')}
            </span>
            {hasPlanAccess && (showOwnKey ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />)}
          </button>

          <p className="text-slate-400 text-xs mt-2">
            {hasPlanAccess
              ? t('settings.byokCopy')
              : t('settings.byokLocked')}
          </p>

          {hasPlanAccess && showOwnKey && (
            <div className="mt-4 space-y-3">
              <DeepSeekGuide />
              <div className="rounded-xl border border-navy-600 bg-navy-900/60 px-3 py-3">
                <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{t('settings.byokStatus')}</div>
                <div className="text-white text-sm">
                  {usingOwnKey ? `${currentProviderLabel} - ${form.model}` : t('settings.byokStatusEmpty')}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.byokProvider')}</label>
                <select className="input-field" value={form.provider} onChange={e => update('provider', e.target.value)}>
                  {Object.entries(PROVIDER_CONFIGS).map(([k]) => <option key={k} value={k}>{providerLabelFor(k)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.byokApiKey')}</label>
                <div className="relative">
                  <input
                    className="input-field pr-10 font-mono text-xs"
                    type={showKey ? 'text' : 'password'}
                    placeholder={t('settings.byokApiKeyPlaceholder')}
                    value={form.apiKey}
                    onChange={e => update('apiKey', e.target.value)}
                  />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-slate-600 text-xs mt-1">{t('settings.byokStoredLocal')}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.byokModel')}</label>
                <input
                  className="input-field font-mono text-xs"
                  placeholder={t('settings.byokModelPlaceholder')}
                  value={form.model}
                  onChange={e => update('model', e.target.value)}
                />
              </div>
              {form.provider === PROVIDERS.CUSTOM && (
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.byokCustomBaseUrl')}</label>
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
                  <Zap size={14} /> {testing ? t('settings.byokTesting') : t('settings.byokTest')}
                </button>
                <button onClick={save} className={`btn-primary flex-1 justify-center ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
                  {saved ? <><Check size={14} /> {t('settings.saved')}</> : t('settings.byokSaveConfig')}
                </button>
              </div>
              {testResult === 'success' && <p className="text-green-400 text-sm text-center">{t('settings.byokConnectionSuccess')}</p>}
              {testResult === 'error' && <p className="text-red-400 text-sm text-center">{t('settings.byokConnectionFailed')}</p>}

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
                    <Coffee size={13} /> {t('settings.byokSwitchBack')}
                  </button>
                  <p className="text-slate-600 text-xs text-center mt-1">{t('settings.byokSwitchBackNote')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
