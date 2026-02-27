import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { generateId } from '../../utils/helpers'
import ChatWindow from '../shared/ChatWindow'
import VoiceChatBar from '../shared/VoiceChatBar'
import { Play, X, History, ArrowLeft } from 'lucide-react'
import { useVisuals } from '../../context/VisualsContext'

export default function NegotiationSim({ onBack, embedded }) {
  const { drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData } = useProject()
  const { triggerConfetti, showToast } = useVisuals()

  const sessions = getProjectData('negotiationSessions')

  const [view, setView] = useState('setup')
  const [offerDetails, setOfferDetails] = useState('')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  // Stable refs
  const sessionIdRef = useRef(null)
  const sessionsRef = useRef(sessions)
  const offerDetailsRef = useRef(offerDetails)

  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { offerDetailsRef.current = offerDetails }, [offerDetails])

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

  async function startNegotiation() {
    sessionIdRef.current = generateId()
    setMessages([]); setView('chat'); setLoading(true)
    triggerConfetti()
    showToast("Negotiation starting — anchor high! 💰")
    try {
      let full = ''
      setMessages([{ role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.negotiationSim(offerDetails, context, drillMode),
        messages: [{ role: 'user', content: 'Start the call.' }], temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([{ role: 'assistant', content: acc }]) },
      })
      setMessages([{ role: 'assistant', content: full }])
    } catch {}
    setLoading(false)
  }

  async function sendMessage(text) {
    const txt = text?.trim(); if (!txt || loading) return
    const isCoaching = txt.includes('END NEGOTIATION')
    const userMsg = { role: 'user', content: txt }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setLoading(true)
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
    } catch {}
    setLoading(false)
  }

  function handleBack() {
    if (messages.filter(m => m.content).length > 1) upsertSession(messages)
    setView('setup')
  }

  const lastAiMsg = messages.filter(m => m.role === 'assistant' && m.content).at(-1)?.content || ''

  if (view === 'history') return <NegotiationHistory sessions={sessions} onBack={() => setView('setup')} />

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in">
      {onBack && (
        <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Tools</button>
      )}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="section-title">Salary Negotiation Simulator</h2>
          <p className="section-sub">Roleplay the offer call and practice negotiating.</p>
        </div>
        <button onClick={() => setView('history')} className="btn-ghost">
          <History size={16}/> History ({sessions.length})
        </button>
      </div>

      {/* 2-col: tactics left / form right */}
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        {/* Left: tactics reference */}
        <div className="card border-indigo-500/20 bg-indigo-500/5 self-start">
          <h3 className="font-display font-semibold text-indigo-400 text-sm mb-3">📚 Negotiation Tactics</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['BATNA', 'Know your Best Alternative before you start'],
              ['Anchoring', 'Name a high number first to set the range'],
              ['Silence', 'After asking, stay quiet — next person to speak loses'],
              ['Bracketing', 'Make target the midpoint between ask and offer'],
              ['Total Package', 'Negotiate benefits, equity, title too'],
              ['Market Data', 'Reference Glassdoor/LinkedIn to depersonalize the ask'],
            ].map(([t, d]) => (
              <div key={t} className="bg-navy-800 rounded-lg p-2.5">
                <div className="text-indigo-400 font-semibold mb-0.5">{t}</div>
                <div className="text-slate-400">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form + start */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Offer details</label>
            <textarea className="textarea-field h-32"
              placeholder="e.g. Role: Senior Compliance Analyst, Salary: €55,000, Location: Sofia, 20 days PTO"
              value={offerDetails} onChange={e => setOfferDetails(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Your context <span className="text-slate-600">(optional)</span></label>
            <textarea className="textarea-field h-24"
              placeholder="e.g. Market rate is €60-65k, I have a competing offer at €58k, walk-away is €52k"
              value={context} onChange={e => setContext(e.target.value)} />
          </div>
          <button onClick={startNegotiation} disabled={!isConnected || !offerDetails.trim()}
            className="btn-primary w-full justify-center py-3 mt-auto">
            <Play size={18}/> Start Negotiation
          </button>
          {!isConnected && (
            <p className="text-center text-slate-500 text-xs -mt-2">Configure your API key in Settings first.</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`flex flex-col animate-in ${embedded ? 'h-[calc(100vh-140px)]' : 'h-full'}`}>
      <div className="px-4 py-3 border-b border-navy-700 bg-navy-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-sm">💼</div>
          <div>
            <div className="text-white text-sm font-body font-medium">Alex Chen</div>
            <div className="text-slate-500 text-xs">Talent Acquisition Partner</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => sendMessage('END NEGOTIATION')}
            className="btn-ghost text-xs text-yellow-400 hover:text-yellow-300">Get Coaching</button>
          <button onClick={handleBack} className="btn-ghost text-xs flex items-center gap-1 text-slate-400 hover:text-white">
            <X size={14}/> End
          </button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={loading} emptyText="Starting the call…" />

      <div className="p-4 border-t border-navy-700 bg-navy-900">
        <VoiceChatBar
          onSend={sendMessage}
          isLoading={loading}
          lastAiMessage={lastAiMsg}
          placeholder="Your response… or press 🎙 to speak"
        />
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
      <h2 className="section-title mb-1">Negotiation History</h2>
      <p className="section-sub mb-4">{sessions.length} session{sessions.length !== 1 ? 's' : ''} in this project</p>
      {sessions.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No sessions yet.</div>
      ) : (
        <div className="space-y-2">
          {[...sessions].reverse().map(s => (
            <button key={s.id} onClick={() => setSelected(s)}
              className="card-hover w-full text-left flex items-center justify-between">
              <div>
                <div className="text-white font-body font-medium text-sm truncate max-w-xs">
                  {s.offerDetails || 'Negotiation'}
                </div>
                <div className="text-slate-500 text-xs">
                  {new Date(s.date).toLocaleDateString()} · {s.messages.filter(m => m.content).length} exchanges
                </div>
              </div>
              {s.coachingTriggered
                ? <span className="badge badge-teal text-xs">Coached</span>
                : <span className="text-slate-600 text-xs">—</span>
              }
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
