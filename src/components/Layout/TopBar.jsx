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
  [THEMES.DARK]: 'Dark',
  [THEMES.DAYLIGHT]: 'Daylight',
  [THEMES.MYSPACE]: 'Neon',
}

const SAVE_LAST_RESPONSE_LABEL = 'Save last response to Notes'

const SECTION_TITLES = {
  today: 'Today',
  applications: 'Applications',
  dashboard: 'Dashboard',
  interview: 'Interview Prep',
  gap: 'Gap Analysis',
  learning: 'Learning',
  star: 'STAR Builder',
  tools: 'Prep Tools',
  tracker: 'Applications',
  notes: 'Notes & Workbook',
  settings: 'Settings',
}

const SECTION_HELP = {
  today: {
    title: 'Today',
    desc: 'Your daily command center. Pick one active application and JobSensei shows the next useful move.',
    tips: [],
  },
  applications: {
    title: 'Applications',
    desc: 'Your CRM for job hunting. Each role has its own workspace so research, JD text, notes, tools, and follow-up stay together.',
    tips: [],
  },
  dashboard: {
    title: 'Dashboard',
    desc: 'Your home base. See your stats, daily tips, and quick links to every tool.',
    tips: ['Check your streak and interview count here', 'Quick-jump to any tool from the cards below'],
  },
  interview: {
    title: 'Interview Prep',
    desc: 'Practice interviews, predict likely questions, polish STAR stories, and tighten your follow-up.',
    tips: ['Use the Interview Simulator for full mock sessions', 'Question Predictor and STAR Builder now live under this prep hub', 'Saved prep history still stays inside each tool'],
  },
  gap: {
    title: 'Gap Analysis',
    desc: 'Paste a job description + your background. AI identifies skill gaps and strengths.',
    tips: ['Paste the full JD in the first box', 'Paste your CV/background in the second', 'Get a match score and action plan'],
  },
  learning: {
    title: 'Learning',
    desc: 'Study topics with an AI tutor, then test yourself with quizzes. Spaced repetition keeps reviews smart.',
    tips: [],
  },
  star: {
    title: 'STAR Builder',
    desc: 'Turn rough situation notes into polished STAR (Situation-Task-Action-Result) interview answers.',
    tips: ['Click New Story and describe what happened (rough notes are fine)', 'AI structures it into a full STAR answer', 'Save to your Story Bank, then view or copy anytime'],
  },
  tools: {
    title: 'Prep Tools',
    desc: 'Focused AI tools for the active application: fit checks, resume review, cover letter, LinkedIn, and visual resume feedback.',
    tips: ['Set an active application first for better context', 'Use Visual Review with a vision-capable model', 'Recent results stay saved to project history'],
  },
  tracker: {
    title: 'Applications',
    desc: 'Track every application, open a workspace for each role, and keep one active context flowing through the prep tools.',
    tips: ['Add a new application with the + button', 'Open a card to work on that application in context', 'Set one application active so your prep tools stay aligned'],
  },
  notes: {
    title: 'Notes & Workbook',
    desc: 'A free-form scratchpad for your job search. My Notes is your personal workspace; Company Notes lets you keep notes per company.',
    tips: ['Everything auto-saves as you type', 'Use Company Notes to track research per company', 'Notes are saved per project'],
  },
  settings: {
    title: 'Settings',
    desc: 'Unlock JobSensei, choose hosted AI or BYOK, save your resume, and back up project data.',
    tips: [],
  },
}

const GUIDE_DETAILS = {
  today: ['Active Focus is the current role JobSensei is guiding.', 'Workspace Progress shows the 6-step application path: capture, research, tailor, predict, mock, follow-up.', 'Open the active workspace for research, JD, prep notes, and follow-up.'],
  applications: ['Kanban tracks stages like Researching, Applied, Interviewing, Offer, and Rejected.', 'Workspace is where the JD, research, prep notes, and cheat sheet live for one role.', 'Offers compares roles by salary, growth, culture, work-life, benefits, and flexibility.'],
  dashboard: ['Dashboard is gated until an application exists.', 'Once unlocked, it shows saved interviews, learning progress, active application context, and quick actions.'],
  interview: ['Interview Simulator runs full mock sessions and saves score/history.', 'Question Predictor uses the active JD to generate likely questions.', 'STAR Builder turns rough stories into structured answers.', 'Tone Analyzer checks clarity, confidence, and delivery.', 'Follow-up Email drafts post-interview messages.', 'Elevator Pitch helps answer why you should be hired.'],
  learning: ['Build own topics for the skills the target role expects.', `${SAVE_LAST_RESPONSE_LABEL} stores useful tutor replies in Learning Notes`, 'Click Quiz for a 6-question test on that topic and chat history.', 'Due reviews appear at the top — don\'t skip them!'],
  tools: ['Gap Analysis scores fit against the JD and calls out missing skills.', 'Resume Checker reads the resume through ATS and recruiter lenses.', 'Cover Letter Optimizer creates role-specific versions.', 'LinkedIn Auditor finds profile gaps and quick wins.', 'Visual Design Review checks layout from a screenshot.', 'Transferable Skills Coach reframes experience for a new role.'],
  tracker: ['Use Add for a new role or the browser extension to capture a JD.', 'Open Workspace to work inside one application.', 'Use the Offers tab after a role reaches Offer stage.'],
  settings: ['Connect AI first if tools are locked.', 'Save your resume here so Resume Checker, Cover Letter, and prep tools can reuse it.', 'Export project backups before changing devices or browsers.', 'BYOK still requires an active JobSensei unlock'],
}

function TopBarLanguageSelect({ compact = false, onChangeComplete = null }) {
  const { language, setLanguage, languages } = useLanguage()
  const selectedLanguage = languages.find(option => option.code === language) || languages[0]

  return (
    <label
      className={`language-select-shell relative flex items-center gap-2 rounded-xl border border-navy-600 bg-navy-800/80 text-slate-300 transition-all hover:border-teal-500/40 hover:text-white ${
        compact ? 'w-full px-3 py-2' : 'w-fit px-2.5 py-1.5'
      }`}
      title="Interface language"
    >
      <Languages size={compact ? 14 : 15} className="text-teal-400 flex-shrink-0" />
      <span className="text-xs font-display font-semibold whitespace-nowrap pr-4">
        {selectedLanguage?.nativeLabel}
      </span>
      <ChevronDown size={13} className="absolute right-2 text-current opacity-80 pointer-events-none" />
      <select
        aria-label="Interface language"
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
    title: 'Start with Guide',
    body: 'Use Guide any time you feel lost. It explains the current page and can restart this walkthrough.',
  },
  {
    section: SECTIONS.TODAY,
    target: '[data-guide="today-active-focus"], [data-guide="today-first-application"]',
    title: 'Today shows the next move',
    body: 'This area is the daily command center. Before an application exists, it points you to the first application step.',
  },
  {
    section: SECTIONS.APPLICATIONS,
    target: '[data-guide="applications-add"]',
    title: 'Add the first application',
    body: 'Press Add to create the workspace. Add company, role, and the JD so every tool can use the same context.',
  },
  {
    section: SECTIONS.APPLICATIONS,
    target: '[data-guide="applications-workspace-tab"]',
    title: 'Workspace keeps the role together',
    body: 'Workspace is where you review the JD, research the company, save notes, and generate prep material for one role.',
  },
  {
    section: SECTIONS.APPLICATIONS,
    target: '[data-guide="applications-offers-tab"]',
    title: 'Offers compares final choices',
    body: 'When an application reaches Offer, this tab helps compare salary, growth, culture, work-life, benefits, and flexibility.',
  },
  {
    section: SECTIONS.LEARNING,
    target: '[data-guide="learning-add-topic"]',
    title: 'Learning is the long game',
    body: 'Add topics for the skills each role expects. Study, quiz, and save notes so preparation compounds over time.',
  },
  {
    section: SECTIONS.LEARNING,
    target: '[data-guide="learning-topic-card"], [data-guide="learning-add-topic"]',
    title: 'Study, quiz, repeat',
    body: 'Study opens the tutor. Quiz schedules reviews with spaced repetition, and Notes keeps the useful answers.',
  },
]

function GuidedTour({ onClose }) {
  const { setActiveSection } = useApp()
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const step = GUIDED_TOUR_STEPS[stepIndex]

  useEffect(() => {
    setActiveSection(step.section)

    function updateTarget() {
      const target = document.querySelector(step.target)
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
      <div className="absolute inset-0 bg-navy-950/55 backdrop-blur-[1px]" />
      {targetRect && (
        <div
          className="absolute rounded-2xl border-2 border-teal-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.48),0_0_28px_rgba(45,212,191,0.75)] transition-all duration-200"
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
                Step {stepIndex + 1} of {GUIDED_TOUR_STEPS.length}
              </div>
              <h3 className="font-display font-semibold text-white text-base">{step.title}</h3>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{step.body}</p>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setStepIndex(i => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="btn-ghost text-xs disabled:opacity-40 disabled:pointer-events-none"
            >
              Back
            </button>
            <div className="flex gap-1.5">
              {GUIDED_TOUR_STEPS.map((item, i) => (
                <span
                  key={item.title}
                  className={`w-1.5 h-1.5 rounded-full ${i === stepIndex ? 'bg-teal-300' : 'bg-slate-600'}`}
                />
              ))}
            </div>
            <button
              onClick={() => isLast ? onClose() : setStepIndex(i => i + 1)}
              className="btn-primary text-xs"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TopBar() {
  const { activeSection, setActiveSection, drillMode, setDrillMode, isMuted, setIsMuted } = useApp()
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
  const nextThemeLabel = THEME_LABELS[THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]]

  const help = SECTION_HELP[activeSection]
  const helpDetails = GUIDE_DETAILS[activeSection] || []
  const translatedSectionTitle = activeSection === SECTIONS.TODAY
    ? t('nav.today')
    : activeSection === SECTIONS.APPLICATIONS || activeSection === SECTIONS.TRACKER
      ? t('nav.applications')
      : activeSection === SECTIONS.LEARNING
        ? t('nav.learning')
        : activeSection === SECTIONS.SETTINGS
          ? t('nav.settings')
          : SECTION_TITLES[activeSection] || ''

  useEffect(() => {
    if (guideSeen || !help) return
    const id = setTimeout(() => setShowHelp(true), 700)
    return () => clearTimeout(id)
  }, [guideSeen, help])

  const renderGuideTip = (tip) => {
    const parts = tip.split(SAVE_LAST_RESPONSE_LABEL)
    if (parts.length === 1) return tip
    return parts.map((part, i) => (
      <React.Fragment key={`${part}-${i}`}>
        {part}
        {i < parts.length - 1 && <span className="guide-tip-highlight">{SAVE_LAST_RESPONSE_LABEL}</span>}
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
          <span className="logo-mantra text-xs leading-tight">Be confident. Get hired.</span>
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
            isThinking ? '🧠 AI is thinking…'
            : isConnected ? '🟢 AI connected & ready'
            : '🔴 JobSensei locked — go to Settings'
          )}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isThinking ? 'bg-indigo-400 animate-pulse' : isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={`text-xs font-mono ${isThinking ? 'text-indigo-300' : isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isThinking ? 'AI…' : isConnected ? 'AI' : 'Off'}
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
          title={visualsEnabled ? 'Visuals ON — click to disable' : 'Visuals OFF — click to enable'}
        >
          <Wand2 size={16} />
        </button>

        {/* Theme cycle button — desktop only */}
        <button
          onClick={cycleTheme}
          className="hidden sm:flex btn-ghost"
          title={`Theme: ${THEME_LABELS[theme]} — click to cycle`}
        >
          <ThemeIcon size={16} />
        </button>

        {/* Global mute/unmute toggle — glows teal when AI is speaking */}
        <button
          onClick={() => {
            if (!isMuted) window.speechSynthesis?.cancel()
            const next = !isMuted
            setIsMuted(next)
            showFeedback(next ? '🔇 AI voice muted' : '🔊 AI voice on')
          }}
          className={`btn-ghost relative transition-all ${
            isMuted
              ? 'text-red-400'
              : aiSpeaking
              ? 'text-teal-400 ring-1 ring-teal-500/50 rounded-lg bg-teal-500/10'
              : 'text-slate-400'
          }`}
          title={isMuted ? 'Unmute AI voice' : aiSpeaking ? 'AI is speaking — tap to mute' : 'Mute AI voice'}
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
            showFeedback(next ? '🔱 Drill mode — brutal honesty' : '🏯 Sensei mode — supportive coaching')
          }}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-200 ${
            drillMode
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20'
          }`}
          title={drillMode
            ? 'Drill mode: brutal, honest feedback. Click to switch to Sensei (supportive).'
            : 'Sensei mode: warm, constructive coaching. Click to switch to Drill (brutal honesty).'}
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
            title={`Help: ${SECTION_TITLES[activeSection]}`}
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
            title="More options"
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
                    showFeedback(next ? '✨ Visuals ON' : 'Visuals OFF')
                    setShowMore(false)
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs w-full text-left transition-colors ${visualsEnabled ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 hover:text-white hover:bg-navy-700'}`}
                >
                  <Wand2 size={14} />
                  Visuals: {visualsEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => {
                    cycleTheme()
                    showFeedback(`Theme → ${nextThemeLabel}`)
                    setShowMore(false)
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-navy-700 w-full text-left transition-colors"
                >
                  <ThemeIcon size={14} />
                  Theme: {THEME_LABELS[theme]}
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
            <h3 className="font-display font-semibold text-white text-sm">{help.title}</h3>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-slate-300 -mt-0.5">
              <X size={14} />
            </button>
          </div>
          <p className="text-slate-300 text-xs mb-3 leading-relaxed">{help.desc}</p>
          <div className="guide-start-card rounded-xl border border-navy-600 bg-navy-900/60 p-3 mb-3">
            <div className="text-white text-xs font-display font-semibold mb-2">Get started</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Get started ..
            </p>
            <button onClick={startGuidedTour} className="btn-primary text-xs w-full justify-center">
              Start guided tour
            </button>
          </div>
          {help.tips.length > 0 && (
            <div className="space-y-1">
              {help.tips.map((tip, i) => (
                <p key={i} className="text-slate-400 text-xs">• {renderGuideTip(tip)}</p>
              ))}
            </div>
          )}
          {helpDetails.length > 0 && (
            <div className="guide-details-card mt-3 rounded-xl border border-navy-700 bg-navy-900/45 p-3">
              <div className="text-slate-300 text-xs font-display font-semibold mb-2">How this page works</div>
              <div className="space-y-1">
                {helpDetails.map((detail, i) => (
                  <p key={i} className="text-slate-400 text-xs leading-relaxed">- {renderGuideTip(detail)}</p>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-navy-700 flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={11} />
            <span>Sensei = supportive coaching</span>
            <Zap size={11} className="ml-2" />
            <span>Drill = brutal honesty</span>
          </div>
        </div>
      )}
    </header>
  )
}
