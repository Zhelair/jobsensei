import React, { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useVoice } from '../../hooks/useVoice'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { prompts } from '../../utils/prompts'
import ChatWindow from '../shared/ChatWindow'
import { Mic, MicOff, Send, RotateCcw, History, Play, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react'
import { generateId } from '../../utils/helpers'

const MODES = [
  { id: 'hr', label: 'HR Screen', desc: 'Culture fit, motivation, soft skills' },
  { id: 'technical', label: 'Technical Panel', desc: 'Hard skills from JD' },
  { id: 'competency', label: 'Competency-Based', desc: 'Behavioral STAR questions' },
  { id: 'stress', label: 'Stress Interview', desc: 'Devil\'s advocate, pushback' },
]

export default function InterviewSimulator() {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const { isListening, startListening, stopListening, speak, isSpeaking, stopSpeaking, supported: voiceSupported } = useVoice()
  const [sessions, setSessions] = useLocalStorage('js_interview_sessions', [])

  const [view, setView] = useState('setup') // setup | chat | history
  const [mode, setMode] = useState('hr')
  const [jd, setJd] = useState('')
  const [background, setBackground] = useState(profile?.currentRole ? `I am a ${profile.currentRole} with ${profile.experience || 'several years'} of experience in ${profile.industry || 'my field'}.` : '')
  const [questionCount, setQuestionCount] = useState(10)
  const [voiceMode, setVoiceMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [sessionScore, setSessionScore] = useState(null)
  const [showSetup, setShowSetup] = useState(false)

  const abortRef = useRef(null)

  function startSession() {
    setMessages([])
    setQuestionsAsked(0)
    setSessionScore(null)
    setView('chat')
    beginInterview()
  }

  async function beginInterview() {
    setIsLoading(true)
    const systemPrompt = prompts.interviewSimulator(jd, mode, drillMode, background)
    const newMessages = []

    try {
      abortRef.current = new AbortController()
      let full = ''
      setMessages([{ role: 'assistant', content: '' }])

      await callAI({
        systemPrompt,
        messages: [{ role: 'user', content: `Start the interview. Ask ${questionCount} questions total.` }],
        temperature: 0.8,
        onChunk: (delta, accumulated) => {
          full = accumulated
          setMessages([{ role: 'assistant', content: accumulated }])
        },
        signal: abortRef.current.signal,
      })

      setMessages([{ role: 'assistant', content: full }])
      if (ttsEnabled) speak(full)
    } catch (e) {
      if (e.name !== 'AbortError') setMessages([{ role: 'assistant', content: 'Failed to start. Check your API settings.' }])
    }
    setIsLoading(false)
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setQuestionsAsked(q => q + 1)
    setIsLoading(true)

    const systemPrompt = prompts.interviewSimulator(jd, mode, drillMode, background)

    try {
      let full = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])
      abortRef.current = new AbortController()

      await callAI({
        systemPrompt,
        messages: newMessages,
        temperature: 0.8,
        onChunk: (delta, accumulated) => {
          full = accumulated
          setMessages([...newMessages, { role: 'assistant', content: accumulated }])
        },
        signal: abortRef.current.signal,
      })

      const finalMessages = [...newMessages, { role: 'assistant', content: full }]
      setMessages(finalMessages)
      if (ttsEnabled) speak(full)

      // Auto-detect if interview is done and extract score
      if (full.toLowerCase().includes('debrief') || full.includes('/10') || questionsAsked >= questionCount - 1) {
        const scoreMatch = full.match(/(\d+)\/10/)
        if (scoreMatch) {
          const score = parseInt(scoreMatch[1])
          setSessionScore(score)
          saveSession(finalMessages, score)
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Error generating response. Please try again.' }])
      }
    }
    setIsLoading(false)
  }

  function requestDebrief() {
    sendMessage('DEBRIEF - Please give me the full session debrief now.')
  }

  function saveSession(msgs, score) {
    const session = {
      id: generateId(),
      date: new Date().toISOString(),
      mode: MODES.find(m2 => m2.id === mode)?.label || mode,
      score,
      messages: msgs,
      jdSnippet: jd.slice(0, 100),
      questionCount: questionsAsked,
    }
    setSessions(prev => [...prev, session])
  }

  function handleVoiceInput() {
    if (isListening) {
      stopListening()
    } else {
      startListening((transcript) => {
        setInput(transcript)
      })
    }
  }

  if (view === 'history') return <SessionHistory sessions={sessions} onBack={() => setView('setup')} />

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Interview Simulator</h2>
          <p className="section-sub">Roleplay a real interview with an AI hiring manager.</p>
        </div>
        <button onClick={() => setView('history')} className="btn-ghost">
          <History size={16} /> History
        </button>
      </div>

      {/* Mode selection */}
      <div>
        <label className="text-sm text-slate-400 font-body mb-2 block">Interview Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                mode === m.id
                  ? 'bg-teal-500/10 border-teal-500/40 text-white'
                  : 'bg-navy-900 border-navy-700 text-slate-400 hover:border-navy-500'
              }`}
            >
              <div className="font-body font-semibold text-sm">{m.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* JD */}
      <div>
        <label className="text-sm text-slate-400 font-body mb-1.5 block">Job Description <span className="text-slate-600">(optional but recommended)</span></label>
        <textarea className="textarea-field h-28" placeholder="Paste the job description here..." value={jd} onChange={e => setJd(e.target.value)} />
      </div>

      {/* Background */}
      <div>
        <label className="text-sm text-slate-400 font-body mb-1.5 block">Your background summary</label>
        <textarea className="textarea-field h-20" placeholder="Briefly describe your experience..." value={background} onChange={e => setBackground(e.target.value)} />
      </div>

      {/* Options row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Questions:</label>
          {[5, 10, 15].map(n => (
            <button key={n} onClick={() => setQuestionCount(n)}
              className={`px-3 py-1.5 rounded-lg text-sm font-body transition-all ${questionCount === n ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-700 text-slate-400 border border-navy-600'}`}>
              {n}
            </button>
          ))}
        </div>
        {voiceSupported && (
          <button onClick={() => setVoiceMode(!voiceMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body border transition-all ${voiceMode ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-navy-700 text-slate-400 border-navy-600'}`}>
            <Mic size={14} /> Voice
          </button>
        )}
      </div>

      <button onClick={startSession} disabled={!isConnected} className="btn-primary w-full justify-center py-3 text-base">
        <Play size={18} /> Start Interview
      </button>

      {!isConnected && <p className="text-center text-slate-500 text-xs">Configure your API key in Settings first.</p>}
    </div>
  )

  // Chat view
  return (
    <div className="flex flex-col h-full animate-in">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between bg-navy-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-sm">
            👔
          </div>
          <div>
            <div className="text-white text-sm font-body font-medium">Jordan Mitchell</div>
            <div className="text-slate-500 text-xs">{MODES.find(m2 => m2.id === mode)?.label} · {drillMode ? '🔱 Drill Mode' : '🏯 Sensei Mode'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionScore !== null && (
            <span className={`badge ${sessionScore >= 8 ? 'badge-green' : sessionScore >= 6 ? 'badge-yellow' : 'badge-red'}`}>
              Score: {sessionScore}/10
            </span>
          )}
          <button onClick={requestDebrief} className="btn-ghost text-xs">Get Debrief</button>
          <button onClick={() => setView('setup')} className="btn-ghost text-xs"><RotateCcw size={14} /></button>
        </div>
      </div>

      {/* Messages */}
      <ChatWindow messages={messages} isLoading={isLoading} emptyText="Starting your interview..." />

      {/* Input */}
      <div className="p-4 border-t border-navy-700 bg-navy-900">
        <div className="flex gap-2">
          {(voiceMode && voiceSupported) && (
            <button
              onClick={handleVoiceInput}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-navy-700 text-slate-400 hover:text-white'}`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          {ttsEnabled ? (
            <button onClick={() => { stopSpeaking(); setTtsEnabled(false) }} className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Volume2 size={16} />
            </button>
          ) : (
            <button onClick={() => setTtsEnabled(true)} className="flex-shrink-0 w-10 h-10 rounded-xl bg-navy-700 text-slate-500 hover:text-slate-300 flex items-center justify-center">
              <VolumeX size={16} />
            </button>
          )}
          <textarea
            className="textarea-field flex-1 h-10 py-2.5 resize-none"
            placeholder={isListening ? 'Listening...' : 'Type your answer...'}
            value={isListening ? input : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            rows={1}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center transition-all"
          >
            <Send size={16} className="text-navy-900" />
          </button>
        </div>
        {isListening && <p className="text-teal-400 text-xs mt-1.5 text-center">🎙 Listening — speak your answer</p>}
      </div>
    </div>
  )
}

function SessionHistory({ sessions, onBack }) {
  const [selected, setSelected] = useState(null)

  if (selected) return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={() => setSelected(null)} className="btn-ghost mb-4">← Back to History</button>
      <div className="flex items-center gap-3 mb-4">
        <span className="section-title text-base">{selected.mode} Interview</span>
        <span className="text-slate-400 text-sm">{new Date(selected.date).toLocaleDateString()}</span>
        {selected.score && <span className={`badge ${selected.score >= 8 ? 'badge-green' : selected.score >= 6 ? 'badge-yellow' : 'badge-red'}`}>{selected.score}/10</span>}
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
      <button onClick={onBack} className="btn-ghost mb-4">← Back to Setup</button>
      <h2 className="section-title mb-1">Session History</h2>
      <p className="section-sub mb-4">{sessions.length} session{sessions.length !== 1 ? 's' : ''} completed</p>
      {sessions.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No sessions yet. Start your first mock interview!</div>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map(s => (
            <button key={s.id} onClick={() => setSelected(s)} className="card-hover w-full text-left flex items-center justify-between">
              <div>
                <div className="text-white font-body font-medium text-sm">{s.mode} Interview</div>
                <div className="text-slate-500 text-xs mt-0.5">{new Date(s.date).toLocaleDateString()} · {s.questionCount || '?'} questions</div>
              </div>
              {s.score ? (
                <span className={`font-display font-bold ${s.score >= 8 ? 'text-green-400' : s.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{s.score}/10</span>
              ) : <span className="text-slate-600 text-sm">No score</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
