import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { prompts } from '../../utils/prompts'
import ChatWindow from '../shared/ChatWindow'
import { DollarSign, Play, RotateCcw, Send } from 'lucide-react'

export default function NegotiationSim() {
  const { drillMode } = useApp()
  const { callAI, isConnected } = useAI()

  const [view, setView] = useState('setup')
  const [offerDetails, setOfferDetails] = useState('')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function startNegotiation() {
    setMessages([])
    setView('chat')
    setLoading(true)
    try {
      let full = ''
      setMessages([{ role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.negotiationSim(offerDetails, context, drillMode),
        messages: [{ role: 'user', content: 'Start the call.' }],
        temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([{ role: 'assistant', content: acc }]) },
      })
      setMessages([{ role: 'assistant', content: full }])
    } catch {}
    setLoading(false)
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      let full = ''
      setMessages([...newMsgs, { role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.negotiationSim(offerDetails, context, drillMode),
        messages: newMsgs,
        temperature: 0.8,
        onChunk: (_, acc) => { full = acc; setMessages([...newMsgs, { role: 'assistant', content: acc }]) },
      })
      setMessages([...newMsgs, { role: 'assistant', content: full }])
    } catch {}
    setLoading(false)
  }

  function endNegotiation() {
    sendMessage('END NEGOTIATION')
  }

  if (view === 'setup') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <h2 className="section-title mb-1">Salary Negotiation Simulator</h2>
      <p className="section-sub mb-5">Roleplay the offer call and practice negotiating like a pro.</p>

      {/* Tactics reference */}
      <div className="card mb-5 border-indigo-500/20 bg-indigo-500/5">
        <h3 className="font-display font-semibold text-indigo-400 text-sm mb-3">📚 Negotiation Tactics Reference</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {[
            ['BATNA', 'Know your Best Alternative To a Negotiated Agreement before you start'],
            ['Anchoring', 'Name a high number first to set the negotiation range'],
            ['Silence', 'After making your ask, stay silent. The next person to speak loses'],
            ['Bracketing', 'Make your target the midpoint between your ask and their offer'],
            ['Total Package', 'Negotiate benefits, equity, remote days, title — not just salary'],
            ['Market Data', 'Reference Glassdoor/LinkedIn data to depersonalize the ask'],
          ].map(([tactic, desc]) => (
            <div key={tactic} className="bg-navy-800 rounded-lg p-2">
              <div className="text-indigo-400 font-semibold mb-0.5">{tactic}</div>
              <div className="text-slate-400">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Offer details</label>
          <textarea
            className="textarea-field h-24"
            placeholder="e.g. Role: Senior Compliance Analyst, Salary: €55,000, Location: Sofia, Benefits: health insurance, 20 days PTO"
            value={offerDetails}
            onChange={e => setOfferDetails(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Your context <span className="text-slate-600">(optional)</span></label>
          <textarea
            className="textarea-field h-16"
            placeholder="e.g. Market rate is €60-65k, I have a competing offer at €58k, my walk-away is €52k"
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </div>
      </div>

      <button onClick={startNegotiation} disabled={!isConnected || !offerDetails.trim()} className="btn-primary w-full justify-center py-3">
        <Play size={18} /> Start Negotiation
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
          <button onClick={endNegotiation} className="btn-ghost text-xs text-yellow-400 hover:text-yellow-300">Get Coaching</button>
          <button onClick={() => setView('setup')} className="btn-ghost"><RotateCcw size={14} /></button>
        </div>
      </div>

      <ChatWindow messages={messages} isLoading={loading} emptyText="Starting the call..." />

      <div className="p-4 border-t border-navy-700 bg-navy-900 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Your response..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(input) } }}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center flex-shrink-0">
          <Send size={16} className="text-navy-900" />
        </button>
      </div>
    </div>
  )
}
