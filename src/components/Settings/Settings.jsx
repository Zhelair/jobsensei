import React, { useEffect, useRef, useState } from 'react'
import { useAI } from '../../context/AIContext'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  Zap, Check, Trash2, Eye, EyeOff, FileText, Upload, Download, X,
  Coffee, CreditCard, ChevronDown, ChevronUp, LogOut, ExternalLink, Puzzle, FolderArchive,
  Globe, Volume2, Shield, MonitorSmartphone,
} from 'lucide-react'
import DeepSeekGuide from './DeepSeekGuide'
import { getCreditSnapshot, HOSTED_REQUEST_CREDITS, PRO_MONTHLY_CREDITS } from '../../lib/credits'
import { openProCheckout } from '../../lib/billing'

export default function Settings({ mode = 'settings' }) {
  const {
    provider, model, apiKey, customBaseUrl, saveConfig, PROVIDERS, PROVIDER_CONFIGS,
    bmacToken, unlockAccess, restoreToProxy, isConnected,
  } = useAI()
  const {
    secureUser, secureAccount, statusError, accountError, signOutSecure,
    magicLinkSentTo,
    revokeSecureDevice, revokingDeviceId, loadingAccount, refreshSecureAccount,
    secureSession, secureDevice,
  } = useAuth()
  const { profile, openOnboarding } = useApp()
  const { activeProject, getProjectData, updateProjectData, exportProject, exportAll, importProjects } = useProject()
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
  const isAccountMode = mode === 'account'

  const [bmacInput, setBmacInput] = useState('')
  const [bmacLoading, setBmacLoading] = useState(false)
  const [bmacError, setBmacError] = useState('')
  const [bmacNotice, setBmacNotice] = useState('')
  const [magicLinkCooldownUntil, setMagicLinkCooldownUntil] = useState(0)
  const [secureError, setSecureError] = useState('')
  const [billingPortalLoading, setBillingPortalLoading] = useState(false)
  const [billingPortalError, setBillingPortalError] = useState('')
  const [importingProjects, setImportingProjects] = useState(false)
  const [projectTransferMessage, setProjectTransferMessage] = useState('')

  const resume = getProjectData('resume')
  const [resumeText, setResumeText] = useState(resume || '')
  const [resumeSaved, setResumeSaved] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef(null)
  const projectImportRef = useRef(null)
  const planAccessRef = useRef(null)
  const byokCardRef = useRef(null)

  function formatCreditNumber(value) {
    if (!Number.isFinite(value)) return '-'
    return new Intl.NumberFormat().format(value)
  }

  function formatCreditResetDate(value) {
    if (!value) return ''
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    } catch {
      return ''
    }
  }

  useEffect(() => {
    setForm({ provider, model, apiKey, customBaseUrl: customBaseUrl || '' })
  }, [provider, model, apiKey, customBaseUrl])

  useEffect(() => {
    function openPlanAccessPanel() {
      window.setTimeout(() => {
        planAccessRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }, 60)
    }

    function openByokPanel() {
      setShowOwnKey(true)
      window.setTimeout(() => {
        byokCardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 60)
    }

    window.addEventListener('jobsensei:open-plan-settings', openPlanAccessPanel)
    window.addEventListener('jobsensei:open-byok-settings', openByokPanel)
    return () => {
      window.removeEventListener('jobsensei:open-plan-settings', openPlanAccessPanel)
      window.removeEventListener('jobsensei:open-byok-settings', openByokPanel)
    }
  }, [])

  useEffect(() => {
    if (!magicLinkCooldownUntil) return undefined
    const remainingMs = magicLinkCooldownUntil - Date.now()
    if (remainingMs <= 0) {
      setMagicLinkCooldownUntil(0)
      return undefined
    }

    const timer = window.setTimeout(() => {
      setMagicLinkCooldownUntil(0)
    }, remainingMs)

    return () => window.clearTimeout(timer)
  }, [magicLinkCooldownUntil])

  function update(k, v) {
    if (k === 'provider') {
      setForm(f => ({ ...f, provider: v, model: PROVIDER_CONFIGS[v].defaultModel }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  async function testConnection() {
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
    saveConfig(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSecureSignOut() {
    if (!window.confirm(t('settings.signOutConfirm'))) return
    await signOutSecure()
  }

  async function handleSecureRefresh() {
    setSecureError('')

    try {
      await refreshSecureAccount()
    } catch (error) {
      setSecureError(error.message || 'Unable to load account access status.')
    }
  }

  async function handleUnlockAccess() {
    if (!bmacInput.trim()) return
    const normalizedInput = bmacInput.trim().toLowerCase()
    const signedInEmail = String(secureUser?.email || secureAccount?.email || '').trim().toLowerCase()
    const isSameSignedInAccount = Boolean(
      normalizedInput
      && secureAccount?.planActive
      && signedInEmail
      && normalizedInput === signedInEmail,
    )
    const magicLinkCooldownActive = Boolean(
      normalizedInput
      && magicLinkSentTo
      && normalizedInput === magicLinkSentTo.toLowerCase()
      && magicLinkCooldownUntil > Date.now(),
    )

    if (isSameSignedInAccount) {
      setBmacError('')
      setBmacNotice(t('settings.secureAccountStatusSignedIn', {
        email: secureUser?.email || secureAccount?.email || '',
      }))
      return
    }

    if (magicLinkCooldownActive) {
      setBmacError('')
      setBmacNotice(t('settings.unlockMagicLinkSent', { email: normalizedInput }))
      return
    }

    setBmacLoading(true)
    setBmacError('')
    setBmacNotice('')
    setSecureError('')
    try {
      const result = await unlockAccess(bmacInput.trim())
      if (result?.mode === 'magic_link') {
        setBmacNotice(t('settings.unlockMagicLinkSent', { email: result.email }))
        setMagicLinkCooldownUntil(Date.now() + 45_000)
      } else {
        setBmacInput('')
        setBmacNotice(t('settings.unlockCodeAccepted'))
      }
    } catch (e) {
      setBmacError(e.message)
    }
    setBmacLoading(false)
  }

  async function handleProCheckout(prefillEmail = '') {
    setBmacError('')
    setBmacNotice('')

    try {
      await openProCheckout({
        email: prefillEmail || secureUser?.email || bmacInput.trim(),
        userId: secureUser?.id || '',
      })
    } catch (error) {
      setBmacError(error.message || 'Unable to open Paddle checkout right now.')
    }
  }

  async function handleManageBilling() {
    if (!secureSession?.access_token) {
      setBillingPortalError('Sign in to your JobSensei account first.')
      return
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer')
    setBillingPortalLoading(true)
    setBillingPortalError('')

    try {
      const response = await fetch('/api/paddle-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secureSession.access_token}`,
          'X-JobSensei-Device-Id': secureDevice?.deviceId || '',
          'X-JobSensei-Device-Name': secureDevice?.deviceName || '',
        },
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Unable to open Paddle billing right now.')
      }

      if (popup) {
        popup.location.href = payload.url
      } else {
        window.open(payload.url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      if (popup) {
        popup.close()
      }
      setBillingPortalError(error.message || 'Unable to open Paddle billing right now.')
    } finally {
      setBillingPortalLoading(false)
    }
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

  async function handleProjectImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setImportingProjects(true)
    setProjectTransferMessage('')
    try {
      const count = await importProjects(file)
      setProjectTransferMessage(count === 1 ? t('projects.importedOne') : t('projects.importedMany', { count }))
    } catch {
      setProjectTransferMessage(t('projects.invalidFile'))
    } finally {
      setImportingProjects(false)
      event.target.value = ''
      window.setTimeout(() => setProjectTransferMessage(''), 3000)
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
        ? language === 'bg'
          ? 'На това устройство в момента не е открит подходящ български voice. JobSensei ще използва fallback и е възможно звученето да не е идеално.'
          : t('settings.voiceFallback')
        : t('settings.voiceNone')
  const voiceBadgeLabel = activeVoice
    ? `${activeVoice.name} (${activeVoice.lang})`
    : `${languageOption.nativeLabel} (${languageOption.speechLang})`

  const hasSecureHostedAccess = !!secureAccount?.planActive
  const hasPlanAccess = hasSecureHostedAccess
  const usingOwnKey = !!apiKey
  const usingJobsenseiAI = hasPlanAccess && !apiKey
  const hostedPlanIdentity = secureUser?.email || secureAccount?.email || ''
  const providerLabelFor = providerKey => {
    const config = PROVIDER_CONFIGS[providerKey]
    if (!config) return t('settings.customProvider')
    return config.labelKey ? t(config.labelKey) : (config.label || t('settings.customProvider'))
  }
  const currentProviderLabel = providerLabelFor(form.provider)
  const creditSnapshot = getCreditSnapshot({ secureAccount, bmacToken, apiKey })
  const creditStatusDateLabel = creditSnapshot.statusDateKind === 'active_until'
    ? t('settings.creditsMetricActiveUntil')
    : t('settings.creditsMetricReset')
  const proPlanPreview = {
    tier: 'pro',
    monthlyCredits: PRO_MONTHLY_CREDITS,
    requestCost: HOSTED_REQUEST_CREDITS,
    isActive: creditSnapshot.mode === 'hosted' && creditSnapshot.tier === 'pro',
    statusDate: creditSnapshot.mode === 'hosted' && creditSnapshot.tier === 'pro'
      ? (creditSnapshot.statusDate || secureAccount?.planExpiresAt || null)
      : secureAccount?.planExpiresAt || null,
  }
  const proPreviewCreditsValue = proPlanPreview.isActive
    ? (creditSnapshot.balanceKnown
        ? formatCreditNumber(creditSnapshot.remainingCredits)
        : formatCreditNumber(creditSnapshot.monthlyCredits ?? proPlanPreview.monthlyCredits))
    : 'N/A'
  const proPreviewResetValue = proPlanPreview.isActive
    ? (formatCreditResetDate(creditSnapshot.statusDate || creditSnapshot.resetAt) || t('settings.creditsSoon'))
    : 'N/A'
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
  const profileActionLabel = profile ? t('settings.editProfile') : t('settings.setupProfile')
  const pageTitle = isAccountMode ? t('account.title') : t('settings.title')
  const pageSubtitle = isAccountMode ? t('account.subtitle') : t('settings.subtitle')

  const pairedCardClass = 'card flex flex-col'
  const compactAccountCardClass = 'rounded-2xl border border-navy-600 bg-navy-950/70 px-4 py-4'
  const settingsSupportCopyClass = 'text-slate-400 text-sm leading-relaxed'
  const settingsMutedCopyClass = 'text-slate-500 text-sm leading-relaxed'
  const secureSignedIn = !!secureUser
  const hasPaddleBilling = Boolean(
    secureSignedIn
    && secureSession?.access_token
    && secureAccount?.planActive
    && secureAccount?.planTier === 'pro'
    && String(secureAccount?.planSource || '').toLowerCase() === 'paddle_webhook',
  )
  const approvedDevices = (secureAccount?.devices || []).filter(device => device.isApproved)
  const replacementCooldownUntil = secureAccount?.replacementCooldownUntil || ''
  const normalizedUnlockInput = bmacInput.trim().toLowerCase()
  const signedInEmail = String(secureUser?.email || secureAccount?.email || '').trim().toLowerCase()
  const unlockMatchesSignedIn = Boolean(
    normalizedUnlockInput
    && secureAccount?.planActive
    && signedInEmail
    && normalizedUnlockInput === signedInEmail,
  )
  const magicLinkCooldownActive = Boolean(
    normalizedUnlockInput
    && magicLinkSentTo
    && normalizedUnlockInput === magicLinkSentTo.toLowerCase()
    && magicLinkCooldownUntil > Date.now(),
  )
  const deviceStatusMessages = {
    en: {
      approved: 'This browser is approved for hosted AI access.',
      limit_reached: 'This browser is signed in, but your 2 approved device slots are already full. Unlink one below to free a slot.',
      cooldown_active: 'This browser is signed in, but a recent unlink started the 8-hour replacement cooldown.',
      device_revoked: 'This browser was unlinked from your secure account. You can keep browsing Settings, but hosted AI stays blocked here until a device slot opens again.',
      missing_device: 'This browser is missing its secure device id. Refresh the page to register it again.',
      fallback: 'This browser is signed in, but it is not approved for hosted AI access yet.',
      no_devices: 'No approved devices yet.',
      last_seen: 'Last seen {date}',
      unlinked: 'Unlinked',
    },
    ru: {
      approved: 'Этот браузер одобрен для hosted AI доступа.',
      limit_reached: 'В этом браузере вход выполнен, но лимит в 2 одобренных устройства уже занят. Отвяжите одно устройство ниже, чтобы освободить слот.',
      cooldown_active: 'В этом браузере вход выполнен, но после недавней отвязки уже запущен 48-часовой cooldown.',
      device_revoked: 'Этот браузер был отвязан от безопасного аккаунта. Настройки останутся доступны, но hosted AI здесь будет заблокирован, пока снова не освободится слот устройства.',
      missing_device: 'У этого браузера нет secure device id. Обновите страницу, чтобы зарегистрировать его заново.',
      fallback: 'В этом браузере вход выполнен, но он ещё не одобрен для hosted AI доступа.',
      no_devices: 'Одобренных устройств пока нет.',
      last_seen: 'Последняя активность {date}',
      unlinked: 'Отвязано',
    },
    bg: {
      approved: 'Този браузър е одобрен за hosted AI достъп.',
      limit_reached: 'В този браузър има вход, но лимитът от 2 одобрени устройства вече е запълнен. Откачи едно устройство отдолу, за да освободиш слот.',
      cooldown_active: 'В този браузър има вход, но след скорошно откачане вече тече 48-часов cooldown.',
      device_revoked: 'Този браузър беше откачен от защитения акаунт. Настройките остават достъпни, но hosted AI тук ще е блокиран, докато отново се освободи слот за устройство.',
      missing_device: 'На този браузър му липсва secure device id. Опресни страницата, за да го регистрираш отново.',
      fallback: 'В този браузър има вход, но още не е одобрен за hosted AI достъп.',
      no_devices: 'Все още няма одобрени устройства.',
      last_seen: 'Последно активен {date}',
      unlinked: 'Откачено',
    },
  }
  const localizedDeviceStatus = deviceStatusMessages[language] || deviceStatusMessages.en
  const cooldownStatusCopy = {
    en: 'This browser is signed in, but a recent unlink started the 8-hour replacement cooldown.',
    ru: '\u0412 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0432\u0445\u043e\u0434 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d, \u043d\u043e \u043f\u043e\u0441\u043b\u0435 \u043d\u0435\u0434\u0430\u0432\u043d\u0435\u0439 \u043e\u0442\u0432\u044f\u0437\u043a\u0438 \u0443\u0436\u0435 \u0437\u0430\u043f\u0443\u0449\u0435\u043d 8-\u0447\u0430\u0441\u043e\u0432\u043e\u0439 cooldown.',
    bg: '\u0412 \u0442\u043e\u0437\u0438 \u0431\u0440\u0430\u0443\u0437\u044a\u0440 \u0438\u043c\u0430 \u0432\u0445\u043e\u0434, \u043d\u043e \u0441\u043b\u0435\u0434 \u0441\u043a\u043e\u0440\u043e\u0448\u043d\u043e \u043e\u0442\u043a\u0430\u0447\u0430\u043d\u0435 \u0432\u0435\u0447\u0435 \u0442\u0435\u0447\u0435 8-\u0447\u0430\u0441\u043e\u0432 cooldown.',
  }
  const revokeCooldownWarningCopy = {
    en: 'Unlinking a device starts an 8-hour cooldown before a replacement device can be approved.',
    ru: '\u041f\u043e\u0441\u043b\u0435 \u043e\u0442\u0432\u044f\u0437\u043a\u0438 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u0435\u0442\u0441\u044f 8-\u0447\u0430\u0441\u043e\u0432\u043e\u0439 cooldown \u043f\u0435\u0440\u0435\u0434 \u043e\u0434\u043e\u0431\u0440\u0435\u043d\u0438\u0435\u043c \u043d\u043e\u0432\u043e\u0433\u043e \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430.',
    bg: '\u041e\u0442\u043a\u0430\u0447\u0430\u043d\u0435\u0442\u043e \u043d\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u0441\u0442\u0430\u0440\u0442\u0438\u0440\u0430 8-\u0447\u0430\u0441\u043e\u0432 cooldown, \u043f\u0440\u0435\u0434\u0438 \u0434\u0430 \u043c\u043e\u0436\u0435 \u0434\u0430 \u0441\u0435 \u043e\u0434\u043e\u0431\u0440\u0438 \u0437\u0430\u043c\u0435\u0441\u0442\u0432\u0430\u0449\u043e \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e.',
    'es-ES': 'Desvincular un dispositivo inicia una espera de 8 horas antes de aprobar un dispositivo de reemplazo.',
    fr: 'La dissociation d’un appareil lance un délai de 8 heures avant l’approbation d’un appareil de remplacement.',
    it: 'Scollegare un dispositivo avvia un cooldown di 8 ore prima di poter approvare un dispositivo sostitutivo.',
    'pt-BR': 'Desligar um dispositivo inicia um cooldown de 8 horas antes de aprovar um dispositivo de substituição.',
    pl: 'Odpięcie urządzenia uruchamia 8-godzinny cooldown, zanim będzie można zatwierdzić urządzenie zastępcze.',
    de: 'Das Entfernen eines Geräts startet eine 8-Stunden-Sperre, bevor ein Ersatzgerät freigegeben werden kann.',
  }
  const deviceBlockedReason = secureAccount?.deviceBlockedReason || ''
  const currentDeviceStatusCopy = secureAccount?.currentDeviceApproved
    ? localizedDeviceStatus.approved
    : deviceBlockedReason === 'cooldown_active' && cooldownStatusCopy[language]
      ? cooldownStatusCopy[language]
    : deviceBlockedReason && localizedDeviceStatus[deviceBlockedReason]
      ? localizedDeviceStatus[deviceBlockedReason]
      : localizedDeviceStatus.fallback
  const currentDeviceStatusClass = secureAccount?.currentDeviceApproved
    ? 'border-teal-500/20 bg-teal-500/10 text-teal-300'
    : deviceBlockedReason === 'limit_reached' || deviceBlockedReason === 'device_revoked'
      ? 'border-red-500/20 bg-red-500/10 text-red-300'
      : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'

  function formatDeviceTimestamp(value) {
    if (!value) return ''

    try {
      return new Date(value).toLocaleString()
    } catch {
      return ''
    }
  }

  async function handleRevokeDevice(device) {
    const deviceName = device.displayName || device.deviceName || 'device'
    const localizedRevokeCooldownWarning = revokeCooldownWarningCopy[language]
      || t('settings.secureAccountRevokeCooldownWarning')
    const confirmBody = [
      t('settings.secureAccountRevokeBody', { device: deviceName }),
      '',
      localizedRevokeCooldownWarning,
    ].join('\n')

    if (!confirm(confirmBody)) return

    setSecureError('')
    setBmacNotice('')
    try {
      await revokeSecureDevice(device.deviceId)
      setBmacNotice(t('settings.secureAccountRevokeSuccess'))
    } catch (err) {
      setSecureError(err.message)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl md:max-w-5xl xl:max-w-[72rem] mx-auto animate-in space-y-4">
      <h2 className="section-title mb-1">{pageTitle}</h2>
      <p className="section-sub">{pageSubtitle}</p>

      {!isAccountMode && (
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
      )}

      {isAccountMode && (
      <div ref={planAccessRef} className="card border-teal-500/20 bg-teal-500/5">
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

        <div className="credits-panel mt-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-display mb-1">
                {t('settings.creditsKicker')}
              </div>
              <h4 className="font-display font-semibold text-white">
                {creditSnapshot.mode === 'byok'
                  ? t('settings.creditsByokHeadline')
                  : creditSnapshot.mode === 'locked'
                    ? t('settings.creditsLockedHeadline')
                    : creditSnapshot.tier === 'free'
                      ? t('settings.creditsFreeHeadline')
                      : t('settings.creditsProHeadline')}
              </h4>
              {(creditSnapshot.mode === 'byok' || creditSnapshot.mode === 'locked') && (
                <p className="text-slate-300 text-sm leading-relaxed mt-1">
                  {creditSnapshot.mode === 'byok'
                    ? t('settings.creditsByokCopy')
                    : t('settings.creditsLockedCopy')}
                </p>
              )}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] border ${
              creditSnapshot.mode === 'locked'
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : creditSnapshot.mode === 'byok'
                  ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-200'
                  : creditSnapshot.tier === 'free'
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
                    : 'border-teal-500/20 bg-teal-500/10 text-teal-200'
            }`}>
              {creditSnapshot.mode === 'byok'
                ? t('settings.creditsBadgeByok')
                : creditSnapshot.mode === 'locked'
                  ? t('settings.creditsBadgeLocked')
                  : creditSnapshot.tier === 'free'
                    ? t('settings.creditsBadgeFree')
                    : t('settings.creditsBadgePro')}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            <div className="credits-metric rounded-xl border border-white/5 bg-navy-950/60 px-3 py-3">
              <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricAllowance')}</div>
              <div className="text-white text-sm font-display font-semibold">
                {creditSnapshot.monthlyCredits != null
                  ? formatCreditNumber(creditSnapshot.monthlyCredits)
                  : creditSnapshot.mode === 'byok'
                    ? t('settings.creditsUnlimited')
                    : '-'}
              </div>
            </div>
            <div className="credits-metric rounded-xl border border-white/5 bg-navy-950/60 px-3 py-3">
              <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricCost')}</div>
              <div className="text-white text-sm font-display font-semibold">
                {creditSnapshot.requestCost != null
                  ? t('settings.creditsRequestValue', { credits: formatCreditNumber(creditSnapshot.requestCost) })
                  : creditSnapshot.mode === 'byok'
                    ? t('settings.creditsUnlimited')
                    : '-'}
              </div>
            </div>
            <div className="credits-metric rounded-xl border border-white/5 bg-navy-950/60 px-3 py-3">
              <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricLeft')}</div>
              <div className="text-white text-sm font-display font-semibold">
                {creditSnapshot.balanceKnown
                  ? formatCreditNumber(creditSnapshot.remainingCredits)
                  : (creditSnapshot.monthlyCredits != null ? formatCreditNumber(creditSnapshot.monthlyCredits) : '-')}
              </div>
            </div>
            <div className="credits-metric rounded-xl border border-white/5 bg-navy-950/60 px-3 py-3">
              <div className="text-[11px] text-slate-500 mb-1">{creditStatusDateLabel}</div>
              <div className="text-white text-sm font-display font-semibold">
                {formatCreditResetDate(creditSnapshot.statusDate || creditSnapshot.resetAt) || t('settings.creditsSoon')}
              </div>
            </div>
          </div>

          {!creditSnapshot.balanceKnown && creditSnapshot.mode === 'hosted' && (
            <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5 text-indigo-200 text-sm leading-relaxed">
              {t('settings.creditsSyncNote')}
            </div>
          )}
        </div>

        {!proPlanPreview.isActive && (
          <div className="mt-4">
            <div className="rounded-2xl border border-white/5 bg-navy-950/35 px-4 py-4 opacity-80">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h5 className="font-display font-semibold text-slate-300">{t('settings.creditsProHeadline')}</h5>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/20 bg-slate-500/10 text-slate-300">
                  {t('settings.planInactiveBadge')}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
                <div className="rounded-xl border border-white/5 bg-navy-950/50 px-3 py-3">
                  <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricAllowance')}</div>
                  <div className="text-slate-300 text-sm font-display font-semibold">{formatCreditNumber(proPlanPreview.monthlyCredits)}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-navy-950/50 px-3 py-3">
                  <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricCost')}</div>
                  <div className="text-slate-300 text-sm font-display font-semibold">
                    {t('settings.creditsRequestValue', { credits: formatCreditNumber(proPlanPreview.requestCost) })}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-navy-950/50 px-3 py-3">
                  <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricLeft')}</div>
                  <div className="text-slate-400 text-sm font-display font-semibold">
                    {proPreviewCreditsValue}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-navy-950/50 px-3 py-3">
                  <div className="text-[11px] text-slate-500 mb-1">{t('settings.creditsMetricReset')}</div>
                  <div className="text-slate-400 text-sm font-display font-semibold">
                    {proPreviewResetValue}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleProCheckout()}
                className="btn-secondary w-full justify-center mt-3 text-slate-200 border-slate-600/80 bg-slate-700/40 hover:bg-slate-700/60"
              >
                <CreditCard size={14} /> {t('settings.upgradeViaBmac')} <ExternalLink size={12} className="opacity-60" />
              </button>
            </div>
          </div>
        )}

        <div className="grid xl:grid-cols-[minmax(0,0.88fr)_minmax(340px,1.12fr)] gap-4 mt-4 items-start">
          <div className="space-y-4 min-w-0">
            <div className={compactAccountCardClass}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h4 className="font-display font-semibold text-white flex items-center gap-2">
                    <CreditCard size={15} className="text-yellow-400" /> {t('settings.jobsenseiAccessTitle')}
                  </h4>
                  <p className={`${settingsSupportCopyClass} mt-1`}>
                    {t('settings.jobsenseiAccessCopy')}
                  </p>
                </div>
                {hasPlanAccess && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-green-500/20 bg-green-500/10 text-green-300 flex-shrink-0">
                    {t('settings.planActive')}
                  </span>
                )}
              </div>

              {hasPlanAccess ? (
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-3">
                    <div className="flex items-start gap-2">
                      <Check size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-green-300 text-sm font-display font-semibold">{hostedPlanIdentity || t('settings.secureAccountStatusLinked')}</div>
                        <div className="text-slate-300 text-sm leading-relaxed mt-1">{t('settings.secureAccountStatusLinked')}</div>
                      </div>
                    </div>
                  </div>
                  {(bmacToken || secureSignedIn) && (
                    <div className="flex flex-wrap gap-2">
                      {secureSignedIn && (
                        <button
                          onClick={handleSecureRefresh}
                          disabled={loadingAccount}
                          className="btn-ghost text-xs text-slate-300 hover:text-teal-300 disabled:opacity-60"
                        >
                          {loadingAccount ? `${t('settings.secureAccountRefresh')}...` : t('settings.secureAccountRefresh')}
                        </button>
                      )}
                      {secureSignedIn && (
                        <button onClick={handleSecureSignOut} className="btn-ghost text-xs text-slate-400 hover:text-red-400">
                          <LogOut size={13} /> {t('settings.secureAccountSignOut')}
                        </button>
                      )}
                      {hasPaddleBilling && (
                        <button
                          onClick={handleManageBilling}
                          disabled={billingPortalLoading}
                          className="btn-secondary text-xs justify-center"
                        >
                          <CreditCard size={13} /> {billingPortalLoading ? `${t('settings.manageBillingButton')}...` : t('settings.manageBillingButton')}
                        </button>
                      )}
                    </div>
                  )}
                  {hasPaddleBilling && (
                    <p className={settingsMutedCopyClass}>{t('settings.manageBillingCopy')}</p>
                  )}
                  {billingPortalError && <p className="text-red-400 text-sm leading-relaxed">{billingPortalError}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => handleProCheckout()}
                    className="btn-primary w-full justify-center bg-yellow-500 hover:bg-yellow-400 text-black border-0 text-sm"
                  >
                    <CreditCard size={14} /> {t('settings.upgradeViaBmac')} <ExternalLink size={12} className="opacity-60" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-slate-600 text-xs">{t('settings.alreadyHaveAccess')}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <input
                    className="input-field text-sm"
                    type="email"
                    placeholder={t('settings.accessCodePlaceholder')}
                    value={bmacInput}
                    onChange={e => {
                      setBmacInput(e.target.value)
                      setBmacError('')
                      setBmacNotice('')
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleUnlockAccess()}
                  />
                  <button
                    onClick={handleUnlockAccess}
                    disabled={!bmacInput.trim() || bmacLoading || unlockMatchesSignedIn || magicLinkCooldownActive}
                    className="btn-primary w-full justify-center"
                  >
                    <Check size={14} /> {bmacLoading ? t('settings.activating') : t('settings.activateAccess')}
                  </button>
                  <p className={settingsMutedCopyClass}>{t('settings.unlockInputHint')}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{t('settings.legacyBmacNotice')}</p>
                  {secureSignedIn && (
                    <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-3 py-2.5">
                      <div className="text-teal-300 text-sm font-display font-semibold">
                        {t('settings.secureAccountStatusSignedIn', { email: secureUser?.email || secureAccount?.email || '' })}
                      </div>
                    </div>
                  )}
                  {bmacNotice && <p className="text-green-400 text-sm leading-relaxed">{bmacNotice}</p>}
                  {bmacError && <p className="text-red-400 text-sm leading-relaxed">{bmacError}</p>}
                </div>
              )}

              {(secureError || statusError || accountError) && (
                <div className="mt-3 pt-3 border-t border-navy-700/80">
                  <p className="text-red-400 text-sm leading-relaxed">{secureError || statusError || accountError}</p>
                </div>
              )}
            </div>

            <div className={compactAccountCardClass}>
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-display mb-1.5">{t('settings.profile')}</div>
                  <h5 className="font-display font-semibold text-white">{t('settings.profile')}</h5>
                  <p className={`${settingsSupportCopyClass} mt-1`}>{t('settings.profilePlanCopy')}</p>
                </div>
                <button onClick={() => openOnboarding('profile')} className="btn-secondary text-xs sm:text-sm justify-center">
                  {profileActionLabel}
                </button>
              </div>

              <div className="grid gap-2.5 md:grid-cols-3">
                <div className="rounded-2xl border border-navy-600 bg-navy-900/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-display mb-1">{t('settings.profileName')}</div>
                  <div className="text-white text-sm leading-relaxed break-words">{profile?.name || '-'}</div>
                </div>
                <div className="rounded-2xl border border-navy-600 bg-navy-900/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-display mb-1">{t('settings.profileRole')}</div>
                  <div className="text-white text-sm leading-relaxed break-words">{profile?.currentRole || '-'}</div>
                </div>
                <div className="rounded-2xl border border-navy-600 bg-navy-900/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-display mb-1">{t('settings.profileTarget')}</div>
                  <div className="text-white text-sm leading-relaxed break-words">{profile?.targetRole || '-'}</div>
                </div>
              </div>

              {!profile && (
                <p className={`${settingsMutedCopyClass} mt-3`}>{t('settings.noProfile')}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <div className={compactAccountCardClass}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
                    <Shield size={16} className="text-indigo-300 flex-shrink-0" /> {t('settings.secureAccountTitle')}
                  </h3>
                  <p className={settingsSupportCopyClass}>{t('settings.secureAccountDevicesCopy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {secureSignedIn && (
                    <button
                      onClick={handleSecureRefresh}
                      disabled={loadingAccount}
                      className="btn-ghost text-xs text-slate-300 hover:text-teal-300 disabled:opacity-60"
                    >
                      {loadingAccount ? `${t('settings.secureAccountRefresh')}...` : t('settings.secureAccountRefresh')}
                    </button>
                  )}
                  <MonitorSmartphone size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                </div>
              </div>

              {secureSignedIn ? (
                <div className="space-y-3">
                  <div className={`rounded-xl border px-3 py-2.5 ${currentDeviceStatusClass}`}>
                    <div className="text-sm font-display font-semibold break-all">
                      {t('settings.secureAccountStatusSignedIn', { email: secureUser?.email || secureAccount?.email || '' })}
                    </div>
                    <div className="text-xs sm:text-sm mt-1 leading-relaxed opacity-90">{currentDeviceStatusCopy}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-display font-semibold">
                        {t('settings.secureAccountDevicesSummary', {
                          count: secureAccount?.approvedDeviceCount || 0,
                          limit: secureAccount?.deviceLimit || 2,
                        })}
                      </div>
                      <div className="text-slate-500 text-xs break-all mt-1">
                        {secureUser?.email || secureAccount?.email || '-'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/20 bg-indigo-500/10 text-indigo-200 flex-shrink-0">
                      {secureAccount?.approvedDeviceCount || 0}/{secureAccount?.deviceLimit || 2}
                    </span>
                  </div>

                  {replacementCooldownUntil && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-yellow-300 text-sm leading-relaxed">
                      {t('settings.secureAccountCooldownNotice', { date: formatDeviceTimestamp(replacementCooldownUntil) })}
                    </div>
                  )}

                  {approvedDevices.length ? (
                    <div className="space-y-2">
                      {approvedDevices.map(device => (
                        <div key={device.deviceId} className="rounded-xl border border-navy-600 bg-navy-900/70 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-white text-sm font-display font-semibold leading-snug break-words">
                                {device.displayName}
                              </div>
                              <div className="text-slate-400 text-xs mt-1 leading-relaxed break-words">
                                {localizedDeviceStatus.last_seen.replace('{date}', formatDeviceTimestamp(device.lastSeenAt || device.createdAt) || '-')}
                              </div>
                            </div>
                            {device.isCurrent && (
                              <span className="px-2 py-1 rounded-full text-[10px] border border-teal-500/20 bg-teal-500/10 text-teal-300 flex-shrink-0">
                                {t('settings.secureAccountCurrentBadge')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end mt-2">
                            <button
                              onClick={() => handleRevokeDevice(device)}
                              disabled={revokingDeviceId === device.deviceId}
                              className="btn-ghost text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 px-0"
                            >
                              {revokingDeviceId === device.deviceId ? t('settings.activating') : t('settings.secureAccountRevokeButton')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm leading-relaxed">{localizedDeviceStatus.no_devices}</div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-navy-600 bg-navy-950/60 px-3 py-3 text-slate-500 text-sm leading-relaxed">
                  {t('settings.secureAccountCopy')}
                </div>
              )}
            </div>

            <div className={pairedCardClass}>
              <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
                <FileText size={16} className="text-teal-400" /> {t('settings.resumeTitle')}
              </h3>
              <p className={`${settingsSupportCopyClass} mb-3`}>{t('settings.resumeCopy')}</p>
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
                className="textarea-field h-36 text-sm mb-3"
                placeholder={t('settings.resumePastePlaceholder')}
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
              />
              <button onClick={saveResume} className={`btn-primary text-sm ${resumeSaved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
                {resumeSaved ? <><Check size={14} /> {t('settings.saved')}</> : t('settings.resumeSave')}
              </button>
              <p className="text-slate-600 text-sm leading-relaxed mt-2">{t('settings.resumeVisualNote')}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {!isAccountMode && (
      <div className="grid xl:grid-cols-2 gap-4 items-stretch">
        <div className={`${pairedCardClass} border-red-500/20`}>
          <h3 className="font-display font-semibold text-white mb-1">{t('settings.dataManagementTitle')}</h3>
          <div className="rounded-xl border border-navy-600 bg-navy-950/60 p-3 mb-3 space-y-3">
            <div>
              <div className="text-white text-sm font-display font-semibold">{t('settings.privacyTermsTitle')}</div>
              <p className="text-slate-400 text-sm leading-relaxed mt-1">{t('settings.privacyTermsSummary')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/privacy-policy.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                <ExternalLink size={13} /> {t('settings.privacyPolicyLink')}
              </a>
              <a href={`/terms-and-conditions.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                <ExternalLink size={13} /> {t('settings.termsConditionsLink')}
              </a>
              <a href={`/cookie-storage-notice.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                <ExternalLink size={13} /> {t('settings.cookieNoticeLink')}
              </a>
              <a href={`/pricing.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                <ExternalLink size={13} /> {t('settings.pricingLink')}
              </a>
              <a href={`/refund-policy.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                <ExternalLink size={13} /> {t('settings.refundPolicyLink')}
              </a>
            </div>
          </div>

          <div className="space-y-2.5 text-slate-400 text-sm leading-relaxed mb-3">
            {[
              t('settings.dataBullet2'),
              t('settings.dataBullet4'),
              t('settings.dataBullet5'),
            ].map(line => (
              <p key={line} className="flex items-start gap-2">
                <span className="text-slate-500">-</span>
                <span>{line}</span>
              </p>
            ))}
          </div>

          <div className="rounded-xl border border-navy-600 bg-navy-950/60 p-3 mb-3 space-y-3">
            <div className="text-white text-sm font-display font-semibold">{t('settings.projectBackupsTitle')}</div>
            <p className={settingsSupportCopyClass}>{t('settings.projectBackupsCopy')}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <button onClick={exportAll} className="btn-secondary text-xs justify-center">
                <FolderArchive size={13} /> {t('projects.exportAllProjects')}
              </button>
              <button
                onClick={() => activeProject && exportProject(activeProject.id)}
                disabled={!activeProject}
                className="btn-secondary text-xs justify-center"
              >
                <Download size={13} /> {t('projects.exportCurrentProject')}
              </button>
              <button onClick={() => projectImportRef.current?.click()} className="btn-secondary text-xs justify-center">
                <Upload size={13} /> {importingProjects ? t('projects.importing') : t('projects.importProject')}
              </button>
            </div>
            <input ref={projectImportRef} type="file" accept=".json" className="hidden" onChange={handleProjectImport} />
            {projectTransferMessage && (
              <p className={`text-sm leading-relaxed ${projectTransferMessage.includes('Invalid') || projectTransferMessage.includes('❌') ? 'text-red-400' : 'text-teal-300'}`}>
                {projectTransferMessage}
              </p>
            )}
          </div>

          <button onClick={clearAllData} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm mt-auto">
            <Trash2 size={14} /> {t('settings.clearAllData')}
          </button>
        </div>

        <div className={`${pairedCardClass} border-teal-500/20`}>
          <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
            <Puzzle size={16} className="text-teal-400" /> {t('settings.chromeExtensionTitle')}
          </h3>
          <p className={`${settingsSupportCopyClass} mb-3`}>
            {t('settings.chromeExtensionCopy')}
          </p>
          <div className="rounded-xl border border-navy-600 bg-navy-900/60 p-3 mb-3 space-y-1.5">
            {[
              t('settings.chromeExtensionStep1'),
              t('settings.chromeExtensionStep2'),
              t('settings.chromeExtensionStep3'),
            ].map((step, i) => (
              <div key={step} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                <span className="text-teal-400 font-mono">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 mb-3">
            <p className={`${settingsSupportCopyClass} text-sm leading-relaxed`}>
              {t('settings.chromeExtensionDisclaimer')}
            </p>
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

        <div ref={byokCardRef} className={pairedCardClass}>
          <button
            onClick={() => setShowOwnKey(o => !o)}
            className="w-full flex items-center justify-between gap-3"
            aria-expanded={showOwnKey}
          >
            <span className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <Zap size={15} className="text-teal-400" /> {t('settings.byokTitle')}
            </span>
            {showOwnKey ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          <p className={`${settingsSupportCopyClass} mt-2`}>
            {t('settings.byokCopy')}
          </p>

          {showOwnKey && (
            <div className="mt-4 space-y-3">
              {!secureSignedIn ? (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm leading-relaxed text-yellow-200">
                  {t('settings.byokLocked')}
                </div>
              ) : (
                <>
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
                        className="input-field pr-10 font-mono text-sm"
                        type={showKey ? 'text' : 'password'}
                        placeholder={t('settings.byokApiKeyPlaceholder')}
                        value={form.apiKey}
                        onChange={e => update('apiKey', e.target.value)}
                      />
                      <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed mt-1">{t('settings.byokStoredLocal')}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.byokModel')}</label>
                    <input
                      className="input-field font-mono text-sm"
                      placeholder={t('settings.byokModelPlaceholder')}
                      value={form.model}
                      onChange={e => update('model', e.target.value)}
                    />
                  </div>
                  {form.provider === PROVIDERS.CUSTOM && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1.5 block">{t('settings.byokCustomBaseUrl')}</label>
                      <input
                        className="input-field font-mono text-sm"
                        placeholder="https://..."
                        value={form.customBaseUrl}
                        onChange={e => update('customBaseUrl', e.target.value)}
                      />
                    </div>
                  )}
                  <div className="bg-navy-900 rounded-xl p-3 text-sm text-slate-500 leading-relaxed space-y-1">
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

                  {hasPlanAccess && apiKey && (
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
                      <p className="text-slate-600 text-sm leading-relaxed text-center mt-1">{t('settings.byokSwitchBackNote')}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  )
}

