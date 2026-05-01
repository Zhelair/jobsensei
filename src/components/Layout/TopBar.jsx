import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useTheme, THEMES } from '../../context/ThemeContext'
import { useVisuals } from '../../context/VisualsContext'
import { useLanguage } from '../../context/LanguageContext'
import { Settings, Zap, Shield, Brain, HelpCircle, X, Volume2, VolumeX, Moon, Sun, Sparkles, Wand2, MoreHorizontal, Languages, ChevronDown } from 'lucide-react'
import BrandMark from '../shared/BrandMark'

const THEME_ICONS = {
  [THEMES.DARK]: Moon,
  [THEMES.DAYLIGHT]: Sun,
  [THEMES.MYSPACE]: Sparkles,
}

const THEME_LABELS = {
  [THEMES.DARK]: 'topbar.theme.dark',
  [THEMES.DAYLIGHT]: 'topbar.theme.daylight',
  [THEMES.MYSPACE]: 'topbar.theme.neon',
}

const SAVE_LAST_RESPONSE_KEY = 'guide.learning.saveLastResponseLabel'

const SECTION_TITLES = {
  today: 'nav.today',
  applications: 'nav.applications',
  dashboard: 'guide.dashboard.title',
  interview: 'guide.interview.title',
  gap: 'guide.gap.title',
  learning: 'nav.learning',
  star: 'guide.star.title',
  tools: 'guide.tools.title',
  tracker: 'nav.applications',
  notes: 'guide.notes.title',
  settings: 'nav.settings',
}

const SECTION_HELP = {
  today: {
    titleKey: 'guide.today.title',
    descKey: 'guide.today.desc',
    tipKeys: [],
  },
  applications: {
    titleKey: 'guide.applications.title',
    descKey: 'guide.applications.desc',
    tipKeys: [],
  },
  dashboard: {
    titleKey: 'guide.dashboard.title',
    descKey: 'guide.dashboard.desc',
    tipKeys: ['guide.dashboard.tip.streak', 'guide.dashboard.tip.quickJump'],
  },
  interview: {
    titleKey: 'guide.interview.title',
    descKey: 'guide.interview.desc',
    tipKeys: ['guide.interview.tip.simulator', 'guide.interview.tip.hub', 'guide.interview.tip.history'],
  },
  gap: {
    titleKey: 'guide.gap.title',
    descKey: 'guide.gap.desc',
    tipKeys: ['guide.gap.tip.jd', 'guide.gap.tip.cv', 'guide.gap.tip.score'],
  },
  learning: {
    titleKey: 'guide.learning.title',
    descKey: 'guide.learning.desc',
    tipKeys: [],
  },
  star: {
    titleKey: 'guide.star.title',
    descKey: 'guide.star.desc',
    tipKeys: ['guide.star.tip.newStory', 'guide.star.tip.structure', 'guide.star.tip.save'],
  },
  tools: {
    titleKey: 'guide.tools.title',
    descKey: 'guide.tools.desc',
    tipKeys: ['guide.tools.tip.activeApplication', 'guide.tools.tip.visualReview', 'guide.tools.tip.history'],
  },
  tracker: {
    titleKey: 'guide.tracker.title',
    descKey: 'guide.tracker.desc',
    tipKeys: ['guide.tracker.tip.add', 'guide.tracker.tip.openCard', 'guide.tracker.tip.active'],
  },
  notes: {
    titleKey: 'guide.notes.title',
    descKey: 'guide.notes.desc',
    tipKeys: ['guide.notes.tip.autosave', 'guide.notes.tip.companyNotes', 'guide.notes.tip.project'],
  },
  settings: {
    titleKey: 'guide.settings.title',
    descKey: 'guide.settings.desc',
    tipKeys: [],
  },
}

const GUIDE_DETAILS = {
  today: ['guide.today.detail.activeFocus', 'guide.today.detail.progress', 'guide.today.detail.workspace'],
  applications: ['guide.applications.detail.kanban', 'guide.applications.detail.workspace', 'guide.applications.detail.offers'],
  dashboard: ['guide.dashboard.detail.gated', 'guide.dashboard.detail.unlocked'],
  interview: ['guide.interview.detail.simulator', 'guide.interview.detail.predictor', 'guide.interview.detail.star', 'guide.interview.detail.tone', 'guide.interview.detail.followUp', 'guide.interview.detail.pitch'],
  learning: ['guide.learning.detail.topics', 'guide.learning.detail.saveNotes', 'guide.learning.detail.quiz', 'guide.learning.detail.reviews'],
  tools: ['guide.tools.detail.gap', 'guide.tools.detail.resume', 'guide.tools.detail.coverLetter', 'guide.tools.detail.linkedin', 'guide.tools.detail.visual', 'guide.tools.detail.transferable'],
  tracker: ['guide.tracker.detail.add', 'guide.tracker.detail.workspace', 'guide.tracker.detail.offers'],
  settings: ['guide.settings.detail.connect', 'guide.settings.detail.resume', 'guide.settings.detail.backups', 'guide.settings.detail.byok'],
}

function TopBarLanguageSelect({ compact = false, onChangeComplete = null }) {
  const { language, setLanguage, languages, t } = useLanguage()
  const selectedLanguage = languages.find(option => option.code === language) || languages[0]

  return (
    <label
      className={`language-select-shell relative flex items-center gap-2 rounded-xl border border-navy-600 bg-navy-800/80 text-slate-300 transition-all hover:border-teal-500/40 hover:text-white ${
        compact ? 'w-full px-3 py-2' : 'w-fit px-2.5 py-1.5'
      }`}
      title={t('settings.interfaceLanguage')}
    >
      <Languages size={compact ? 14 : 15} className="text-teal-400 flex-shrink-0" />
      <span className="text-xs font-display font-semibold whitespace-nowrap pr-4">
        {selectedLanguage?.nativeLabel}
      </span>
      <ChevronDown size={13} className="absolute right-2 text-current opacity-80 pointer-events-none" />
      <select
        aria-label={t('settings.interfaceLanguage')}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        value={language}
        onChange={e => {
          setLanguage(e.target.value)
          onChangeComplete?.()
        }}
      >
        {languages.map(option => (
          <option key={option.code} value={option.code} className="bg-navy-900 text-white">
            {option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

const GUIDED_TOUR_STEPS = [
  {
    section: SECTIONS.TODAY,
    target: '[data-guide="guide-button"]',
    titleKey: 'tour.guide.title',
    bodyKey: 'tour.guide.body',
  },
  {
    section: SECTIONS.TODAY,
    target: '[data-guide="today-active-focus"], [data-guide="today-first-application"]',
    titleKey: 'tour.today.title',
    bodyKey: 'tour.today.body',
  },
  {
    section: SECTIONS.APPLICATIONS,
    target: '[data-guide="applications-add"]',
    titleKey: 'tour.addApplication.title',
    bodyKey: 'tour.addApplication.body',
  },
  {
    section: SECTIONS.APPLICATIONS,
    target: '[data-guide="applications-workspace-tab"]',
    titleKey: 'tour.workspace.title',
    bodyKey: 'tour.workspace.body',
  },
  {
    section: SECTIONS.APPLICATIONS,
    target: '[data-guide="applications-offers-tab"]',
    titleKey: 'tour.offers.title',
    bodyKey: 'tour.offers.body',
  },
  {
    section: SECTIONS.LEARNING,
    target: '[data-guide="learning-add-topic"]',
    titleKey: 'tour.learning.title',
    bodyKey: 'tour.learning.body',
  },
  {
    section: SECTIONS.TODAY,
    target: '[data-guide="project-new"], [data-guide="project-switcher"]',
    titleKey: 'tour.projects.title',
    bodyKey: 'tour.projects.body',
    openProjectMenu: true,
  },
]

function GuidedTour({ onClose }) {
  const { setActiveSection } = useApp()
  const { t } = useLanguage()
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const step = GUIDED_TOUR_STEPS[stepIndex]

  useEffect(() => {
    setActiveSection(step.section)
    if (step.openProjectMenu) {
      window.dispatchEvent(new CustomEvent('jobsensei:open-project-menu'))
    }

    function updateTarget() {
      const target = Array.from(document.querySelectorAll(step.target))
        .find(el => {
          const rect = el.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
      if (!target) {
        setTargetRect(null)
        return
      }
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
      const rect = target.getBoundingClientRect()
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }

    const first = setTimeout(updateTarget, 120)
    const second = setTimeout(updateTarget, 420)
    window.addEventListener('resize', updateTarget)
    return () => {
      clearTimeout(first)
      clearTimeout(second)
      window.removeEventListener('resize', updateTarget)
    }
  }, [step, setActiveSection])

  const isLast = stepIndex === GUIDED_TOUR_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {targetRect && (
        <div
          className="absolute rounded-2xl border-2 border-teal-300 shadow-[0_0_28px_rgba(45,212,191,0.75)] transition-all duration-200"
          style={{
            top: Math.max(8, targetRect.top - 8),
            left: Math.max(8, targetRect.left - 8),
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}
      <div className="absolute left-4 right-4 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-[380px] pointer-events-auto">
        <div className="card border-teal-500/35 bg-navy-800 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-teal-300 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">
                {t('tour.stepCounter', { current: stepIndex + 1, total: GUIDED_TOUR_STEPS.length })}
              </div>
              <h3 className="font-display font-semibold text-white text-base">{t(step.titleKey)}</h3>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{t(step.bodyKey)}</p>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setStepIndex(i => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="btn-ghost text-xs disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('tour.back')}
            </button>
            <div className="flex gap-1.5">
              {GUIDED_TOUR_STEPS.map((item, i) => (
                <span
                  key={item.titleKey}
                  className={`w-1.5 h-1.5 rounded-full ${i === stepIndex ? 'bg-teal-300' : 'bg-slate-600'}`}
                />
              ))}
            </div>
            <button
              onClick={() => isLast ? onClose() : setStepIndex(i => i + 1)}
              className="btn-primary text-xs"
            >
              {isLast ? t('tour.finish') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TopBar() {
  const { activeSection, setActiveSection, drillMode, setDrillMode, isMuted, setIsMuted, showOnboarding } = useApp()
  const { isConnected, isThinking } = useAI()
  const { theme, cycleTheme } = useTheme()
  const { enabled: visualsEnabled, setEnabled: setVisualsEnabled, triggerConfetti } = useVisuals()
  const { t } = useLanguage()
  const [showHelp, setShowHelp] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [guideSeen, setGuideSeen] = useState(() => localStorage.getItem('js_guide_seen') === 'true')
  const [showTour, setShowTour] = useState(false)
  const feedbackTimer = useRef(null)
  const ThemeIcon = THEME_ICONS[theme]

  const showFeedback = useCallback((msg) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setFeedback(msg)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800)
  }, [])

  // Poll the Web Speech API to know when AI is speaking (shared across hook instances)
  useEffect(() => {
    const id = setInterval(() => {
      setAiSpeaking(window.speechSynthesis?.speaking || false)
    }, 150)
    return () => clearInterval(id)
  }, [])

  const THEME_ORDER = [THEMES.DARK, THEMES.DAYLIGHT, THEMES.MYSPACE]
  const currentThemeLabel = t(THEME_LABELS[theme])
  const nextThemeLabel = t(THEME_LABELS[THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]])

  const help = SECTION_HELP[activeSection]
  const helpDetails = GUIDE_DETAILS[activeSection] || []
  const helpTitle = help ? t(help.titleKey) : ''
  const helpDesc = help ? t(help.descKey) : ''
  const helpTips = help?.tipKeys?.map(key => t(key)) || []
  const translatedSectionTitle = activeSection === SECTIONS.TODAY
    ? t('nav.today')
    : activeSection === SECTIONS.APPLICATIONS || activeSection === SECTIONS.TRACKER
      ? t('nav.applications')
      : activeSection === SECTIONS.LEARNING
        ? t('nav.learning')
        : activeSection === SECTIONS.SETTINGS
          ? t('nav.settings')
          : t(SECTION_TITLES[activeSection] || '') || ''

  useEffect(() => {
    if (showOnboarding || guideSeen || !help) return
    const id = setTimeout(() => setShowHelp(true), 700)
    return () => clearTimeout(id)
  }, [guideSeen, help, showOnboarding])

  useEffect(() => {
    if (!showOnboarding) return
    setShowHelp(false)
    setShowTour(false)
  }, [showOnboarding])

  const renderGuideTip = (tip) => {
    const saveLastResponseLabel = t(SAVE_LAST_RESPONSE_KEY)
    const parts = tip.split(saveLastResponseLabel)
    if (parts.length === 1) return tip
    return parts.map((part, i) => (
      <React.Fragment key={`${part}-${i}`}>
        {part}
        {i < parts.length - 1 && <span className="guide-tip-highlight">{saveLastResponseLabel}</span>}
      </React.Fragment>
    ))
  }

  const openGuide = () => {
    setShowHelp(v => !v)
    if (!guideSeen) {
      localStorage.setItem('js_guide_seen', 'true')
      setGuideSeen(true)
    }
  }

  const startGuidedTour = () => {
    localStorage.setItem('js_guide_seen', 'true')
    setGuideSeen(true)
    setShowHelp(false)
    setShowTour(true)
  }

  const closeGuidedTour = () => {
    localStorage.setItem('js_guide_seen', 'true')
    setGuideSeen(true)
    setShowTour(false)
  }

  return (
    <header className="bg-navy-900 border-b border-navy-700 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 relative">
      {showTour && <GuidedTour onClose={closeGuidedTour} />}
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <BrandMark className="w-8 h-8" />
        <div className="flex flex-col gap-0.5">
          <span className="font-display font-bold text-white text-base leading-tight tracking-tight">JobSensei</span>
          <span className="logo-mantra text-xs leading-tight">{t('brand.tagline')}</span>
        </div>
      </div>

      {/* Desktop title */}
      <h1 className="hidden md:block font-display font-semibold text-white text-lg">
        {translatedSectionTitle}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden sm:block">
          <TopBarLanguageSelect />
        </div>

        {/* Mobile: compact AI status dot — tap for details */}
        <button
          className="flex sm:hidden items-center gap-1 px-2 py-1 rounded-lg bg-navy-800 border border-navy-700"
          onClick={() => showFeedback(
            isThinking ? t('topbar.aiMobileThinking')
            : isConnected ? t('topbar.aiMobileReady')
            : t('topbar.aiMobileLocked')
          )}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isThinking ? 'bg-indigo-400 animate-pulse' : isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={`text-xs font-mono ${isThinking ? 'text-indigo-300' : isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isThinking ? t('topbar.aiCompactThinking') : isConnected ? t('topbar.aiCompactConnected') : t('topbar.aiCompactOff')}
          </span>
        </button>

        {/* Desktop: full AI status indicator */}
        {isThinking ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-500/10 text-indigo-300 animate-pulse">
            <Brain size={13} className="animate-pulse" />
            {t('topbar.thinking')}
          </div>
        ) : (
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {isConnected ? t('topbar.aiConnected') : t('topbar.locked')}
          </div>
        )}

        {/* Visuals toggle — desktop only */}
        <button
          onClick={() => {
            const next = !visualsEnabled
            setVisualsEnabled(next)
            if (next) triggerConfetti(70)
          }}
          className={`hidden sm:flex btn-ghost ${visualsEnabled ? 'visuals-active ring-1 ring-current' : 'text-slate-400'}`}
          title={visualsEnabled ? t('topbar.visualsOnTitle') : t('topbar.visualsOffTitle')}
        >
          <Wand2 size={16} />
        </button>

        {/* Theme cycle button — desktop only */}
        <button
          onClick={cycleTheme}
          className="hidden sm:flex btn-ghost"
          title={t('topbar.themeCycleTitle', { current: currentThemeLabel })}
        >
          <ThemeIcon size={16} />
        </button>

        {/* Global mute/unmute toggle — glows teal when AI is speaking */}
        <button
          onClick={() => {
            if (!isMuted) window.speechSynthesis?.cancel()
            const next = !isMuted
            setIsMuted(next)
            showFeedback(next ? t('topbar.voiceMutedFeedback') : t('topbar.voiceOnFeedback'))
          }}
          className={`btn-ghost relative transition-all ${
            isMuted
              ? 'text-red-400'
              : aiSpeaking
              ? 'text-teal-400 ring-1 ring-teal-500/50 rounded-lg bg-teal-500/10'
              : 'text-slate-400'
          }`}
          title={isMuted ? t('topbar.voiceUnmuteTitle') : aiSpeaking ? t('topbar.voiceSpeakingTitle') : t('topbar.voiceMuteTitle')}
        >
          {aiSpeaking && !isMuted && (
            <span className="absolute inset-0 rounded-lg animate-pulse bg-teal-400/10" />
          )}
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className={aiSpeaking ? 'animate-pulse' : ''} />}
        </button>

        {/* Sensei / Drill mode toggle */}
        <button
          onClick={() => {
            const next = !drillMode
            setDrillMode(next)
            showFeedback(next ? t('topbar.modeDrillFeedback') : t('topbar.modeSenseiFeedback'))
          }}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-200 ${
            drillMode
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20'
          }`}
          title={drillMode ? t('topbar.modeDrillTitle') : t('topbar.modeSenseiTitle')}
        >
          {drillMode ? <Zap size={12} /> : <Shield size={12} />}
          <span className="hidden sm:inline">{drillMode ? t('topbar.drill') : t('topbar.sensei')}</span>
        </button>

        {/* Help button — desktop only (mobile users access via ⋯ menu) */}
        {help && (
          <button
            data-guide="guide-button"
            onClick={openGuide}
            className={`hidden sm:flex btn-ghost relative ${!guideSeen ? 'ring-1 ring-teal-500/40 text-teal-300' : ''}`}
            title={t('guide.helpTitle', { section: helpTitle || SECTION_TITLES[activeSection] || '' })}
          >
            <HelpCircle size={16} className={showHelp ? 'text-teal-400' : ''} />
            <span className="text-xs">{t('topbar.guide')}</span>
            {!guideSeen && (
              <span className="absolute -top-2 -right-2 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-navy-950">
                {t('topbar.start')}
              </span>
            )}
          </button>
        )}

        {/* Mobile ⋯ overflow menu — Theme, Visuals, Help */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setShowMore(v => !v)}
            className={`btn-ghost text-base leading-none ${showMore ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
            title={t('topbar.moreOptions')}
          >
            <MoreHorizontal size={18} />
          </button>
          {showMore && (
            <>
              {/* Backdrop to close on outside tap */}
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="absolute right-0 top-full mt-1.5 bg-navy-800 border border-navy-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 min-w-[190px]">
                <TopBarLanguageSelect compact onChangeComplete={() => setShowMore(false)} />
                <button
                  onClick={() => {
                    const next = !visualsEnabled
                    setVisualsEnabled(next)
                    if (next) triggerConfetti(70)
                    showFeedback(next ? t('topbar.visualsFeedbackOn') : t('topbar.visualsFeedbackOff'))
                    setShowMore(false)
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs w-full text-left transition-colors ${visualsEnabled ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 hover:text-white hover:bg-navy-700'}`}
                >
                  <Wand2 size={14} />
                  {t('topbar.visualsMenu')}: {visualsEnabled ? t('common.on') : t('common.off')}
                </button>
                <button
                  onClick={() => {
                    cycleTheme()
                    showFeedback(t('topbar.themeFeedback', { theme: nextThemeLabel }))
                    setShowMore(false)
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-navy-700 w-full text-left transition-colors"
                >
                  <ThemeIcon size={14} />
                  {t('topbar.themeMenu')}: {currentThemeLabel}
                </button>
                {help && (
                  <button
                    onClick={() => { openGuide(); setShowMore(false) }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs w-full text-left transition-colors ${showHelp ? 'text-teal-400 bg-teal-500/10' : 'text-slate-400 hover:text-white hover:bg-navy-700'}`}
                  >
                    <HelpCircle size={14} />
                    {t('topbar.guide')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <button
          data-guide="settings-button"
          onClick={() => setActiveSection(SECTIONS.SETTINGS)}
          className="btn-ghost"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Mobile button feedback toast */}
      {feedback && (
        <div className="absolute right-4 top-full mt-1.5 px-3 py-1.5 bg-navy-700 border border-navy-600 rounded-xl text-xs text-white shadow-xl z-50 pointer-events-none whitespace-nowrap animate-in">
          {feedback}
        </div>
      )}

      {/* Help popover */}
      {showHelp && help && (
        <div className="guide-popover absolute right-4 top-full mt-2 z-50 w-80 bg-navy-800 border border-navy-600 rounded-2xl shadow-xl p-4 animate-in">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display font-semibold text-white text-sm">{helpTitle}</h3>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-slate-300 -mt-0.5">
              <X size={14} />
            </button>
          </div>
          <p className="text-slate-300 text-xs mb-3 leading-relaxed">{helpDesc}</p>
          <div className="guide-start-card rounded-xl border border-navy-600 bg-navy-900/60 p-3 mb-3">
            <div className="text-white text-xs font-display font-semibold mb-2">{t('guide.getStarted')}</div>
            <button onClick={startGuidedTour} className="btn-primary text-xs w-full justify-center">
              {t('guide.startTour')}
            </button>
          </div>
          {helpTips.length > 0 && (
            <div className="space-y-1">
              {helpTips.map((tip, i) => (
                <p key={i} className="text-slate-400 text-xs">• {renderGuideTip(tip)}</p>
              ))}
            </div>
          )}
          {helpDetails.length > 0 && (
            <div className="guide-details-card mt-3 rounded-xl border border-navy-700 bg-navy-900/45 p-3">
              <div className="text-slate-300 text-xs font-display font-semibold mb-2">{t('guide.howThisPageWorks')}</div>
              <div className="space-y-1">
                {helpDetails.map((detailKey) => (
                  <p key={detailKey} className="text-slate-400 text-xs leading-relaxed">- {renderGuideTip(t(detailKey))}</p>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-navy-700 flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={11} />
            <span>{t('guide.footer.sensei')}</span>
            <Zap size={11} className="ml-2" />
            <span>{t('guide.footer.drill')}</span>
          </div>
        </div>
      )}
    </header>
  )
}
