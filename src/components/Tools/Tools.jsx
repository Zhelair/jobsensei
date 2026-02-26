import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { Wrench, Target, Gauge, Mail, Megaphone, ArrowLeft, Copy, ChevronRight, History, Clock } from 'lucide-react'

const TOOLS = [
  { id: 'predictor', icon: Target, label: 'Question Predictor', desc: 'Predict the 15 most likely questions for any JD' },
  { id: 'tone', icon: Gauge, label: 'Tone Analyzer', desc: 'Analyze your answer for confidence and clarity' },
  { id: 'followup', icon: Mail, label: 'Follow-up Email', desc: 'Generate a perfect post-interview email' },
  { id: 'pitch', icon: Megaphone, label: 'Elevator Pitch', desc: '"Why should we hire you?" — perfected' },
]

export default function Tools() {
  const [activeTool, setActiveTool] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const { getProjectData, updateProjectData } = useProject()
  const resume = getProjectData('resume')
  const toolsHistory = getProjectData('toolsHistory')

  function saveHistory(tool, toolLabel, inputs, result) {
    const entry = { id: generateId(), date: new Date().toISOString(), tool, toolLabel, inputs, result }
    updateProjectData('toolsHistory', [entry, ...(toolsHistory || [])].slice(0, 50))
  }

  if (activeTool === 'predictor') return <QuestionPredictor onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('predictor', 'Question Predictor', i, r)} />
  if (activeTool === 'tone') return <ToneAnalyzer onBack={() => setActiveTool(null)} saveHistory={(i, r) => saveHistory('tone', 'Tone Analyzer', i, r)} />
  if (activeTool === 'followup') return <FollowUpEmail onBack={() => setActiveTool(null)} saveHistory={(i, r) => saveHistory('followup', 'Follow-up Email', i, r)} />
  if (activeTool === 'pitch') return <ElevatorPitch onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('pitch', 'Elevator Pitch', i, r)} />

  if (showHistory) return <ToolsHistory history={toolsHistory || []} onBack={() => setShowHistory(false)} />

  const recentHistory = (toolsHistory || []).slice(0, 5)

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="section-title">Tools</h2>
        {recentHistory.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs">
            <History size={14}/> History ({toolsHistory.length})
          </button>
        )}
      </div>
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

      {recentHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display font-semibold text-slate-400 text-sm mb-3 flex items-center gap-2">
            <Clock size={14}/> Recent Results
          </h3>
          <div className="space-y-2">
            {recentHistory.map(h => (
              <div key={h.id} className="card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-body">{h.toolLabel}</span>
                  <span className="text-slate-500 text-xs">{new Date(h.date).toLocaleDateString()}</span>
                </div>
                <HistorySummary item={h} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistorySummary({ item }) {
  if (item.tool === 'predictor' && item.result?.questions)
    return <p className="text-slate-400 text-xs">{item.result.questions.length} questions predicted · {item.inputs?.jd || ''}</p>
  if (item.tool === 'tone' && item.result?.scores)
    return <p className="text-slate-400 text-xs">{Object.entries(item.result.scores).map(([k,v]) => `${k} ${v}/10`).join(' · ')}</p>
  if (item.tool === 'followup' && item.result?.subject)
    return <p className="text-slate-400 text-xs truncate">Subject: {item.result.subject}</p>
  if (item.tool === 'pitch' && item.result?.shortVersion)
    return <p className="text-slate-400 text-xs line-clamp-2">{item.result.shortVersion}</p>
  return null
}

function ToolsHistory({ history, onBack }) {
  const [selected, setSelected] = useState(null)
  if (selected) return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={() => setSelected(null)} className="btn-ghost mb-4">← History</button>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-display font-bold text-white">{selected.toolLabel}</span>
        <span className="text-slate-400 text-sm">{new Date(selected.date).toLocaleDateString()}</span>
      </div>
      <FullHistoryResult item={selected} />
    </div>
  )
  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4">← Tools</button>
      <h2 className="section-title mb-1">Tools History</h2>
      <p className="section-sub mb-4">{history.length} saved result{history.length !== 1 ? 's' : ''}</p>
      {history.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No results yet.</div>
      ) : (
        <div className="space-y-2">
          {history.map(h => (
            <button key={h.id} onClick={() => setSelected(h)} className="card-hover w-full text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-body font-medium text-sm">{h.toolLabel}</span>
                <span className="text-slate-500 text-xs">{new Date(h.date).toLocaleDateString()}</span>
              </div>
              <HistorySummary item={h} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FullHistoryResult({ item }) {
  if (item.tool === 'predictor' && item.result?.questions) {
    const PROB_COLORS = { High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-teal' }
    const CAT_COLORS = { Technical: 'badge-indigo', Behavioral: 'badge-teal', Culture: 'badge-green', Curveball: 'badge-yellow', 'Role-Specific': 'badge-red' }
    return (
      <div className="space-y-2">
        {item.result.questions.map((q, i) => (
          <div key={i} className="card">
            <div className="flex items-start gap-3">
              <span className="text-slate-600 font-mono text-xs mt-1">{String(i+1).padStart(2,'0')}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-body mb-2">{q.question}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={PROB_COLORS[q.probability] || 'badge-slate'}>{q.probability} probability</span>
                  <span className={CAT_COLORS[q.category] || 'badge-slate'}>{q.category}</span>
                </div>
                <p className="text-teal-400 text-xs">💡 {q.tip}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (item.tool === 'tone' && item.result) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(item.result.scores || {}).map(([k, v]) => (
            <div key={k} className="card text-center">
              <div className={`font-display font-bold text-2xl mb-1 ${v >= 8 ? 'text-green-400' : v >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{v}</div>
              <div className="text-slate-400 text-xs capitalize">{k}</div>
            </div>
          ))}
        </div>
        {item.result.rewrittenAnswer && (
          <div className="card border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display font-semibold text-white text-sm">✨ Stronger Version</h4>
              <button onClick={() => navigator.clipboard?.writeText(item.result.rewrittenAnswer)} className="btn-ghost text-xs"><Copy size={13}/> Copy</button>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{item.result.rewrittenAnswer}</p>
          </div>
        )}
      </div>
    )
  }
  if (item.tool === 'followup' && item.result) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400 text-xs">Subject: <span className="text-white">{item.result.subject}</span></span>
          <button onClick={() => navigator.clipboard?.writeText(`Subject: ${item.result.subject}\n\n${item.result.body}`)} className="btn-ghost text-xs"><Copy size={13}/> Copy</button>
        </div>
        <div className="divider"/>
        <p className="text-slate-200 text-sm font-body leading-relaxed whitespace-pre-wrap">{item.result.body}</p>
      </div>
    )
  }
  if (item.tool === 'pitch' && item.result) {
    return (
      <div className="space-y-4">
        <div className="card border-teal-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="badge-teal">60 seconds</span>
            <button onClick={() => navigator.clipboard?.writeText(item.result.fullPitch)} className="btn-ghost text-xs"><Copy size={13}/> Copy</button>
          </div>
          <p className="text-white text-sm font-body leading-relaxed">{item.result.fullPitch}</p>
        </div>
        <div className="card border-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="badge-indigo">30 seconds</span>
            <button onClick={() => navigator.clipboard?.writeText(item.result.shortVersion)} className="btn-ghost text-xs"><Copy size={13}/> Copy</button>
          </div>
          <p className="text-white text-sm font-body leading-relaxed">{item.result.shortVersion}</p>
        </div>
      </div>
    )
  }
  return <p className="text-slate-500 text-sm">No preview available.</p>
}

function QuestionPredictor({ onBack, resume, saveHistory }) {
  const { profile, drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const [jd, setJd] = useState('')
  const [background, setBackground] = useState(resume || profile?.currentRole || '')
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
      if (parsed) {
        setResult(parsed)
        saveHistory({ jd: jd.slice(0, 80) }, parsed)
      }
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

function ToneAnalyzer({ onBack, saveHistory }) {
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
      if (parsed) {
        setResult(parsed)
        saveHistory({ answer: answer.slice(0, 100) }, parsed)
      }
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(result.scores || {}).map(([k, v]) => (
              <div key={k} className="card text-center">
                <div className={`font-display font-bold text-2xl mb-1 ${v >= 8 ? 'text-green-400' : v >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{v}</div>
                <div className="text-slate-400 text-xs capitalize">{k}</div>
              </div>
            ))}
          </div>

          {result.topAdvice && (
            <div className="card border-teal-500/30 bg-teal-500/5">
              <div className="text-teal-400 text-sm font-display font-semibold mb-1">🎯 Key Improvement</div>
              <p className="text-slate-300 text-sm">{result.topAdvice}</p>
            </div>
          )}

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

function FollowUpEmail({ onBack, saveHistory }) {
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
      if (parsed) {
        setResult(parsed)
        saveHistory({ company, role }, parsed)
      }
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

function ElevatorPitch({ onBack, resume, saveHistory }) {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [role, setRole] = useState(profile?.targetRole || '')
  const [strengths, setStrengths] = useState(resume ? resume.slice(0, 300) : '')
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
      if (parsed) {
        setResult(parsed)
        saveHistory({ role }, parsed)
      }
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
