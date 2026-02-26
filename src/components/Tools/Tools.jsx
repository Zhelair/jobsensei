import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON } from '../../utils/helpers'
import { Wrench, Target, Gauge, Mail, Megaphone, ArrowLeft, Copy, ChevronRight } from 'lucide-react'

const TOOLS = [
  { id: 'predictor', icon: Target, label: 'Question Predictor', desc: 'Predict the 15 most likely questions for any JD' },
  { id: 'tone', icon: Gauge, label: 'Tone Analyzer', desc: 'Analyze your answer for confidence and clarity' },
  { id: 'followup', icon: Mail, label: 'Follow-up Email', desc: 'Generate a perfect post-interview email' },
  { id: 'pitch', icon: Megaphone, label: 'Elevator Pitch', desc: '"Why should we hire you?" — perfected' },
]

export default function Tools() {
  const [activeTool, setActiveTool] = useState(null)

  if (activeTool === 'predictor') return <QuestionPredictor onBack={() => setActiveTool(null)} />
  if (activeTool === 'tone') return <ToneAnalyzer onBack={() => setActiveTool(null)} />
  if (activeTool === 'followup') return <FollowUpEmail onBack={() => setActiveTool(null)} />
  if (activeTool === 'pitch') return <ElevatorPitch onBack={() => setActiveTool(null)} />

  return (
    <div className="p-4 md:p-6 animate-in">
      <h2 className="section-title mb-1">Tools</h2>
      <p className="section-sub mb-5">Utility belt for your job hunt.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {TOOLS.map(({ id, icon: Icon, label, desc }) => (
          <button key={id} onClick={() => setActiveTool(id)} className="card-hover text-left flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
              <Icon size={20} className="text-teal-400" />
            </div>
            <div>
              <div className="text-white font-body font-medium text-sm mb-1">{label}</div>
              <div className="text-slate-400 text-xs">{desc}</div>
            </div>
            <ChevronRight size={16} className="text-slate-600 ml-auto mt-1" />
          </button>
        ))}
      </div>
    </div>
  )
}

function QuestionPredictor({ onBack }) {
  const { profile, drillMode, setActiveSection } = useApp()
  const { callAI, isConnected } = useAI()
  const [jd, setJd] = useState('')
  const [background, setBackground] = useState(profile?.currentRole || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const PROB_COLORS = { High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-teal' }
  const CAT_COLORS = { Technical: 'badge-indigo', Behavioral: 'badge-teal', Culture: 'badge-green', Curveball: 'badge-yellow', 'Role-Specific': 'badge-red' }

  async function predict() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({
        systemPrompt: prompts.questionPredictor(jd, background),
        messages: [{ role: 'user', content: 'Predict the questions.' }],
        temperature: 0.5,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) setResult(parsed)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Tools</button>
      <h2 className="section-title mb-1">Interview Question Predictor</h2>
      <p className="section-sub mb-5">See the most likely questions before you walk in.</p>

      <div className="space-y-3 mb-4">
        <textarea className="textarea-field h-28" placeholder="Paste the job description..." value={jd} onChange={e => setJd(e.target.value)} />
        <input className="input-field" placeholder="Your background (optional)..." value={background} onChange={e => setBackground(e.target.value)} />
      </div>
      <button onClick={predict} disabled={loading || !isConnected || !jd.trim()} className="btn-primary mb-5">
        <Target size={16} /> {loading ? 'Predicting...' : 'Predict Questions'}
      </button>

      {result?.questions && (
        <div className="space-y-2 animate-in">
          {result.questions.map((q, i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-3">
                <span className="text-slate-600 font-mono text-xs mt-1">{String(i+1).padStart(2,'0')}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-body mb-2">{q.question}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={PROB_COLORS[q.probability] || 'badge-slate'}>{q.probability} probability</span>
                    <span className={CAT_COLORS[q.category] || 'badge-slate'}>{q.category}</span>
                  </div>
                  <p className="text-slate-500 text-xs mb-1">Why: {q.why}</p>
                  <p className="text-teal-400 text-xs">💡 {q.tip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ToneAnalyzer({ onBack }) {
  const { callAI, isConnected } = useAI()
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function analyze() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({
        systemPrompt: prompts.toneAnalyzer(answer),
        messages: [{ role: 'user', content: 'Analyze.' }],
        temperature: 0.4,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) setResult(parsed)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Tools</button>
      <h2 className="section-title mb-1">Tone & Confidence Analyzer</h2>
      <p className="section-sub mb-5">Paste any interview answer — we'll score it and rewrite it stronger.</p>

      <textarea className="textarea-field h-32 mb-4" placeholder="Paste your interview answer here..." value={answer} onChange={e => setAnswer(e.target.value)} />
      <button onClick={analyze} disabled={loading || !isConnected || !answer.trim()} className="btn-primary mb-5">
        <Gauge size={16} /> {loading ? 'Analyzing...' : 'Analyze Tone'}
      </button>

      {result && (
        <div className="space-y-4 animate-in">
          {/* Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(result.scores || {}).map(([k, v]) => (
              <div key={k} className="card text-center">
                <div className={`font-display font-bold text-2xl mb-1 ${v >= 8 ? 'text-green-400' : v >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{v}</div>
                <div className="text-slate-400 text-xs capitalize">{k}</div>
              </div>
            ))}
          </div>

          {/* Top advice */}
          {result.topAdvice && (
            <div className="card border-teal-500/30 bg-teal-500/5">
              <div className="text-teal-400 text-sm font-display font-semibold mb-1">🎯 Key Improvement</div>
              <p className="text-slate-300 text-sm">{result.topAdvice}</p>
            </div>
          )}

          {/* Weak language */}
          {result.weakLanguage?.length > 0 && (
            <div className="card">
              <h4 className="font-display font-semibold text-white text-sm mb-3">Weak Language Found</h4>
              <div className="space-y-2">
                {result.weakLanguage.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-navy-900 rounded-xl p-3">
                    <div className="flex-1">
                      <span className="text-red-400 text-xs font-mono line-through">"{item.phrase}"</span>
                      <span className="text-slate-400 text-xs mx-2">→</span>
                      <span className="text-green-400 text-xs font-mono">"{item.replacement}"</span>
                      <p className="text-slate-500 text-xs mt-1">{item.issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewritten */}
          {result.rewrittenAnswer && (
            <div className="card border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display font-semibold text-white text-sm">✨ Stronger Version</h4>
                <button onClick={() => navigator.clipboard?.writeText(result.rewrittenAnswer)} className="btn-ghost text-xs">
                  <Copy size={13} /> Copy
                </button>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{result.rewrittenAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FollowUpEmail({ onBack }) {
  const { callAI, isConnected } = useAI()
  const [company, setCompany] = useState('')
  const [interviewer, setInterviewer] = useState('')
  const [role, setRole] = useState('')
  const [notes, setNotes] = useState('')
  const [tone, setTone] = useState('Professional')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function generate() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({
        systemPrompt: prompts.followUpEmail(company, interviewer, role, notes, tone),
        messages: [{ role: 'user', content: 'Generate the email.' }],
        temperature: 0.7,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) setResult(parsed)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Tools</button>
      <h2 className="section-title mb-1">Follow-up Email</h2>
      <p className="section-sub mb-5">Generate the perfect post-interview thank you email.</p>

      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <input className="input-field" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
          <input className="input-field" placeholder="Interviewer name" value={interviewer} onChange={e => setInterviewer(e.target.value)} />
        </div>
        <input className="input-field" placeholder="Role title" value={role} onChange={e => setRole(e.target.value)} />
        <textarea className="textarea-field h-20" placeholder="Brief notes about the interview (something memorable, topic discussed)..." value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-2">
          {['Warm', 'Professional', 'Enthusiastic'].map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-body border transition-all ${tone === t ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-navy-700 text-slate-400 border-navy-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={loading || !isConnected || !company.trim()} className="btn-primary mb-5">
        <Mail size={16} /> {loading ? 'Writing...' : 'Generate Email'}
      </button>

      {result && (
        <div className="card animate-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs">Subject: <span className="text-white">{result.subject}</span></span>
            <button onClick={() => navigator.clipboard?.writeText(`Subject: ${result.subject}\n\n${result.body}`)} className="btn-ghost text-xs">
              <Copy size={13} /> Copy
            </button>
          </div>
          <div className="divider" />
          <p className="text-slate-200 text-sm font-body leading-relaxed whitespace-pre-wrap">{result.body}</p>
        </div>
      )}
    </div>
  )
}

function ElevatorPitch({ onBack }) {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [role, setRole] = useState(profile?.targetRole || '')
  const [strengths, setStrengths] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function generate() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({
        systemPrompt: prompts.elevatorPitch(role, strengths, drillMode),
        messages: [{ role: 'user', content: 'Write my elevator pitch.' }],
        temperature: 0.8,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) setResult(parsed)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Tools</button>
      <h2 className="section-title mb-1">Elevator Pitch Builder</h2>
      <p className="section-sub mb-5">Craft a killer answer to "Why should we hire you?"</p>

      <div className="space-y-3 mb-4">
        <input className="input-field" placeholder="Target role" value={role} onChange={e => setRole(e.target.value)} />
        <textarea className="textarea-field h-24" placeholder="Your top 3-5 strengths or key selling points..." value={strengths} onChange={e => setStrengths(e.target.value)} />
      </div>

      <button onClick={generate} disabled={loading || !isConnected || !role.trim() || !strengths.trim()} className="btn-primary mb-5">
        <Megaphone size={16} /> {loading ? 'Writing...' : 'Build Pitch'}
      </button>

      {result && (
        <div className="space-y-4 animate-in">
          <div className="card border-teal-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="badge-teal">60 seconds</span>
              <button onClick={() => navigator.clipboard?.writeText(result.fullPitch)} className="btn-ghost text-xs"><Copy size={13} /> Copy</button>
            </div>
            <p className="text-white text-sm font-body leading-relaxed">{result.fullPitch}</p>
          </div>

          <div className="card border-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="badge-indigo">30 seconds</span>
              <button onClick={() => navigator.clipboard?.writeText(result.shortVersion)} className="btn-ghost text-xs"><Copy size={13} /> Copy</button>
            </div>
            <p className="text-white text-sm font-body leading-relaxed">{result.shortVersion}</p>
          </div>

          {result.tweaks?.length > 0 && (
            <div className="card">
              <h4 className="font-display font-semibold text-white text-sm mb-2">💡 Personalization Tips</h4>
              <ul className="space-y-1">
                {result.tweaks.map((t, i) => <li key={i} className="text-slate-400 text-xs">• {t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
