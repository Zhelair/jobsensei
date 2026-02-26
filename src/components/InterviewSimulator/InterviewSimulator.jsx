import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useVoice } from '../../hooks/useVoice'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import ChatWindow from '../shared/ChatWindow'
import { Mic, MicOff, Send, RotateCcw, History, Play, Volume2, VolumeX } from 'lucide-react'
import { generateId } from '../../utils/helpers'

const MODES = [
  { id: 'hr', label: 'HR Screen', desc: 'Culture fit, motivation, soft skills' },
  { id: 'technical', label: 'Technical Panel', desc: 'Hard skills from JD' },
  { id: 'competency', label: 'Competency-Based', desc: 'Behavioral STAR questions' },
  { id: 'stress', label: 'Stress Interview', desc: "Devil's advocate, pushback" },
]

export default function InterviewSimulator() {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const { isListening, startListening, stopListening, speak, isSpeaking, stopSpeaking, supported: voiceSupported } = useVoice()
  const { getProjectData, updateProjectData } = useProject()

  const sessions = getProjectData('interviewSessions')
  const resume = getProjectData('resume')
  const persistedJD = getProjectData('currentJD')
  const persistedMode = getProjectData('interviewMode')

  const [view, setView] = useState('setup')
  const [mode, setMode] = useState(persistedMode || 'hr')
  const [jd, setJd] = useState(persistedJD || '')
  const [background, setBackground] = useState('')

  // Persist JD and mode changes
  useEffect(() => {
    const t = setTimeout(() => updateProjectData('currentJD', jd), 600)
    return () => clearTimeout(t)
  }, [jd])
  useEffect(() => { updateProjectData('interviewMode', mode) }, [mode])
  const [questionCount, setQuestionCount] = useState(10)
  const [voiceMode, setVoiceMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [sessionScore, setSessionScore] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    const bg = resume || (profile?.currentRole ? `${profile.currentRole}, ${profile.experience || ''} experience in ${profile.industry || ''}.` : '')
    setBackground(bg)
  }, [resume, profile])

  function startSession() {
    setMessages([]); setQuestionsAsked(0); setSessionScore(null)
    setView('chat')
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
      if (ttsEnabled) speak(full)
    } catch (e) {
      if (e.name !== 'AbortError') setMessages([{ role: 'assistant', content: 'Failed to start. Check your API settings.' }])
    }
    setIsLoading(false)
  }

  async function sendMessage(text) {
    const txt = text?.trim()
    if (!txt || isLoading) return
    const userMsg = { role: 'user', content: txt }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages); setInput(''); setInterimText('')
    setQuestionsAsked(q => q + 1); setIsLoading(true)
    try {
      let full = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])
      abortRef.current = new AbortController()
      await callAI({
        systemPrompt: prompts.interviewSimulator(jd, mode, drillMode, background),
        messages: newMessages, temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([...newMessages, { role: 'assistant', content: acc }]) },
        signal: abortRef.current.signal,
      })
      const finalMessages = [...newMessages, { role: 'assistant', content: full }]
      setMessages(finalMessages)
      if (ttsEnabled) speak(full)
      if (full.includes('/10')) {
        const m = full.match(/(\d+)\/10/)
        if (m) { const score = parseInt(m[1]); setSessionScore(score); saveSession(finalMessages, score) }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setMessages(prev => [...prev.slice(0,-1), { role: 'assistant', content: 'Error. Please try again.' }])
    }
    setIsLoading(false)
  }

  function saveSession(msgs, score) {
    const session = { id: generateId(), date: new Date().toISOString(), mode: MODES.find(m2=>m2.id===mode)?.label||mode, score, messages: msgs, jdSnippet: jd.slice(0,100), questionCount: questionsAsked }
    updateProjectData('interviewSessions', [...sessions, session])
  }

  function handleVoice() {
    if (isListening) { stopListening(); return }
    startListening(
      (final) => { setInput(final); setInterimText('') },
      (interim) => setInterimText(interim)
    )
  }

  if (view === 'history') return <SessionHistory sessions={sessions} onBack={() => setView('setup')} />

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Interview Simulator</h2>
          <p className="section-sub">Roleplay with an AI hiring manager.</p>
        </div>
        <button onClick={() => setView('history')} className="btn-ghost"><History size={16}/> History ({sessions.length})</button>
      </div>
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Interview Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`p-3 rounded-xl border text-left transition-all ${mode===m.id ? 'bg-teal-500/10 border-teal-500/40 text-white' : 'bg-navy-900 border-navy-700 text-slate-400 hover:border-navy-500'}`}>
              <div className="font-body font-semibold text-sm">{m.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Job Description <span className="text-slate-600">(optional but recommended)</span></label>
        <textarea className="textarea-field h-28" placeholder="Paste the job description..." value={jd} onChange={e=>setJd(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Your background {resume && <span className="text-teal-400 text-xs ml-1">← from resume</span>}</label>
        <textarea className="textarea-field h-20" placeholder="Describe your experience..." value={background} onChange={e=>setBackground(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Questions:</label>
          {[5,10,15].map(n=>(
            <button key={n} onClick={()=>setQuestionCount(n)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${questionCount===n?'bg-teal-500/20 text-teal-400 border-teal-500/30':'bg-navy-700 text-slate-400 border-navy-600'}`}>{n}</button>
          ))}
        </div>
        {voiceSupported && (
          <button onClick={()=>setVoiceMode(!voiceMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${voiceMode?'bg-teal-500/20 text-teal-400 border-teal-500/30':'bg-navy-700 text-slate-400 border-navy-600'}`}>
            <Mic size={14}/> {voiceMode?'Voice ON':'Voice OFF'}
          </button>
        )}
      </div>
      <button onClick={startSession} disabled={!isConnected} className="btn-primary w-full justify-center py-3 text-base">
        <Play size={18}/> Start Interview
      </button>
      {!isConnected && <p className="text-center text-slate-500 text-xs">Configure your API key in Settings first.</p>}
    </div>
  )

  return (
    <div className="flex flex-col h-full animate-in">
      <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between bg-navy-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center text-sm">👔</div>
          <div>
            <div className="text-white text-sm font-body font-medium">Jordan Mitchell</div>
            <div className="text-slate-500 text-xs">{MODES.find(m2=>m2.id===mode)?.label} · {drillMode?'🔱 Drill':'🏯 Sensei'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionScore!==null && <span className={`badge ${sessionScore>=8?'badge-green':sessionScore>=6?'badge-yellow':'badge-red'}`}>{sessionScore}/10</span>}
          <button onClick={()=>sendMessage('DEBRIEF - Please give me the full session debrief now.')} className="btn-ghost text-xs">Debrief</button>
          <button onClick={()=>setView('setup')} className="btn-ghost"><RotateCcw size={14}/></button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={isLoading} />

      <div className="p-4 border-t border-navy-700 bg-navy-900 space-y-2">
        {isListening && interimText && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2 text-teal-300 text-xs italic">
            🎙 {interimText}
          </div>
        )}
        <div className="flex gap-2">
          {(voiceMode && voiceSupported) && (
            <button onClick={handleVoice}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening?'bg-red-500 text-white animate-pulse':'bg-navy-700 text-slate-400 hover:text-teal-400'}`}
              title={isListening?'Stop':'Speak answer'}>
              {isListening?<MicOff size={16}/>:<Mic size={16}/>}
            </button>
          )}
          <button onClick={()=>{if(isSpeaking){stopSpeaking();setTtsEnabled(false)}else setTtsEnabled(!ttsEnabled)}}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ttsEnabled||isSpeaking?'bg-teal-500/20 text-teal-400':'bg-navy-700 text-slate-500 hover:text-slate-300'}`}
            title={ttsEnabled?'Disable voice':'Enable interviewer voice'}>
            {ttsEnabled||isSpeaking?<Volume2 size={16}/>:<VolumeX size={16}/>}
          </button>
          <textarea
            className="textarea-field flex-1 py-2.5 resize-none min-h-[40px] max-h-32"
            placeholder={isListening?'🎙 Listening...':'Type your answer... (Enter to send, Shift+Enter for new line)'}
            value={isListening ? interimText : input}
            onChange={e => !isListening && setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(isListening?interimText:input)}}}
            rows={1}
            readOnly={isListening}
          />
          <button onClick={()=>sendMessage(isListening?interimText:input)}
            disabled={(!input.trim()&&!interimText.trim())||isLoading}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center">
            <Send size={16} className="text-navy-900"/>
          </button>
        </div>
        {isListening && <p className="text-teal-400 text-xs text-center">Speak now — press Enter or Send when done</p>}
      </div>
    </div>
  )
}

function SessionHistory({ sessions, onBack }) {
  const [selected, setSelected] = useState(null)
  if (selected) return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={()=>setSelected(null)} className="btn-ghost mb-4">← History</button>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-display font-bold text-white">{selected.mode}</span>
        <span className="text-slate-400 text-sm">{new Date(selected.date).toLocaleDateString()}</span>
        {selected.score && <span className={`badge ${selected.score>=8?'badge-green':selected.score>=6?'badge-yellow':'badge-red'}`}>{selected.score}/10</span>}
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {selected.messages.filter(m=>m.content).map((msg,i)=>(
          <div key={i} className={`flex gap-2 ${msg.role==='user'?'flex-row-reverse':''}`}>
            <div className={msg.role==='user'?'chat-user':'chat-ai'}><div className="whitespace-pre-wrap text-xs">{msg.content}</div></div>
          </div>
        ))}
      </div>
    </div>
  )
  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4">← Back</button>
      <h2 className="section-title mb-1">Session History</h2>
      <p className="section-sub mb-4">{sessions.length} session{sessions.length!==1?'s':''} in this project</p>
      {sessions.length===0 ? (
        <div className="card text-center py-10 text-slate-500">No sessions yet.</div>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map(s=>(
            <button key={s.id} onClick={()=>setSelected(s)} className="card-hover w-full text-left flex items-center justify-between">
              <div>
                <div className="text-white font-body font-medium text-sm">{s.mode}</div>
                <div className="text-slate-500 text-xs">{new Date(s.date).toLocaleDateString()}</div>
              </div>
              {s.score ? <span className={`font-display font-bold ${s.score>=8?'text-green-400':s.score>=6?'text-yellow-400':'text-red-400'}`}>{s.score}/10</span> : <span className="text-slate-600">—</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
