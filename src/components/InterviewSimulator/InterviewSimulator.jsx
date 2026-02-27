import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { generateId } from '../../utils/helpers'
import ChatWindow from '../shared/ChatWindow'
import VoiceChatBar from '../shared/VoiceChatBar'
import { X, History, Play } from 'lucide-react'
import { useVisuals } from '../../context/VisualsContext'

const MODES = [
  { id: 'hr', label: 'HR Screen', desc: 'Culture fit, motivation, soft skills' },
  { id: 'technical', label: 'Technical Panel', desc: 'Hard skills from JD' },
  { id: 'competency', label: 'Competency-Based', desc: 'Behavioral STAR questions' },
  { id: 'stress', label: 'Stress Interview', desc: "Devil's advocate, pushback" },
]

export default function InterviewSimulator() {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData } = useProject()
  const { triggerConfetti, showToast } = useVisuals()

  const sessions = getProjectData('interviewSessions')
  const resume = getProjectData('resume')
  const persistedJD = getProjectData('currentJD')
  const persistedMode = getProjectData('interviewMode')

  const [view, setView] = useState('setup')
  const [mode, setMode] = useState(persistedMode || 'hr')
  const [jd, setJd] = useState(persistedJD || '')
  const [background, setBackground] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [sessionScore, setSessionScore] = useState(null)
  const abortRef = useRef(null)

  // Stable refs to avoid stale closures in async callbacks
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

  // Persist JD + mode
  useEffect(() => { updateProjectData('interviewMode', mode) }, [mode])
  useEffect(() => {
    const t = setTimeout(() => updateProjectData('currentJD', jd), 600)
    return () => clearTimeout(t)
  }, [jd])

  useEffect(() => {
    const bg = resume || (profile?.currentRole
      ? `${profile.currentRole}, ${profile.experience || ''} experience in ${profile.industry || ''}.`
      : '')
    setBackground(bg)
  }, [resume, profile])

  // Always-save: upsert session after every AI exchange
  const upsertSession = useCallback((msgs, score) => {
    const id = sessionIdRef.current
    if (!id || msgs.filter(m => m.content).length < 2) return
    const currentSessions = sessionsRef.current
    const existing = currentSessions.find(s => s.id === id)
    const sessionData = {
      id,
      date: existing?.date || new Date().toISOString(),
      mode: MODES.find(m2 => m2.id === modeRef.current)?.label || modeRef.current,
      score: score ?? existing?.score ?? null,
      messages: msgs,
      jdSnippet: jdRef.current.slice(0, 100),
      questionCount: questionsAskedRef.current,
    }
    const updated = existing
      ? currentSessions.map(s => s.id === id ? sessionData : s)
      : [...currentSessions, sessionData]
    updateProjectData('interviewSessions', updated)
  }, [updateProjectData])

  function startSession() {
    sessionIdRef.current = generateId()
    setMessages([]); setQuestionsAsked(0); setSessionScore(null)
    setView('chat')
    triggerConfetti()
    showToast("Interview starting — you've got this! 💼")
    beginInterview()
  }

  async function beginInterview() {
    setIsLoading(true)
    try {
      abortRef.current = new AbortController()
      let full = ''
      setMessages([{ role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.interviewSimulator(jd, mode, drillMode, background),
        messages: [{ role: 'user', content: `Start the interview. Ask ${questionCount} questions total.` }],
        temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([{ role: 'assistant', content: acc }]) },
        signal: abortRef.current.signal,
      })
      setMessages([{ role: 'assistant', content: full }])
    } catch (e) {
      if (e.name !== 'AbortError')
        setMessages([{ role: 'assistant', content: 'Failed to start. Check your API settings.' }])
    }
    setIsLoading(false)
  }

  async function sendMessage(text) {
    const txt = text?.trim()
    if (!txt || isLoading) return
    const userMsg = { role: 'user', content: txt }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages); setIsLoading(true)
    setQuestionsAsked(q => q + 1)
    try {
      let full = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])
      abortRef.current = new AbortController()
      await callAI({
        systemPrompt: prompts.interviewSimulator(jdRef.current, modeRef.current, drillMode, background),
        messages: newMessages, temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([...newMessages, { role: 'assistant', content: acc }]) },
        signal: abortRef.current.signal,
      })
      const finalMessages = [...newMessages, { role: 'assistant', content: full }]
      setMessages(finalMessages)
      // Extract score if present in the response (handles decimals like 8.5/10)
      let score = sessionScoreRef.current
      if (full.includes('/10')) {
        const m = full.match(/(\d+(?:\.\d+)?)\/10/)
        if (m) { score = parseFloat(m[1]); setSessionScore(score) }
      }
      upsertSession(finalMessages, score)
    } catch (e) {
      if (e.name !== 'AbortError')
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Error. Please try again.' }])
    }
    setIsLoading(false)
  }

  function handleBack() {
    if (messages.filter(m => m.content).length > 1)
      upsertSession(messages, sessionScoreRef.current)
    abortRef.current?.abort()
    setView('setup')
  }

  // Last AI message for VoiceChatBar TTS
  const lastAiMsg = messages.filter(m => m.role === 'assistant' && m.content).at(-1)?.content || ''

  if (view === 'history') return <SessionHistory sessions={sessions} onBack={() => setView('setup')} />

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Interview Simulator</h2>
          <p className="section-sub">Roleplay with an AI hiring manager.</p>
        </div>
        <button onClick={() => setView('history')} className="btn-ghost">
          <History size={16}/> History ({sessions.length})
        </button>
      </div>

      {/* Mode selector — full width, 4 cols on md+ */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Interview Mode</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`p-3 rounded-xl border text-left transition-all ${mode === m.id
                ? 'bg-teal-500/10 border-teal-500/40 text-white'
                : 'bg-navy-900 border-navy-700 text-slate-400 hover:border-navy-500'}`}>
              <div className="font-body font-semibold text-sm">{m.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2-col: JD left / background + questions + start right */}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">
            Job Description <span className="text-slate-600">(optional but recommended)</span>
          </label>
          <textarea className="textarea-field h-52" placeholder="Paste the job description..."
            value={jd} onChange={e => setJd(e.target.value)} />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">
              Your background {resume && <span className="text-teal-400 text-xs ml-1">← from resume</span>}
            </label>
            <textarea className="textarea-field h-32" placeholder="Describe your experience..."
              value={background} onChange={e => setBackground(e.target.value)} />
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-sm text-slate-400">Questions:</label>
            {[5, 10, 15].map(n => (
              <button key={n} onClick={() => setQuestionCount(n)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${questionCount === n
                  ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                  : 'bg-navy-700 text-slate-400 border-navy-600'}`}>{n}</button>
            ))}
          </div>

          <button onClick={startSession} disabled={!isConnected}
            className="btn-primary w-full justify-center py-3 text-base mt-auto">
            <Play size={18}/> Start Interview
          </button>
          {!isConnected && (
            <p className="text-center text-slate-500 text-xs -mt-2">Configure your API key in Settings first.</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full animate-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between bg-navy-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-sm">👔</div>
          <div>
            <div className="text-white text-sm font-body font-medium">Jordan Mitchell</div>
            <div className="text-slate-500 text-xs">
              {MODES.find(m2 => m2.id === mode)?.label} · {drillMode ? '🔱 Drill' : '🏯 Sensei'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionScore !== null && (
            <span className={`badge ${sessionScore >= 8 ? 'badge-green' : sessionScore >= 6 ? 'badge-yellow' : 'badge-red'}`}>
              {Number.isInteger(sessionScore) ? sessionScore : sessionScore.toFixed(1)}/10
            </span>
          )}
          <button onClick={() => sendMessage('DEBRIEF - Please give me the full session debrief now.')}
            className="btn-ghost text-xs">Debrief</button>
          <button onClick={handleBack} className="btn-ghost text-xs flex items-center gap-1 text-slate-400 hover:text-white">
            <X size={14}/> End
          </button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={isLoading} />

      {/* VoiceChatBar — mic always visible, TTS replay on demand */}
      <div className="p-4 border-t border-navy-700 bg-navy-900">
        <VoiceChatBar
          onSend={sendMessage}
          isLoading={isLoading}
          lastAiMessage={lastAiMsg}
          placeholder="Type your answer… or press 🎙 to speak"
        />
      </div>
    </div>
  )
}

function SessionHistory({ sessions, onBack }) {
  const [selected, setSelected] = useState(null)
  if (selected) return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={() => setSelected(null)} className="btn-ghost mb-4">← History</button>
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
        {selected.messages.filter(m => m.content).map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}>
              <div className="whitespace-pre-wrap text-xs">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4">← Back</button>
      <h2 className="section-title mb-1">Session History</h2>
      <p className="section-sub mb-4">{sessions.length} session{sessions.length !== 1 ? 's' : ''} in this project</p>
      {sessions.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No sessions yet.</div>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map(s => (
            <button key={s.id} onClick={() => setSelected(s)}
              className="card-hover w-full text-left flex items-center justify-between">
              <div>
                <div className="text-white font-body font-medium text-sm">{s.mode}</div>
                <div className="text-slate-500 text-xs">
                  {new Date(s.date).toLocaleDateString()} · {s.questionCount || 0} exchanges
                </div>
              </div>
              {s.score != null
                ? <span className={`font-display font-bold ${s.score >= 8 ? 'text-green-400' : s.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{Number.isInteger(s.score) ? s.score : s.score.toFixed(1)}/10</span>
                : <span className="text-slate-600">—</span>
              }
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
