import React, { useState, useRef, useCallback } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useTheme, THEMES } from '../../context/ThemeContext'
import { useVisuals } from '../../context/VisualsContext'
import { Settings, GraduationCap, Zap, Shield, Brain, HelpCircle, X, Volume2, VolumeX, Moon, Sun, Sparkles, Wand2 } from 'lucide-react'

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

const SECTION_TITLES = {
  dashboard: 'Dashboard',
  interview: 'Interview Simulator',
  gap: 'Gap Analysis',
  learning: 'Learning',
  star: 'STAR Builder',
  negotiation: 'Negotiation Simulator',
  tools: 'Tools',
  tracker: 'Job Tracker',
  notes: 'Notes & Workbook',
  settings: 'Settings',
}

const SECTION_HELP = {
  dashboard: {
    title: 'Dashboard',
    desc: 'Your home base. See your stats, daily tips, and quick links to every tool.',
    tips: ['Check your streak and interview count here', 'Quick-jump to any tool from the cards below'],
  },
  interview: {
    title: 'Interview Simulator',
    desc: 'Practice mock interviews with AI. Choose HR, Technical, Competency, or Stress mode.',
    tips: ['Pick an interview type, then click Start', 'Answer out loud or type your response', 'AI gives real-time feedback after each answer'],
  },
  gap: {
    title: 'Gap Analysis',
    desc: 'Paste a job description + your background. AI identifies skill gaps and strengths.',
    tips: ['Paste the full JD in the first box', 'Paste your CV/background in the second', 'Get a match score and action plan'],
  },
  learning: {
    title: 'Learning',
    desc: 'Study topics with an AI tutor, then test yourself with quizzes. Spaced repetition keeps reviews smart.',
    tips: ['Click Study to chat with the AI about a topic', 'Click Quiz for a 5-question test on that topic', 'Due reviews appear at the top — don\'t skip them!'],
  },
  star: {
    title: 'STAR Builder',
    desc: 'Turn rough situation notes into polished STAR (Situation-Task-Action-Result) interview answers.',
    tips: ['Click New Story and describe what happened (rough notes are fine)', 'AI structures it into a full STAR answer', 'Save to your Story Bank, then view or copy anytime'],
  },
  negotiation: {
    title: 'Negotiation Simulator',
    desc: 'Roleplay salary negotiations against an AI hiring manager. Practice countering, anchoring, and closing.',
    tips: ['Enter your target salary and the initial offer', 'Negotiate in real-time chat', 'Get a debrief with tactics you used or missed'],
  },
  tools: {
    title: 'Tools',
    desc: 'Utility tools: salary calculator, resume analyzer, cover letter helper, and more.',
    tips: ['Each tool card is self-contained', 'Results are saved to your project history'],
  },
  tracker: {
    title: 'Job Tracker',
    desc: 'Track every application — status, company notes, next steps — in one place.',
    tips: ['Add a new application with the + button', 'Drag or update status as it progresses', 'Add company-specific notes to stay organized'],
  },
  notes: {
    title: 'Notes & Workbook',
    desc: 'A free-form scratchpad for your job search. My Notes is your personal workspace; Company Notes lets you keep notes per company.',
    tips: ['Everything auto-saves as you type', 'Use Company Notes to track research per company', 'Notes are saved per project'],
  },
  settings: {
    title: 'Settings',
    desc: 'Configure your AI provider (DeepSeek, OpenAI, Claude…), set your profile, and import/export data.',
    tips: ['Paste your API key here to connect AI', 'Your profile info personalises all AI responses', 'Export to back up your data'],
  },
}

export default function TopBar() {
  const { activeSection, setActiveSection, drillMode, setDrillMode, isMuted, setIsMuted } = useApp()
  const { isConnected, isThinking } = useAI()
  const { theme, cycleTheme } = useTheme()
  const { enabled: visualsEnabled, setEnabled: setVisualsEnabled, triggerConfetti } = useVisuals()
  const [showHelp, setShowHelp] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const feedbackTimer = useRef(null)
  const ThemeIcon = THEME_ICONS[theme]

  const showFeedback = useCallback((msg) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setFeedback(msg)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800)
  }, [])

  const help = SECTION_HELP[activeSection]

  return (
    <header className="bg-navy-900 border-b border-navy-700 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 relative">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
          <GraduationCap size={14} className="text-white" />
        </div>
        <span className="font-display font-bold text-white">JobSensei</span>
      </div>

      {/* Desktop title */}
      <h1 className="hidden md:block font-display font-semibold text-white text-lg">
        {SECTION_TITLES[activeSection] || ''}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Mobile: compact AI status dot — tap for details */}
        <button
          className="flex sm:hidden items-center gap-1 px-2 py-1 rounded-lg bg-navy-800 border border-navy-700"
          onClick={() => showFeedback(
            isThinking ? '🧠 AI is thinking…'
            : isConnected ? '🟢 AI connected & ready'
            : '🔴 No API key — go to Settings'
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
            Thinking…
          </div>
        ) : (
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {isConnected ? 'AI Connected' : 'No API Key'}
          </div>
        )}

        {/* Visuals toggle — desktop only */}
        <button
          onClick={() => {
            const next = !visualsEnabled
            setVisualsEnabled(next)
            if (next) triggerConfetti(70)
          }}
          className={`hidden sm:flex btn-ghost ${visualsEnabled ? 'text-yellow-400' : 'text-slate-400'}`}
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

        {/* Global mute/unmute toggle */}
        <button
          onClick={() => {
            if (!isMuted) window.speechSynthesis?.cancel()
            const next = !isMuted
            setIsMuted(next)
            showFeedback(next ? '🔇 AI voice muted' : '🔊 AI voice on')
          }}
          className={`btn-ghost ${isMuted ? 'text-red-400' : 'text-slate-400'}`}
          title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
          <span className="hidden sm:inline">{drillMode ? 'Drill 🔱' : 'Sensei'}</span>
        </button>

        {/* Help button */}
        {help && (
          <button
            onClick={() => setShowHelp(v => !v)}
            className="btn-ghost relative"
            title={`Help: ${SECTION_TITLES[activeSection]}`}
          >
            <HelpCircle size={16} className={showHelp ? 'text-teal-400' : ''} />
          </button>
        )}

        <button
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
        <div className="absolute right-4 top-full mt-2 z-50 w-80 bg-navy-800 border border-navy-600 rounded-2xl shadow-xl p-4 animate-in">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display font-semibold text-white text-sm">{help.title}</h3>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-slate-300 -mt-0.5">
              <X size={14} />
            </button>
          </div>
          <p className="text-slate-300 text-xs mb-3 leading-relaxed">{help.desc}</p>
          <div className="space-y-1">
            {help.tips.map((tip, i) => (
              <p key={i} className="text-slate-400 text-xs">• {tip}</p>
            ))}
          </div>
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
