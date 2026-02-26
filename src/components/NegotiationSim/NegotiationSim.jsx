import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useVoice } from '../../hooks/useVoice'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import ChatWindow from '../shared/ChatWindow'
import { generateId } from '../../utils/helpers'
import { DollarSign, Play, RotateCcw, Send, Mic, MicOff, Volume2, VolumeX, History, AlertCircle } from 'lucide-react'

export default function NegotiationSim() {
  const { drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const {
    isListening, startListening, stopListening,
    speak, isSpeaking, stopSpeaking,
    supported: voiceSupported, error: voiceError, clearError: clearVoiceError
  } = useVoice()
  const { getProjectData, updateProjectData } = useProject()

  const sessions = getProjectData('negotiationSessions')

  const [view, setView] = useState('setup')
  const [offerDetails, setOfferDetails] = useState('')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  // Stable refs to avoid stale closures
  const sessionIdRef = useRef(null)
  const voiceModeRef = useRef(voiceMode)
  const sessionsRef = useRef(sessions)
  const offerDetailsRef = useRef(offerDetails)

  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { offerDetailsRef.current = offerDetails }, [offerDetails])

  // Toggle voice mode — also auto-enables TTS for hands-free conversation
  function toggleVoiceMode() {
    const next = !voiceMode
    setVoiceMode(next)
    if (next) {
      setTtsEnabled(true)
    } else {
      setTtsEnabled(false)
      stopSpeaking()
      stopListening()
    }
  }

  // Upsert session into history
  const upsertSession = useCallback((msgs, coachingTriggered = false) => {
    const id = sessionIdRef.current
    if (!id || msgs.filter(m => m.content).length < 2) return
    const currentSessions = sessionsRef.current
    const existing = currentSessions.find(s => s.id === id)
    const sessionData = {
      id,
      date: existing?.date || new Date().toISOString(),
      offerDetails: offerDetailsRef.current.slice(0, 120),
      messages: msgs,
      coachingTriggered: coachingTriggered || existing?.coachingTriggered || false,
    }
    const updated = existing
      ? currentSessions.map(s => s.id === id ? sessionData : s)
      : [...currentSessions, sessionData]
    updateProjectData('negotiationSessions', updated)
  }, [updateProjectData])

  const sendMessageRef = useRef(null)

  function sendMessageFromVoice(text) {
    sendMessageRef.current && sendMessageRef.current(text)
  }

  const autoListenAfterSpeak = useCallback(() => {
    if (!voiceModeRef.current || !voiceSupported) return
    startListening(
      (final) => { if (final.trim()) sendMessageFromVoice(final) },
      (interim) => setInterimText(interim)
    )
  }, [voiceSupported, startListening])

  async function startNegotiation() {
    sessionIdRef.current = generateId()
    setMessages([]); setView('chat'); setLoading(true)
    try {
      let full = ''
      setMessages([{ role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.negotiationSim(offerDetails, context, drillMode),
        messages: [{ role: 'user', content: 'Start the call.' }], temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([{ role: 'assistant', content: acc }]) },
      })
      setMessages([{ role: 'assistant', content: full }])
      if (ttsEnabled) speak(full, autoListenAfterSpeak)
    } catch {}
    setLoading(false)
  }

  async function sendMessage(text) {
    const txt = text?.trim(); if (!txt || loading) return
    const isCoaching = txt.includes('END NEGOTIATION')
    const userMsg = { role: 'user', content: txt }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setInput(''); setInterimText(''); setLoading(true)
    try {
      let full = ''
      setMessages([...newMsgs, { role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.negotiationSim(offerDetailsRef.current, context, drillMode),
        messages: newMsgs, temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([...newMsgs, { role: 'assistant', content: acc }]) },
      })
      const finalMsgs = [...newMsgs, { role: 'assistant', content: full }]
      setMessages(finalMsgs)
      upsertSession(finalMsgs, isCoaching)
      if (ttsEnabled) speak(full, autoListenAfterSpeak)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { sendMessageRef.current = sendMessage })

  function handleVoice() {
    if (isListening) { stopListening(); return }
    clearVoiceError()
    startListening(
      (final) => { if (final.trim()) sendMessage(final) },
      (interim) => setInterimText(interim)
    )
  }

  function handleBack() {
    if (messages.filter(m => m.content).length > 1) upsertSession(messages)
    stopSpeaking(); stopListening()
    setView('setup')
  }

  if (view === 'history') return <NegotiationHistory sessions={sessions} onBack={() => setView('setup')} />

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="section-title">Salary Negotiation Simulator</h2>
        <button onClick={() => setView('history')} className="btn-ghost"><History size={16}/> History ({sessions.length})</button>
      </div>
      <p className="section-sub mb-5">Roleplay the offer call and practice negotiating.</p>

      <div className="card mb-5 border-indigo-500/20 bg-indigo-500/5">
        <h3 className="font-display font-semibold text-indigo-400 text-sm mb-3">📚 Negotiation Tactics</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {[['BATNA','Know your Best Alternative before you start'],['Anchoring','Name a high number first to set the range'],['Silence','After asking, stay quiet — next person to speak loses'],['Bracketing','Make target the midpoint between ask and offer'],['Total Package','Negotiate benefits, equity, title too'],['Market Data','Reference Glassdoor/LinkedIn to depersonalize the ask']].map(([t,d])=>(
            <div key={t} className="bg-navy-800 rounded-lg p-2">
              <div className="text-indigo-400 font-semibold mb-0.5">{t}</div>
              <div className="text-slate-400">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Offer details</label>
          <textarea className="textarea-field h-24" placeholder="e.g. Role: Senior Compliance Analyst, Salary: €55,000, Location: Sofia, 20 days PTO" value={offerDetails} onChange={e => setOfferDetails(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Your context <span className="text-slate-600">(optional)</span></label>
          <textarea className="textarea-field h-16" placeholder="e.g. Market rate is €60-65k, I have a competing offer at €58k, walk-away is €52k" value={context} onChange={e => setContext(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {voiceSupported && (
          <button onClick={toggleVoiceMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${voiceMode ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-navy-700 text-slate-400 border-navy-600'}`}>
            <Mic size={14} /> {voiceMode ? 'Voice ON — hands-free' : 'Voice OFF'}
          </button>
        )}
      </div>
      {voiceMode && (
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl px-3 py-2 text-teal-300 text-xs mb-4">
          🎙 Hands-free mode: AI will speak and automatically listen for your reply.
        </div>
      )}

      <button onClick={startNegotiation} disabled={!isConnected || !offerDetails.trim()} className="btn-primary w-full justify-center py-3">
        <Play size={18}/> Start Negotiation
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full animate-in">
      <div className="px-4 py-3 border-b border-navy-700 bg-navy-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-sm">💼</div>
          <div>
            <div className="text-white text-sm font-body font-medium">Alex Chen</div>
            <div className="text-slate-500 text-xs">Talent Acquisition Partner</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => sendMessage('END NEGOTIATION')} className="btn-ghost text-xs text-yellow-400 hover:text-yellow-300">Get Coaching</button>
          <button onClick={handleBack} className="btn-ghost"><RotateCcw size={14}/></button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={loading} emptyText="Starting the call..." />

      <div className="p-4 border-t border-navy-700 bg-navy-900 space-y-2">
        {voiceError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={14}/> {voiceError}
          </div>
        )}
        {isListening && interimText && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2 text-teal-300 text-xs italic">🎙 {interimText}</div>
        )}
        <div className="flex gap-2">
          {(voiceMode && voiceSupported) && (
            <button onClick={handleVoice}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-navy-700 text-slate-400 hover:text-teal-400'}`}>
              {isListening ? <MicOff size={16}/> : <Mic size={16}/>}
            </button>
          )}
          <button onClick={() => { if (isSpeaking) { stopSpeaking(); if(voiceMode) stopListening() } else setTtsEnabled(!ttsEnabled) }}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ttsEnabled || isSpeaking ? 'bg-teal-500/20 text-teal-400' : 'bg-navy-700 text-slate-500 hover:text-slate-300'}`}>
            {ttsEnabled || isSpeaking ? <Volume2 size={16}/> : <VolumeX size={16}/>}
          </button>
          <input className="input-field flex-1"
            placeholder={isListening ? '🎙 Listening...' : 'Your response...'}
            value={isListening ? interimText : input}
            onChange={e => !isListening && setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !isListening) { e.preventDefault(); sendMessage(input) } }}
            readOnly={isListening}
          />
          <button onClick={() => sendMessage(isListening ? interimText : input)} disabled={(!input.trim() && !interimText.trim()) || loading}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center">
            <Send size={16} className="text-navy-900"/>
          </button>
        </div>
        {isListening && <p className="text-teal-400 text-xs text-center animate-pulse">🎙 Listening… speak your response</p>}
        {isSpeaking && voiceMode && <p className="text-indigo-400 text-xs text-center">AI is speaking — listening next…</p>}
      </div>
    </div>
  )
}

function NegotiationHistory({ sessions, onBack }) {
  const [selected, setSelected] = useState(null)
  if (selected) return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={() => setSelected(null)} className="btn-ghost mb-4">← History</button>
      <div className="flex items-center gap-3 mb-1">
        <span className="font-display font-bold text-white">Negotiation Session</span>
        <span className="text-slate-400 text-sm">{new Date(selected.date).toLocaleDateString()}</span>
        {selected.coachingTriggered && <span className="badge badge-teal">Coached</span>}
      </div>
      <p className="text-slate-500 text-xs mb-4">{selected.offerDetails}</p>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {selected.messages.filter(m => m.content).map((msg, i) => (
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
      <h2 className="section-title mb-1">Negotiation History</h2>
      <p className="section-sub mb-4">{sessions.length} session{sessions.length!==1?'s':''} in this project</p>
      {sessions.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No sessions yet.</div>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map(s => (
            <button key={s.id} onClick={() => setSelected(s)} className="card-hover w-full text-left flex items-center justify-between">
              <div>
                <div className="text-white font-body font-medium text-sm truncate max-w-xs">{s.offerDetails || 'Negotiation'}</div>
                <div className="text-slate-500 text-xs">{new Date(s.date).toLocaleDateString()} · {s.messages.filter(m=>m.content).length} exchanges</div>
              </div>
              {s.coachingTriggered ? <span className="badge badge-teal text-xs">Coached</span> : <span className="text-slate-600 text-xs">—</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
