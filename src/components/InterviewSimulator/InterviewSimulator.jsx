import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { generateId } from '../../utils/helpers'
import ChatWindow from '../shared/ChatWindow'
import VoiceChatBar from '../shared/VoiceChatBar'
import { X, History, Play, ArrowLeft } from 'lucide-react'
import { useVisuals } from '../../context/VisualsContext'
import { useLanguage } from '../../context/LanguageContext'

function buildModes(t) {
  return [
    { id: 'hr', label: t('interview.modes.hr.label'), desc: t('interview.modes.hr.desc') },
    { id: 'technical', label: t('interview.modes.technical.label'), desc: t('interview.modes.technical.desc') },
    { id: 'competency', label: t('interview.modes.competency.label'), desc: t('interview.modes.competency.desc') },
    { id: 'stress', label: t('interview.modes.stress.label'), desc: t('interview.modes.stress.desc') },
  ]
}

export default function InterviewSimulator({ onExit = null, hubLabel = 'Interview Prep' }) {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData, activeApplication } = useProject()
  const { triggerConfetti, showToast } = useVisuals()
  const { language, t } = useLanguage()

  const modes = useMemo(() => buildModes(t), [t])
  const sessions = getProjectData('interviewSessions')
  const resume = getProjectData('resume')
  const persistedJD = getProjectData('currentJD')
  const activeContextJD = activeApplication ? (activeApplication.jdText || '') : persistedJD
  const persistedMode = getProjectData('interviewMode')

  const [view, setView] = useState('setup')
  const [mode, setMode] = useState(persistedMode || 'hr')
  const [jd, setJd] = useState(activeContextJD || '')
  const [background, setBackground] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [sessionScore, setSessionScore] = useState(null)
  const abortRef = useRef(null)

  const sessionIdRef = useRef(null)
  const sessionsRef = useRef(sessions)
  const modeRef = useRef(mode)
  const jdRef = useRef(jd)
  const questionsAskedRef = useRef(questionsAsked)
  const sessionScoreRef = useRef(sessionScore)

  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { jdRef.current = jd }, [jd])
  useEffect(() => { questionsAskedRef.current = questionsAsked }, [questionsAsked])
  useEffect(() => { sessionScoreRef.current = sessionScore }, [sessionScore])

  useEffect(() => {
    setJd(activeContextJD || '')
  }, [activeApplication?.id, activeContextJD])

  useEffect(() => { updateProjectData('interviewMode', mode) }, [mode, updateProjectData])

  useEffect(() => {
    if (activeApplication?.id) return
    const timeoutId = setTimeout(() => updateProjectData('currentJD', jd), 600)
    return () => clearTimeout(timeoutId)
  }, [jd, activeApplication?.id, updateProjectData])

  useEffect(() => {
    const nextBackground = resume || (
      profile?.currentRole
        ? `${profile.currentRole}, ${profile.experience || ''} experience in ${profile.industry || ''}.`
        : ''
    )
    setBackground(nextBackground)
  }, [resume, profile])

  const upsertSession = useCallback((msgs, score) => {
    const id = sessionIdRef.current
    if (!id || msgs.filter(message => message.content).length < 2) return
    const currentSessions = sessionsRef.current
    const existing = currentSessions.find(session => session.id === id)
    const currentMode = modes.find(entry => entry.id === modeRef.current)
    const sessionData = {
      id,
      date: existing?.date || new Date().toISOString(),
      mode: currentMode?.label || modeRef.current,
      score: score ?? existing?.score ?? null,
      messages: msgs,
      jdSnippet: jdRef.current.slice(0, 100),
      questionCount: questionsAskedRef.current,
      applicationId: activeApplication?.id || existing?.applicationId || null,
      applicationLabel: activeApplication
        ? `${activeApplication.company}${activeApplication.role ? ` - ${activeApplication.role}` : ''}`
        : existing?.applicationLabel || null,
    }
    const updated = existing
      ? currentSessions.map(session => (session.id === id ? sessionData : session))
      : [...currentSessions, sessionData]
    updateProjectData('interviewSessions', updated)
  }, [activeApplication, modes, updateProjectData])

  function startSession() {
    sessionIdRef.current = generateId()
    setMessages([])
    setQuestionsAsked(0)
    setSessionScore(null)
    setView('chat')
    triggerConfetti()
    showToast(t('interview.startingToast'))
    beginInterview()
  }

  async function beginInterview() {
    setIsLoading(true)
    try {
      abortRef.current = new AbortController()
      let full = ''
      setMessages([{ role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.interviewSimulator(jd, mode, drillMode, background, language),
        messages: [{ role: 'user', content: `Start the interview. Ask ${questionCount} questions total.` }],
        temperature: 0.8,
        onChunk: (_, acc) => {
          full = acc
          setMessages([{ role: 'assistant', content: acc }])
        },
        signal: abortRef.current.signal,
      })
      setMessages([{ role: 'assistant', content: full }])
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages([{ role: 'assistant', content: t('interview.startError') }])
      }
    }
    setIsLoading(false)
  }

  async function sendMessage(text) {
    const trimmed = text?.trim()
    if (!trimmed || isLoading) return
    const userMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setIsLoading(true)
    setQuestionsAsked(count => count + 1)

    try {
      let full = ''
      setMessages([...nextMessages, { role: 'assistant', content: '' }])
      abortRef.current = new AbortController()
      await callAI({
        systemPrompt: prompts.interviewSimulator(jdRef.current, modeRef.current, drillMode, background, language),
        messages: nextMessages,
        temperature: 0.8,
        onChunk: (_, acc) => {
          full = acc
          setMessages([...nextMessages, { role: 'assistant', content: acc }])
        },
        signal: abortRef.current.signal,
      })
      const finalMessages = [...nextMessages, { role: 'assistant', content: full }]
      setMessages(finalMessages)

      let score = sessionScoreRef.current
      if (full.includes('/10')) {
        const match = full.match(/(\d+(?:\.\d+)?)\/10/)
        if (match) {
          score = parseFloat(match[1])
          setSessionScore(score)
        }
      }
      upsertSession(finalMessages, score)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: t('interview.responseError') }])
      }
    }

    setIsLoading(false)
  }

  function handleBack() {
    if (messages.filter(message => message.content).length > 1) {
      upsertSession(messages, sessionScoreRef.current)
    }
    abortRef.current?.abort()
    setView('setup')
  }

  const currentMode = modes.find(entry => entry.id === mode)
  const lastAiMsg = messages.filter(message => message.role === 'assistant' && message.content).at(-1)?.content || ''

  if (view === 'history') {
    return (
      <div className="overflow-y-auto h-full">
        <SessionHistory sessions={sessions} onBack={() => setView('setup')} t={t} />
      </div>
    )
  }

  if (view === 'setup') {
    return (
      <div className="overflow-y-auto h-full">
        <div className="interview-setup-shell p-4 md:p-6 space-y-5 animate-in">
          {onExit && (
            <button onClick={onExit} className="btn-ghost">
              <ArrowLeft size={16} /> {hubLabel}
            </button>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">{t('interview.title')}</h2>
              <p className="section-sub">{t('interview.subtitle')}</p>
            </div>
            <button onClick={() => setView('history')} className="btn-ghost">
              <History size={16} /> {t('interview.historyButton', { count: sessions.length })}
            </button>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">{t('interview.modeLabel')}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {modes.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setMode(entry.id)}
                  className={`interview-mode-card ${mode === entry.id
                    ? 'bg-teal-500/10 border-teal-500/40 text-white'
                    : 'bg-navy-900 border-navy-700 text-slate-400 hover:border-navy-500'}`}
                >
                  <div className="font-body font-semibold text-sm lg:text-base">{entry.label}</div>
                  <div className="text-xs lg:text-sm mt-1 opacity-70 leading-relaxed">{entry.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {activeApplication && (
            <div className="card border-teal-500/20 bg-teal-500/5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-white text-sm font-display font-semibold">{t('interview.activeJobContext')}</div>
                  <div className="text-teal-300 text-sm">
                    {activeApplication.company}{activeApplication.role ? ` - ${activeApplication.role}` : ''}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    {activeContextJD.trim() ? t('interview.activeJobWithJd') : t('interview.activeJobNoJd')}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${activeContextJD.trim() ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
                  {activeContextJD.trim() ? t('applications.badges.jdAttached') : t('applications.badges.noJd')}
                </span>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                {t('applications.fields.jobDescription')} <span className="text-slate-600">({t('interview.optionalRecommended')})</span>
              </label>
              <textarea
                className="textarea-field h-52 lg:h-64"
                placeholder={t('interview.jdPlaceholder')}
                value={jd}
                onChange={event => setJd(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  {t('interview.backgroundLabel')} {resume && <span className="text-teal-400 text-xs ml-1">{t('interview.fromResume')}</span>}
                </label>
                <textarea
                  className="textarea-field h-32 lg:h-40"
                  placeholder={t('interview.backgroundPlaceholder')}
                  value={background}
                  onChange={event => setBackground(event.target.value)}
                />
              </div>

              <div className="flex gap-2.5 items-center flex-wrap">
                <label className="text-sm text-slate-400">{t('interview.questionsLabel')}</label>
                {[5, 10, 15].map(count => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`tool-choice-pill ${questionCount === count
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                      : 'bg-navy-700 text-slate-400 border-navy-600 hover:border-slate-500'}`}
                  >
                    {count}
                  </button>
                ))}
              </div>

              <button onClick={startSession} disabled={!isConnected} className="btn-primary w-full justify-center py-3 lg:py-4 text-base lg:text-lg mt-auto">
                <Play size={18} /> {t('interview.startButton')}
              </button>
              {!isConnected && (
                <p className="text-center text-slate-500 text-xs -mt-2">{t('interview.connectAiFirst')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-in">
      <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between bg-navy-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-sm">{t('interview.interviewerAvatar')}</div>
          <div>
            <div className="text-white text-sm font-body font-medium">{t('interview.interviewerName')}</div>
            <div className="text-slate-500 text-xs">
              {currentMode?.label} · {drillMode ? t('topbar.drill') : t('topbar.sensei')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionScore !== null && (
            <span className={`badge ${sessionScore >= 8 ? 'badge-green' : sessionScore >= 6 ? 'badge-yellow' : 'badge-red'}`}>
              {Number.isInteger(sessionScore) ? sessionScore : sessionScore.toFixed(1)}/10
            </span>
          )}
          <button
            onClick={() => sendMessage('DEBRIEF - Please give me the full session debrief now.')}
            className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-display font-semibold text-teal-300 transition-all hover:bg-teal-500/20 hover:text-white"
          >
            {t('interview.debrief')}
          </button>
          <button onClick={handleBack} className="btn-ghost text-xs flex items-center gap-1 text-slate-400 hover:text-white">
            <X size={14} /> {t('interview.end')}
          </button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={isLoading} />

      <div className="p-4 border-t border-navy-700 bg-navy-900">
        <VoiceChatBar
          onSend={sendMessage}
          isLoading={isLoading}
          lastAiMessage={lastAiMsg}
          placeholder={t('interview.answerPlaceholder')}
        />
      </div>
    </div>
  )
}

function SessionHistory({ sessions, onBack, t }) {
  const [selected, setSelected] = useState(null)

  if (selected) {
    return (
      <div className="p-4 md:p-6 animate-in">
        <button onClick={() => setSelected(null)} className="btn-ghost mb-4">
          <ArrowLeft size={16} /> {t('interview.history')}
        </button>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display font-bold text-white">{selected.mode}</span>
          <span className="text-slate-400 text-sm">{new Date(selected.date).toLocaleDateString()}</span>
          {selected.score != null && (
            <span className={`badge ${selected.score >= 8 ? 'badge-green' : selected.score >= 6 ? 'badge-yellow' : 'badge-red'}`}>
              {Number.isInteger(selected.score) ? selected.score : selected.score.toFixed(1)}/10
            </span>
          )}
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {selected.messages.filter(message => message.content).map((message, index) => (
            <div key={index} className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={message.role === 'user' ? 'chat-user' : 'chat-ai'}>
                <div className="whitespace-pre-wrap text-xs">{message.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4">
        <ArrowLeft size={16} /> {t('tour.back')}
      </button>
      <h2 className="section-title mb-1">{t('interview.sessionHistory')}</h2>
      <p className="section-sub mb-4">{t('interview.historyCount', { count: sessions.length })}</p>
      {sessions.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">{t('interview.noSessions')}</div>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map(session => (
            <button key={session.id} onClick={() => setSelected(session)} className="card-hover w-full text-left flex items-center justify-between">
              <div>
                <div className="text-white font-body font-medium text-sm">{session.mode}</div>
                <div className="text-slate-500 text-xs">
                  {new Date(session.date).toLocaleDateString()} · {t('interview.exchangesCount', { count: session.questionCount || 0 })}
                </div>
              </div>
              {session.score != null
                ? <span className={`font-display font-bold ${session.score >= 8 ? 'text-green-400' : session.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{Number.isInteger(session.score) ? session.score : session.score.toFixed(1)}/10</span>
                : <span className="text-slate-600">-</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
