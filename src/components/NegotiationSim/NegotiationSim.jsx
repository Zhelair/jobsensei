import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useVoice } from '../../hooks/useVoice'
import { prompts } from '../../utils/prompts'
import ChatWindow from '../shared/ChatWindow'
import { DollarSign, Play, RotateCcw, Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

export default function NegotiationSim() {
  const { drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const { isListening, startListening, stopListening, speak, isSpeaking, stopSpeaking, supported: voiceSupported } = useVoice()

  const [view, setView] = useState('setup')
  const [offerDetails, setOfferDetails] = useState('')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  async function startNegotiation() {
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
      if (ttsEnabled) speak(full)
    } catch {}
    setLoading(false)
  }

  async function sendMessage(text) {
    const txt = text?.trim(); if (!txt || loading) return
    const userMsg = { role: 'user', content: txt }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setInput(''); setInterimText(''); setLoading(true)
    try {
      let full = ''
      setMessages([...newMsgs, { role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.negotiationSim(offerDetails, context, drillMode),
        messages: newMsgs, temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([...newMsgs, { role: 'assistant', content: acc }]) },
      })
      setMessages([...newMsgs, { role: 'assistant', content: full }])
      if (ttsEnabled) speak(full)
    } catch {}
    setLoading(false)
  }

  function handleVoice() {
    if (isListening) { stopListening(); return }
    startListening(
      (final) => { setInput(final); setInterimText('') },
      (interim) => setInterimText(interim)
    )
  }

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <h2 className="section-title mb-1">Salary Negotiation Simulator</h2>
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
          <button onClick={() => setVoiceMode(!voiceMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${voiceMode ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-navy-700 text-slate-400 border-navy-600'}`}>
            <Mic size={14} /> {voiceMode ? 'Voice ON' : 'Voice OFF'}
          </button>
        )}
      </div>

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
          <button onClick={() => setView('setup')} className="btn-ghost"><RotateCcw size={14}/></button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={loading} emptyText="Starting the call..." />

      <div className="p-4 border-t border-navy-700 bg-navy-900 space-y-2">
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
          <button onClick={() => { if (isSpeaking) { stopSpeaking(); setTtsEnabled(false) } else setTtsEnabled(!ttsEnabled) }}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ttsEnabled || isSpeaking ? 'bg-teal-500/20 text-teal-400' : 'bg-navy-700 text-slate-500 hover:text-slate-300'}`}>
            {ttsEnabled || isSpeaking ? <Volume2 size={16}/> : <VolumeX size={16}/>}
          </button>
          <input className="input-field flex-1"
            placeholder={isListening ? '🎙 Listening...' : 'Your response...'}
            value={isListening ? interimText : input}
            onChange={e => !isListening && setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(isListening ? interimText : input) } }}
            readOnly={isListening}
          />
          <button onClick={() => sendMessage(isListening ? interimText : input)} disabled={(!input.trim() && !interimText.trim()) || loading}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center">
            <Send size={16} className="text-navy-900"/>
          </button>
        </div>
        {isListening && <p className="text-teal-400 text-xs text-center">Speak your offer response — press Enter when done</p>}
      </div>
    </div>
  )
}
