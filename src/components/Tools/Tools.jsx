import React, { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { Target, Gauge, Mail, Megaphone, ArrowLeft, Copy, ChevronRight, History, Clock, FileText, ClipboardCheck, Globe, Camera, X, Search, Star, DollarSign, Zap, Trash2 } from 'lucide-react'
import GapAnalysis from '../GapAnalysis/GapAnalysis'
import STARBuilder from '../STARBuilder/STARBuilder'
import NegotiationSim from '../NegotiationSim/NegotiationSim'

const TOOLS = [
  { id: 'gap', icon: Search, label: 'Gap Analysis', desc: 'Match to JD, score application, detect red flags' },
  { id: 'star', icon: Star, label: 'STAR Builder', desc: 'Structure interview answers and build your story bank' },
  { id: 'negotiation', icon: DollarSign, label: 'Negotiation Sim', desc: 'Roleplay salary negotiation with AI recruiter Alex Chen' },
  { id: 'predictor', icon: Target, label: 'Question Predictor', desc: 'Predict the 10 most likely questions for any JD' },
  { id: 'transferable', icon: Zap, label: 'Transferable Skills Coach', desc: 'Reframe your experience for new roles and industries' },
  { id: 'tone', icon: Gauge, label: 'Tone Analyzer', desc: 'Analyze your answer for confidence and clarity' },
  { id: 'followup', icon: Mail, label: 'Follow-up Email', desc: 'Generate a perfect post-interview email' },
  { id: 'pitch', icon: Megaphone, label: 'Elevator Pitch', desc: '"Why should we hire you?" — perfected' },
  { id: 'coverletter', icon: FileText, label: 'Cover Letter Optimizer', desc: '3 versions — Corporate, Creative, Casual — with keyword analysis' },
  { id: 'resumechecker', icon: ClipboardCheck, label: 'Resume Checker', desc: 'ATS score + recruiter lens on your resume' },
  { id: 'linkedin', icon: Globe, label: 'LinkedIn Auditor', desc: 'Score your profile and get quick wins' },
  { id: 'visualreview', icon: Camera, label: 'Visual Design Review', desc: 'AI analyzes your resume design, layout, and visual impact' },
]

const FILTER_LABELS = {
  all: 'All',
  gap: 'Gap Analysis',
  negotiation: 'Negotiation Sim',
  predictor: 'Question Predictor',
  transferable: 'Transferable Skills',
  tone: 'Tone Analyzer',
  followup: 'Follow-up Email',
  pitch: 'Elevator Pitch',
  coverletter: 'Cover Letter',
  resumechecker: 'Resume Checker',
  linkedin: 'LinkedIn',
  visualreview: 'Visual Review',
}

export default function Tools() {
  const [activeTool, setActiveTool] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [recentFilter, setRecentFilter] = useState('all')
  const { getProjectData, updateProjectData } = useProject()
  const resume = getProjectData('resume')
  const toolsHistory = getProjectData('toolsHistory') || []
  const gapResults = getProjectData('gapResults') || []
  const negotiationSessions = getProjectData('negotiationSessions') || []

  function saveHistory(tool, toolLabel, inputs, result) {
    const entry = { id: generateId(), date: new Date().toISOString(), tool, toolLabel, inputs, result }
    updateProjectData('toolsHistory', [entry, ...toolsHistory].slice(0, 100))
  }

  function historyFor(tool) {
    return toolsHistory.filter(h => h.tool === tool)
  }

  function deleteHistory(id) {
    updateProjectData('toolsHistory', toolsHistory.filter(h => h.id !== id))
    if (selectedResult?.id === id) setSelectedResult(null)
  }

  function deleteGapResult(id) {
    updateProjectData('gapResults', gapResults.filter(g => g.id !== id))
    if (selectedResult?.id === id) setSelectedResult(null)
  }

  function deleteNegotiationSession(id) {
    updateProjectData('negotiationSessions', negotiationSessions.filter(n => n.id !== id))
    if (selectedResult?.id === id) setSelectedResult(null)
  }

  // Normalize gap & negotiation into the shared shape
  const normalizedGap = gapResults.map(g => ({
    id: g.id, date: g.date, tool: 'gap', toolLabel: 'Gap Analysis',
    inputs: { jd: g.jdSnippet || '' },
    result: { gapResult: g.gapResult, scoreResult: g.scoreResult, redFlags: g.redFlags, tab: g.tab },
  }))
  const normalizedNeg = negotiationSessions.map(n => ({
    id: n.id, date: n.date, tool: 'negotiation', toolLabel: 'Negotiation Sim',
    inputs: { offer: n.offerDetails || '' },
    result: { messages: n.messages, coachingTriggered: n.coachingTriggered },
  }))

  const allHistory = [...toolsHistory, ...normalizedGap, ...normalizedNeg]
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (activeTool === 'gap') return <GapAnalysis onBack={() => setActiveTool(null)} />
  if (activeTool === 'star') return <STARBuilder onBack={() => setActiveTool(null)} />
  if (activeTool === 'negotiation') return <NegotiationSim onBack={() => setActiveTool(null)} embedded />

  if (activeTool === 'predictor') return <QuestionPredictor onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('predictor', 'Question Predictor', i, r)} history={historyFor('predictor')} onDelete={deleteHistory} />
  if (activeTool === 'transferable') return <TransferableSkillsTool onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('transferable', 'Transferable Skills Coach', i, r)} history={historyFor('transferable')} onDelete={deleteHistory} />
  if (activeTool === 'tone') return <ToneAnalyzer onBack={() => setActiveTool(null)} saveHistory={(i, r) => saveHistory('tone', 'Tone Analyzer', i, r)} history={historyFor('tone')} onDelete={deleteHistory} />
  if (activeTool === 'followup') return <FollowUpEmail onBack={() => setActiveTool(null)} saveHistory={(i, r) => saveHistory('followup', 'Follow-up Email', i, r)} history={historyFor('followup')} onDelete={deleteHistory} />
  if (activeTool === 'pitch') return <ElevatorPitch onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('pitch', 'Elevator Pitch', i, r)} history={historyFor('pitch')} onDelete={deleteHistory} />
  if (activeTool === 'coverletter') return <CoverLetterOptimizer onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('coverletter', 'Cover Letter Optimizer', i, r)} history={historyFor('coverletter')} onDelete={deleteHistory} />
  if (activeTool === 'resumechecker') return <ResumeChecker onBack={() => setActiveTool(null)} resume={resume} saveHistory={(i, r) => saveHistory('resumechecker', 'Resume Checker', i, r)} history={historyFor('resumechecker')} onDelete={deleteHistory} />
  if (activeTool === 'linkedin') return <LinkedInAuditor onBack={() => setActiveTool(null)} saveHistory={(i, r) => saveHistory('linkedin', 'LinkedIn Auditor', i, r)} history={historyFor('linkedin')} onDelete={deleteHistory} />
  if (activeTool === 'visualreview') return <VisualResumeReview onBack={() => setActiveTool(null)} saveHistory={(i, r) => saveHistory('visualreview', 'Visual Design Review', i, r)} history={historyFor('visualreview')} onDelete={deleteHistory} />

  // Inline result detail view (clicked from Recent Results)
  if (selectedResult) {
    const isGap = selectedResult.tool === 'gap'
    const isNeg = selectedResult.tool === 'negotiation'
    const onDelete = isGap ? deleteGapResult : isNeg ? deleteNegotiationSession : deleteHistory
    return (
      <div className="p-4 md:p-6 animate-in">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedResult(null)} className="btn-ghost"><ArrowLeft size={16} /> Recent Results</button>
          <button
            onClick={() => { if (confirm('Delete this result?')) onDelete(selectedResult.id) }}
            className="btn-ghost text-xs text-red-400 hover:text-red-300"
          ><Trash2 size={14}/> Delete</button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display font-bold text-white">{selectedResult.toolLabel}</span>
          <span className="text-slate-400 text-sm">{new Date(selectedResult.date).toLocaleDateString()}</span>
        </div>
        <FullHistoryResult item={selectedResult} />
      </div>
    )
  }

  // Determine which filter chips to show based on what's actually in history
  const presentTools = [...new Set(allHistory.map(h => h.tool))]
  const activeFilters = ['all', ...presentTools.filter(t => FILTER_LABELS[t])]

  const filteredRecent = allHistory
    .filter(h => recentFilter === 'all' || h.tool === recentFilter)
    .slice(0, 8)

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
            <ChevronRight size={16} className="text-slate-600 ml-auto mt-1 flex-shrink-0" />
          </button>
        ))}
      </div>

      {filteredRecent.length > 0 || allHistory.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-display font-semibold text-slate-400 text-sm mb-3 flex items-center gap-2">
            <Clock size={14}/> Recent Results
          </h3>

          {/* Filter chips */}
          {activeFilters.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {activeFilters.map(f => (
                <button
                  key={f}
                  onClick={() => setRecentFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-body transition-all ${recentFilter === f ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:border-slate-500'}`}
                >
                  {FILTER_LABELS[f] || f}
                </button>
              ))}
            </div>
          )}

          {filteredRecent.length === 0 ? (
            <p className="text-slate-500 text-sm">No results match this filter.</p>
          ) : (
            <div className="space-y-2">
              {filteredRecent.map(h => (
                <button key={h.id} onClick={() => setSelectedResult(h)} className="card-hover w-full text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-body font-medium">{h.toolLabel}</span>
                    <span className="text-slate-500 text-xs">{new Date(h.date).toLocaleDateString()}</span>
                  </div>
                  <HistorySummary item={h} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── Shared: per-tool history tab view ────────────────────────────────────────

function ToolHistoryView({ history, toolLabel, onBack, onDelete }) {
  const [selected, setSelected] = useState(null)

  if (selected) return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setSelected(null)} className="btn-ghost"><ArrowLeft size={16} /> {toolLabel} History</button>
        {onDelete && (
          <button
            onClick={() => { if (confirm('Delete this result?')) { onDelete(selected.id); setSelected(null) } }}
            className="btn-ghost text-xs text-red-400 hover:text-red-300"
          ><Trash2 size={14}/> Delete</button>
        )}
      </div>
      <div className="text-slate-400 text-xs mb-4">{new Date(selected.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
      <FullHistoryResult item={selected} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> {toolLabel}</button>
      <h2 className="section-title mb-1">{toolLabel} History</h2>
      <p className="section-sub mb-4">{history.length} saved result{history.length !== 1 ? 's' : ''}</p>
      {history.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No results yet — run the tool to save history.</div>
      ) : (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="card-hover flex items-center gap-2">
              <button onClick={() => setSelected(h)} className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-body font-medium text-sm">{h.toolLabel}</span>
                  <span className="text-slate-500 text-xs">{new Date(h.date).toLocaleDateString()}</span>
                </div>
                <HistorySummary item={h} />
              </button>
              {onDelete && (
                <button
                  onClick={() => { if (confirm('Delete?')) onDelete(h.id) }}
                  className="text-slate-600 hover:text-red-400 p-1.5 flex-shrink-0 transition-colors"
                ><Trash2 size={14}/></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── History summary (one-liner per tool) ─────────────────────────────────────

function HistorySummary({ item }) {
  if (item.tool === 'gap')
    return <p className="text-slate-400 text-xs truncate">JD: {item.inputs?.jd || '—'}</p>
  if (item.tool === 'negotiation')
    return <p className="text-slate-400 text-xs truncate">{item.result?.messages?.length || 0} messages · {item.inputs?.offer?.slice(0, 60) || '—'}</p>
  if (item.tool === 'predictor' && item.result?.questions)
    return <p className="text-slate-400 text-xs">{item.result.questions.length} questions predicted · {item.inputs?.jd || ''}</p>
  if (item.tool === 'transferable' && item.inputs?.targetRole)
    return <p className="text-slate-400 text-xs">Target: {item.inputs.targetRole}</p>
  if (item.tool === 'tone' && item.result?.scores)
    return <p className="text-slate-400 text-xs">{Object.entries(item.result.scores).map(([k,v]) => `${k} ${v}/10`).join(' · ')}</p>
  if (item.tool === 'followup' && item.result?.subject)
    return <p className="text-slate-400 text-xs truncate">Subject: {item.result.subject}</p>
  if (item.tool === 'pitch' && item.result?.shortVersion)
    return <p className="text-slate-400 text-xs line-clamp-2">{item.result.shortVersion}</p>
  if (item.tool === 'coverletter' && item.result?.letters)
    return <p className="text-slate-400 text-xs">{item.result.letters.length} versions · {item.result.keywordMatches?.length || 0} keywords matched</p>
  if (item.tool === 'resumechecker' && item.result)
    return <p className="text-slate-400 text-xs">ATS {item.result.atsScore}/100 · Recruiter {item.result.recruiterScore}/100</p>
  if (item.tool === 'linkedin' && item.result)
    return <p className="text-slate-400 text-xs">Overall score {item.result.overallScore}/100</p>
  if (item.tool === 'visualreview' && item.result?.analysis)
    return <p className="text-slate-400 text-xs line-clamp-1">{item.result.analysis.slice(0, 100)}…</p>
  return null
}

// ─── Full history result renderer ─────────────────────────────────────────────

function FullHistoryResult({ item }) {
  if (item.tool === 'gap' && item.result) {
    const { gapResult, scoreResult, redFlags } = item.result
    return (
      <div className="space-y-4">
        {scoreResult && (
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(scoreResult).filter(([k]) => k !== 'rationale').map(([k, v]) => (
              <div key={k} className="card text-center">
                <div className={`font-display font-bold text-2xl mb-1 ${v >= 80 ? 'text-green-400' : v >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{v}</div>
                <div className="text-slate-400 text-xs capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
              </div>
            ))}
          </div>
        )}
        {redFlags?.length > 0 && (
          <div className="card border-red-500/20">
            <h4 className="font-display font-semibold text-white text-sm mb-2">🚩 Red Flags</h4>
            <ul className="space-y-1">{redFlags.map((f, i) => <li key={i} className="text-red-300 text-xs">• {f}</li>)}</ul>
          </div>
        )}
        {gapResult && (
          <div className="card">
            <h4 className="font-display font-semibold text-white text-sm mb-2">Gap Analysis</h4>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{typeof gapResult === 'string' ? gapResult : JSON.stringify(gapResult, null, 2)}</p>
          </div>
        )}
      </div>
    )
  }
  if (item.tool === 'negotiation' && item.result) {
    const msgs = item.result.messages || []
    return (
      <div className="space-y-2">
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'chat-user ml-auto max-w-[85%]' : 'chat-ai max-w-[85%]'}`}>
            <span className="text-xs opacity-60 block mb-1 font-display">{m.role === 'user' ? 'You' : 'Alex Chen (Recruiter)'}</span>
            {m.content}
          </div>
        ))}
        {msgs.length === 0 && <p className="text-slate-500 text-sm">No conversation recorded.</p>}
      </div>
    )
  }
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
  if (item.tool === 'transferable' && item.result) {
    return (
      <div className="card animate-in">
        {item.result.split('\n').map((line, i) => {
          if (line.startsWith('## ') || (line.startsWith('**') && line.endsWith('**')))
            return <h3 key={i} className="font-display font-semibold text-white mt-4 mb-2">{line.replace(/^##\s*/, '').replace(/\*\*/g, '')}</h3>
          if (line.startsWith('- ') || line.startsWith('* '))
            return <p key={i} className="text-slate-300 text-sm ml-3 mb-1.5">• {line.slice(2)}</p>
          if (line.trim() === '') return <div key={i} className="h-1"/>
          return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
        })}
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
  if (item.tool === 'coverletter' && item.result?.letters) {
    return (
      <div className="space-y-3">
        {item.result.keywordMatches?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.result.keywordMatches.map((kw, i) => <span key={i} className="badge-green">{kw}</span>)}
          </div>
        )}
        {item.result.letters.map((l, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="badge-teal">{l.tone}</span>
              <button onClick={() => navigator.clipboard?.writeText(l.body)} className="btn-ghost text-xs"><Copy size={13}/> Copy</button>
            </div>
            <p className="text-slate-300 text-sm font-body leading-relaxed whitespace-pre-wrap line-clamp-4">{l.body}</p>
          </div>
        ))}
      </div>
    )
  }
  if (item.tool === 'resumechecker' && item.result) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="card text-center">
            <div className={`font-display font-bold text-2xl mb-1 ${item.result.atsScore >= 80 ? 'text-green-400' : item.result.atsScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{item.result.atsScore}</div>
            <div className="text-slate-400 text-xs">ATS Score</div>
          </div>
          <div className="card text-center">
            <div className={`font-display font-bold text-2xl mb-1 ${item.result.recruiterScore >= 80 ? 'text-green-400' : item.result.recruiterScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{item.result.recruiterScore}</div>
            <div className="text-slate-400 text-xs">Recruiter Score</div>
          </div>
        </div>
        {item.result.strengths?.length > 0 && (
          <div className="card border-green-500/20">
            <h4 className="font-display font-semibold text-white text-sm mb-2">✅ Strengths</h4>
            <ul className="space-y-1">{item.result.strengths.map((s, i) => <li key={i} className="text-slate-300 text-xs">• {s}</li>)}</ul>
          </div>
        )}
        {item.result.suggestions?.length > 0 && (
          <div className="card">
            <h4 className="font-display font-semibold text-white text-sm mb-2">💡 Suggestions</h4>
            <ul className="space-y-1">{item.result.suggestions.map((s, i) => <li key={i} className="text-slate-400 text-xs">• {s}</li>)}</ul>
          </div>
        )}
      </div>
    )
  }
  if (item.tool === 'linkedin' && item.result) {
    return (
      <div className="space-y-3">
        <div className="card text-center py-4">
          <div className={`font-display font-bold text-4xl mb-1 ${item.result.overallScore >= 80 ? 'text-green-400' : item.result.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{item.result.overallScore}</div>
          <div className="text-slate-400 text-sm">Overall LinkedIn Score</div>
        </div>
        {item.result.quickWins?.length > 0 && (
          <div className="card border-teal-500/20">
            <h4 className="font-display font-semibold text-white text-sm mb-2">⚡ Quick Wins</h4>
            <ul className="space-y-1">{item.result.quickWins.map((w, i) => <li key={i} className="text-slate-300 text-xs">• {w}</li>)}</ul>
          </div>
        )}
      </div>
    )
  }
  if (item.tool === 'visualreview' && item.result?.analysis)
    return (
      <div className="card border-indigo-500/20 bg-indigo-500/5">
        <h4 className="font-display font-semibold text-white text-sm mb-3">📸 Visual Design Analysis</h4>
        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{item.result.analysis}</div>
      </div>
    )
  return <p className="text-slate-500 text-sm">No preview available.</p>
}

// ─── Transferable Skills Coach ─────────────────────────────────────────────────

function TransferableSkillsTool({ onBack, resume, saveHistory, history, onDelete }) {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [experience, setExperience] = useState(resume || (profile?.currentRole ? `I worked as ${profile.currentRole} for ${profile.experience} in ${profile.industry}.` : ''))
  const [targetRole, setTargetRole] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Transferable Skills Coach" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function analyze() {
    setLoading(true); setResult('')
    let full = ''
    try {
      await callAI({
        systemPrompt: prompts.transferableSkills(experience, targetRole, drillMode),
        messages: [{ role: 'user', content: 'Analyze.' }],
        temperature: 0.7,
        onChunk: (_, acc) => { full = acc; setResult(acc) },
      })
      saveHistory({ experience: experience.slice(0, 80), targetRole }, full)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs">
            <History size={14}/> History ({history.length})
          </button>
        )}
      </div>
      <h2 className="section-title mb-1">Transferable Skills Coach</h2>
      <p className="section-sub mb-5">Reframe your experience for your target role.</p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Your current experience {resume && <span className="text-teal-400 text-xs ml-1">← from resume</span>}</label>
          <textarea className="textarea-field h-24" placeholder="Describe what you've done..." value={experience} onChange={e => setExperience(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Target role / context</label>
          <input className="input-field" placeholder="e.g. B2B Compliance Manager at a bank" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
        </div>
      </div>
      <button onClick={analyze} disabled={loading || !isConnected || !experience.trim() || !targetRole.trim()} className="btn-primary mb-5">
        <Zap size={16}/> {loading ? 'Analyzing...' : 'Analyze'}
      </button>
      {result && (
        <div className="card animate-in">
          {result.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) return <h3 key={i} className="font-display font-semibold text-white mt-4 mb-2">{line.slice(2,-2)}</h3>
            if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1.5">• {line.slice(2)}</p>
            if (line.trim() === '') return <div key={i} className="h-1"/>
            return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
          })}
        </div>
      )}
    </div>
  )
}

// ─── Question Predictor ────────────────────────────────────────────────────────

function QuestionPredictor({ onBack, resume, saveHistory, history, onDelete }) {
  const { profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [jd, setJd] = useState('')
  const [background, setBackground] = useState(resume || profile?.currentRole || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const PROB_COLORS = { High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-teal' }
  const CAT_COLORS = { Technical: 'badge-indigo', Behavioral: 'badge-teal', Culture: 'badge-green', Curveball: 'badge-yellow', 'Role-Specific': 'badge-red' }

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Question Predictor" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function predict() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.questionPredictor(jd, background), messages: [{ role: 'user', content: 'Predict the questions.' }], temperature: 0.5 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ jd: jd.slice(0, 80) }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Interview Question Predictor</h2>
      <p className="section-sub mb-5">See the 10 most likely questions before you walk in.</p>
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

// ─── Tone Analyzer ─────────────────────────────────────────────────────────────

function ToneAnalyzer({ onBack, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Tone Analyzer" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function analyze() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.toneAnalyzer(answer), messages: [{ role: 'user', content: 'Analyze.' }], temperature: 0.4 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ answer: answer.slice(0, 100) }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
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
                  <div key={i} className="bg-navy-900 rounded-xl p-3">
                    <span className="text-red-400 text-xs font-mono line-through">"{item.phrase}"</span>
                    <span className="text-slate-400 text-xs mx-2">→</span>
                    <span className="text-green-400 text-xs font-mono">"{item.replacement}"</span>
                    <p className="text-slate-500 text-xs mt-1">{item.issue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.rewrittenAnswer && (
            <div className="card border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display font-semibold text-white text-sm">✨ Stronger Version</h4>
                <button onClick={() => navigator.clipboard?.writeText(result.rewrittenAnswer)} className="btn-ghost text-xs"><Copy size={13} /> Copy</button>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{result.rewrittenAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Follow-up Email ───────────────────────────────────────────────────────────

function FollowUpEmail({ onBack, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [company, setCompany] = useState('')
  const [interviewer, setInterviewer] = useState('')
  const [role, setRole] = useState('')
  const [notes, setNotes] = useState('')
  const [tone, setTone] = useState('Professional')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Follow-up Email" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function generate() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.followUpEmail(company, interviewer, role, notes, tone), messages: [{ role: 'user', content: 'Generate the email.' }], temperature: 0.7 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ company, role }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Follow-up Email</h2>
      <p className="section-sub mb-5">Generate the perfect post-interview thank you email.</p>
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <input className="input-field" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
          <input className="input-field" placeholder="Interviewer name" value={interviewer} onChange={e => setInterviewer(e.target.value)} />
        </div>
        <input className="input-field" placeholder="Role title" value={role} onChange={e => setRole(e.target.value)} />
        <textarea className="textarea-field h-20" placeholder="Brief notes about the interview..." value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-2">
          {['Warm', 'Professional', 'Enthusiastic'].map(t => (
            <button key={t} onClick={() => setTone(t)} className={`flex-1 py-2 rounded-lg text-sm font-body border transition-all ${tone === t ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-navy-700 text-slate-400 border-navy-600'}`}>{t}</button>
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
            <button onClick={() => navigator.clipboard?.writeText(`Subject: ${result.subject}\n\n${result.body}`)} className="btn-ghost text-xs"><Copy size={13} /> Copy</button>
          </div>
          <div className="divider" />
          <p className="text-slate-200 text-sm font-body leading-relaxed whitespace-pre-wrap">{result.body}</p>
        </div>
      )}
    </div>
  )
}

// ─── Elevator Pitch ────────────────────────────────────────────────────────────

function ElevatorPitch({ onBack, resume, saveHistory, history, onDelete }) {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [role, setRole] = useState(profile?.targetRole || '')
  const [strengths, setStrengths] = useState(resume ? resume.slice(0, 300) : '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Elevator Pitch" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function generate() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.elevatorPitch(role, strengths, drillMode), messages: [{ role: 'user', content: 'Write my elevator pitch.' }], temperature: 0.8 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ role }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
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
              <ul className="space-y-1">{result.tweaks.map((t, i) => <li key={i} className="text-slate-400 text-xs">• {t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Cover Letter Optimizer ────────────────────────────────────────────────────

function CoverLetterOptimizer({ onBack, resume, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [jd, setJd] = useState('')
  const [resumeText, setResumeText] = useState(resume || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Cover Letter Optimizer" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function generate() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.coverLetterOptimizer(jd, resumeText), messages: [{ role: 'user', content: 'Generate cover letters.' }], temperature: 0.8 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ jd: jd.slice(0, 80) }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Cover Letter Optimizer</h2>
      <p className="section-sub mb-5">3 punchy versions (60-120 words each) — Corporate, Creative, Casual.</p>
      <div className="space-y-3 mb-4">
        <textarea className="textarea-field h-28" placeholder="Paste the job description..." value={jd} onChange={e => setJd(e.target.value)} />
        <textarea className="textarea-field h-28" placeholder="Paste your resume or key experience..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
      </div>
      <button onClick={generate} disabled={loading || !isConnected || !jd.trim() || !resumeText.trim()} className="btn-primary mb-5">
        <FileText size={16} /> {loading ? 'Writing 3 versions...' : 'Generate Cover Letters'}
      </button>
      {result && (
        <div className="space-y-4 animate-in">
          {(result.keywordMatches?.length > 0 || result.missingKeywords?.length > 0) && (
            <div className="card">
              <h4 className="font-display font-semibold text-white text-sm mb-3">Keyword Analysis</h4>
              {result.keywordMatches?.length > 0 && (
                <div className="mb-3">
                  <span className="text-green-400 text-xs font-display font-semibold">✓ Matched in your resume</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">{result.keywordMatches.map((kw, i) => <span key={i} className="badge-green">{kw}</span>)}</div>
                </div>
              )}
              {result.missingKeywords?.length > 0 && (
                <div>
                  <span className="text-yellow-400 text-xs font-display font-semibold">⚠ Consider weaving in</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">{result.missingKeywords.map((kw, i) => <span key={i} className="badge-yellow">{kw}</span>)}</div>
                </div>
              )}
            </div>
          )}
          {result.letters?.length > 0 && (
            <div>
              <div className="flex gap-2 mb-3">
                {result.letters.map((l, i) => (
                  <button key={i} onClick={() => setActiveTab(i)} className={`flex-1 py-2 rounded-lg text-sm font-body border transition-all ${activeTab === i ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-navy-700 text-slate-400 border-navy-600 hover:border-slate-500'}`}>{l.tone}</button>
                ))}
              </div>
              {result.letters[activeTab] && (
                <div className="card border-teal-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-3">
                      <span className={`text-xs font-display font-semibold ${result.letters[activeTab].clarityScore >= 80 ? 'text-green-400' : result.letters[activeTab].clarityScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>Clarity {result.letters[activeTab].clarityScore}/100</span>
                      <span className={`text-xs font-display font-semibold ${result.letters[activeTab].confidenceScore >= 80 ? 'text-green-400' : result.letters[activeTab].confidenceScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>Confidence {result.letters[activeTab].confidenceScore}/100</span>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(result.letters[activeTab].body)} className="btn-ghost text-xs"><Copy size={13} /> Copy</button>
                  </div>
                  <p className="text-slate-200 text-sm font-body leading-relaxed whitespace-pre-wrap">{result.letters[activeTab].body}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Resume Checker ────────────────────────────────────────────────────────────

function ResumeChecker({ onBack, resume, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [resumeText, setResumeText] = useState(resume || '')
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Resume Checker" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function analyze() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.resumeChecker(resumeText, jd), messages: [{ role: 'user', content: 'Analyze my resume.' }], temperature: 0.4 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ resumeSlice: resumeText.slice(0, 80) }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Resume Checker</h2>
      <p className="section-sub mb-5">ATS scanner + recruiter lens — see your resume like they do.</p>
      <div className="space-y-3 mb-4">
        <textarea className="textarea-field h-40" placeholder="Paste your resume text here..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
        <textarea className="textarea-field h-20" placeholder="Job description (optional — enables gap analysis)..." value={jd} onChange={e => setJd(e.target.value)} />
      </div>
      <button onClick={analyze} disabled={loading || !isConnected || !resumeText.trim()} className="btn-primary mb-5">
        <ClipboardCheck size={16} /> {loading ? 'Analyzing...' : 'Check Resume'}
      </button>
      {result && (
        <div className="space-y-4 animate-in">
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center py-6">
              <div className={`font-display font-bold text-4xl mb-1 ${result.atsScore >= 80 ? 'text-green-400' : result.atsScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{result.atsScore}</div>
              <div className="text-slate-400 text-sm">ATS Score</div>
              <div className="text-slate-600 text-xs mt-1">Keyword matching</div>
            </div>
            <div className="card text-center py-6">
              <div className={`font-display font-bold text-4xl mb-1 ${result.recruiterScore >= 80 ? 'text-green-400' : result.recruiterScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{result.recruiterScore}</div>
              <div className="text-slate-400 text-sm">Recruiter Score</div>
              <div className="text-slate-600 text-xs mt-1">Human appeal</div>
            </div>
          </div>
          {result.redFlags?.length > 0 && (
            <div className="card border-red-500/20">
              <h4 className="font-display font-semibold text-white text-sm mb-3">🚩 Red Flags to Fix</h4>
              <div className="space-y-3">
                {result.redFlags.map((f, i) => (
                  <div key={i} className="bg-navy-900 rounded-xl p-3">
                    <p className="text-red-300 text-xs font-mono mb-1">"{f.original}"</p>
                    <p className="text-green-300 text-xs font-mono mb-1">→ "{f.fix}"</p>
                    <p className="text-slate-500 text-xs">{f.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.keywordGaps?.length > 0 && (
            <div className="card border-yellow-500/20">
              <h4 className="font-display font-semibold text-white text-sm mb-2">⚠️ Keyword Gaps</h4>
              <div className="flex flex-wrap gap-1.5">{result.keywordGaps.map((kw, i) => <span key={i} className="badge-yellow">{kw}</span>)}</div>
            </div>
          )}
          {result.strengths?.length > 0 && (
            <div className="card border-green-500/20">
              <h4 className="font-display font-semibold text-white text-sm mb-2">✅ Strengths</h4>
              <ul className="space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-slate-300 text-xs">• {s}</li>)}</ul>
            </div>
          )}
          {result.suggestions?.length > 0 && (
            <div className="card">
              <h4 className="font-display font-semibold text-white text-sm mb-2">💡 Suggestions</h4>
              <ul className="space-y-1">{result.suggestions.map((s, i) => <li key={i} className="text-slate-400 text-xs">• {s}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Visual Design Review ──────────────────────────────────────────────────────

function VisualResumeReview({ onBack, saveHistory, history, onDelete }) {
  const { callAI, isConnected, provider, PROVIDERS, bmacToken, apiKey } = useAI()
  const isDeepSeekActive = (bmacToken && !apiKey) || (apiKey && provider === PROVIDERS.DEEPSEEK)
  const imageInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="Visual Design Review" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function handleImageFile(e) {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) return
    const dataUrl = await new Promise((res, rej) => {
      const reader = new FileReader(); reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file)
    })
    setImagePreview(dataUrl); setImageData({ base64: dataUrl.split(',')[1], mediaType: file.type }); setResult(null); e.target.value = ''
  }

  async function analyze() {
    if (!imageData) return
    setAnalyzing(true); setResult(null)
    try {
      const prompt = 'Analyze this resume/CV image for visual design. Cover: (1) Overall layout and structure, (2) Color scheme and use of color, (3) Typography — fonts, sizes, hierarchy, (4) White space and readability, (5) Professional impression, (6) Specific visual improvements ranked by priority. Be specific and actionable.'
      const userContent = provider === PROVIDERS.ANTHROPIC
        ? [{ type: 'image', source: { type: 'base64', media_type: imageData.mediaType, data: imageData.base64 } }, { type: 'text', text: prompt }]
        : [{ type: 'image_url', image_url: { url: `data:${imageData.mediaType};base64,${imageData.base64}` } }, { type: 'text', text: prompt }]
      const raw = await callAI({ systemPrompt: 'You are an expert resume designer and career coach. Analyze resume images for visual design quality, layout, and professional impact. Provide structured, actionable feedback.', messages: [{ role: 'user', content: userContent }], temperature: 0.5 })
      setResult(raw); saveHistory({ fileName: 'resume image' }, { analysis: raw })
    } catch (err) {
      setResult(`⚠️ Visual analysis failed: ${err.message || 'Unknown error'}. Make sure you are using a vision-capable model (e.g. gpt-4o).`)
    }
    setAnalyzing(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Visual Design Review</h2>
      <p className="section-sub mb-3">Upload a screenshot or photo of your resume — AI analyzes design, layout, colors, and visual impact.</p>
      {isDeepSeekActive ? (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-5 text-amber-300 text-sm">
          <span className="mt-0.5">⚠️</span>
          <span>Visual Design Review requires a vision-capable model. <strong>DeepSeek does not support image analysis.</strong> Connect your own <strong>OpenAI</strong> (gpt-4o) or <strong>Anthropic (Claude)</strong> API key in Settings to use this feature.</span>
        </div>
      ) : (
        <p className="text-xs text-slate-500 mb-5">Requires a vision-capable model — OpenAI gpt-4o or Anthropic Claude. Not available with DeepSeek.</p>
      )}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      {!imagePreview ? (
        <button onClick={() => imageInputRef.current?.click()} className="w-full border-2 border-dashed border-navy-600 hover:border-teal-500/50 rounded-2xl p-12 flex flex-col items-center gap-3 text-slate-500 hover:text-slate-400 transition-all mb-4">
          <Camera size={32} />
          <span className="text-sm font-body">Click to upload resume screenshot or photo</span>
          <span className="text-xs">PNG, JPG, WEBP supported</span>
        </button>
      ) : (
        <div className="mb-4">
          <div className="rounded-2xl overflow-hidden bg-navy-900 mb-3"><img src={imagePreview} alt="Resume preview" className="w-full max-h-72 object-contain" /></div>
          <div className="flex gap-2">
            <button onClick={() => imageInputRef.current?.click()} className="btn-secondary text-xs flex-1 justify-center"><Camera size={13}/> Change Image</button>
            <button onClick={() => { setImagePreview(null); setImageData(null); setResult(null) }} className="btn-ghost text-xs text-red-400 hover:text-red-300"><X size={13}/> Remove</button>
          </div>
        </div>
      )}
      <button onClick={analyze} disabled={!imageData || analyzing || !isConnected || isDeepSeekActive} className="btn-primary w-full justify-center mb-5">
        <Camera size={16} /> {analyzing ? 'Analyzing design...' : 'Analyze Visual Design'}
      </button>
      {result && (
        <div className="card border-indigo-500/20 bg-indigo-500/5 animate-in">
          <h4 className="font-display font-semibold text-white text-sm mb-3">📸 Visual Design Analysis</h4>
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  )
}

// ─── LinkedIn Auditor ──────────────────────────────────────────────────────────

function LinkedInAuditor({ onBack, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [profileText, setProfileText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) return <ToolHistoryView history={history} toolLabel="LinkedIn Auditor" onBack={() => setShowHistory(false)} onDelete={onDelete} />

  async function audit() {
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.linkedInAuditor(profileText), messages: [{ role: 'user', content: 'Audit my LinkedIn profile.' }], temperature: 0.5 })
      const parsed = tryParseJSON(raw)
      if (parsed) { setResult(parsed); saveHistory({ profileSlice: profileText.slice(0, 80) }, parsed) }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> Tools</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">LinkedIn Profile Auditor</h2>
      <p className="section-sub mb-5">Paste your headline, About, and experience. Get a score and quick wins.</p>
      <textarea className="textarea-field h-40 mb-4" placeholder="Paste your LinkedIn headline, About section, and key experience highlights..." value={profileText} onChange={e => setProfileText(e.target.value)} />
      <button onClick={audit} disabled={loading || !isConnected || !profileText.trim()} className="btn-primary mb-5">
        <Globe size={16} /> {loading ? 'Auditing...' : 'Audit Profile'}
      </button>
      {result && (
        <div className="space-y-4 animate-in">
          <div className="card text-center py-6">
            <div className={`font-display font-bold text-5xl mb-2 ${result.overallScore >= 80 ? 'text-green-400' : result.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{result.overallScore}</div>
            <div className="text-slate-400 text-sm">Overall LinkedIn Score</div>
            {result.ctaPresent === false && <div className="text-yellow-400 text-xs mt-2">⚠ No call-to-action detected</div>}
          </div>
          {result.summary && <div className="card border-indigo-500/20 bg-indigo-500/5"><p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p></div>}
          {result.sections && Object.entries(result.sections).map(([key, section]) =>
            key !== 'keywords' && section.score !== undefined ? (
              <div key={key} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-display font-semibold text-white text-sm capitalize">{key}</h4>
                  <span className={`font-display font-bold text-lg ${section.score >= 80 ? 'text-green-400' : section.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{section.score}/100</span>
                </div>
                <p className="text-slate-400 text-xs mb-2">{section.feedback}</p>
                {section.suggestion && <p className="text-teal-400 text-xs">💡 {section.suggestion}</p>}
              </div>
            ) : null
          )}
          {result.sections?.keywords && (
            <div className="card">
              <h4 className="font-display font-semibold text-white text-sm mb-3">Keywords</h4>
              {result.sections.keywords.found?.length > 0 && (
                <div className="mb-3">
                  <span className="text-green-400 text-xs font-display font-semibold">✓ Already there</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">{result.sections.keywords.found.map((kw, i) => <span key={i} className="badge-green">{kw}</span>)}</div>
                </div>
              )}
              {result.sections.keywords.missing?.length > 0 && (
                <div>
                  <span className="text-yellow-400 text-xs font-display font-semibold">⚠ Add these for discoverability</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">{result.sections.keywords.missing.map((kw, i) => <span key={i} className="badge-yellow">{kw}</span>)}</div>
                </div>
              )}
            </div>
          )}
          {result.quickWins?.length > 0 && (
            <div className="card border-teal-500/20">
              <h4 className="font-display font-semibold text-white text-sm mb-2">⚡ Quick Wins</h4>
              <ul className="space-y-1">{result.quickWins.map((w, i) => <li key={i} className="text-slate-300 text-xs">• {w}</li>)}</ul>
            </div>
          )}
          {result.strengths?.length > 0 && (
            <div className="card border-green-500/20">
              <h4 className="font-display font-semibold text-white text-sm mb-2">✅ Already Strong</h4>
              <ul className="space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-slate-300 text-xs">• {s}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
