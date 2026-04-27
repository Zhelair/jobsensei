import React, { useState, useRef, useEffect } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { Target, Gauge, Mail, Megaphone, ArrowLeft, Copy, ChevronRight, History, Clock, FileText, ClipboardCheck, Globe, Camera, X, Search, Star, Zap, Trash2, Mic } from 'lucide-react'
import GapAnalysis from '../GapAnalysis/GapAnalysis'
import STARBuilder from '../STARBuilder/STARBuilder'
import InterviewSimulator from '../InterviewSimulator/InterviewSimulator'

const HUBS = {
  'interview-prep': {
    title: 'Interview Prep',
    subtitle: 'Practice interviews, predict likely questions, and sharpen how you show up.',
    toolIds: ['interview', 'predictor', 'star', 'tone', 'followup', 'pitch'],
    recentTitle: 'Recent Prep History',
    emptyHistory: 'No interview prep history yet.',
  },
  'prep-tools': {
    title: 'Prep Tools',
    subtitle: 'Documents, fit checks, profile polish, and support tools for your job hunt.',
    toolIds: ['gap', 'coverletter', 'resumechecker', 'linkedin', 'visualreview', 'transferable'],
    recentTitle: 'Recent Results',
    emptyHistory: 'No prep tool history yet.',
  },
}

const TOOL_CARDS = [
  { id: 'interview', icon: Mic, label: 'Interview Simulator', desc: 'Run mock interviews with saved session history' },
  { id: 'gap', icon: Search, label: 'Gap Analysis', desc: 'Match to JD, score application, detect red flags' },
  { id: 'star', icon: Star, label: 'STAR Builder', desc: 'Structure interview answers and build your story bank' },
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
  interview: 'Interview Simulator',
  gap: 'Gap Analysis',
  star: 'STAR Builder',
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

function applicationLabel(app) {
  return `${app.company}${app.role ? ` - ${app.role}` : ''}`
}

function hasResearchData(noteData = {}) {
  return ['wowFacts', 'techStack', 'culture', 'openQ'].some(key => (noteData[key] || '').trim())
}

function hasPrepNotes(noteData = {}) {
  return ['prepNotes', 'people', 'theyMentioned'].some(key => (noteData[key] || '').trim())
}

export default function Tools({ mode = 'prep-tools' }) {
  const [activeTool, setActiveTool] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [recentFilter, setRecentFilter] = useState('all')
  const [showContextJd, setShowContextJd] = useState(false)
  const hub = HUBS[mode] || HUBS['prep-tools']
  const isInterviewHub = mode === 'interview-prep'
  const { setActiveSection, clearPendingToolRequest, pendingToolRequest } = useApp()
  const {
    getProjectData,
    updateProjectData,
    activeApplication,
    activeApplicationId,
    setActiveApplication,
  } = useProject()
  const resume = getProjectData('resume')
  const applications = getProjectData('applications') || []
  const toolsHistory = getProjectData('toolsHistory') || []
  const gapResults = getProjectData('gapResults') || []
  const interviewSessions = getProjectData('interviewSessions') || []
  const starStories = getProjectData('starStories') || []
  const companyNotes = getProjectData('companyNotes') || {}
  const hubCards = hub.toolIds
    .map(id => TOOL_CARDS.find(tool => tool.id === id))
    .filter(Boolean)
  const activeContext = activeApplication ? {
    application: activeApplication,
    jd: activeApplication.jdText || '',
    notes: companyNotes[activeApplication.id] || {},
  } : null
  const activeHasResearch = hasResearchData(activeContext?.notes)
  const activeHasNotes = hasPrepNotes(activeContext?.notes)
  const currentSection = isInterviewHub ? SECTIONS.INTERVIEW : SECTIONS.TOOLS

  useEffect(() => {
    if (!pendingToolRequest) return
    if (pendingToolRequest.section !== currentSection) return
    if (!hub.toolIds.includes(pendingToolRequest.toolId)) return
    setActiveTool(pendingToolRequest.toolId)
    clearPendingToolRequest()
  }, [pendingToolRequest, currentSection, hub.toolIds, clearPendingToolRequest])

  function switchActiveApplication(nextId) {
    const nextApp = applications.find(app => app.id === nextId)
    setActiveApplication(nextId)
    setShowContextJd(false)
    if (nextApp?.jdText?.trim()) {
      updateProjectData('currentJD', nextApp.jdText)
    }
  }

  function saveHistory(tool, toolLabel, inputs, result) {
    const entry = {
      id: generateId(),
      date: new Date().toISOString(),
      tool,
      toolLabel,
      inputs,
      result,
      applicationId: activeContext?.application?.id || null,
      applicationLabel: activeContext?.application
        ? `${activeContext.application.company}${activeContext.application.role ? ` - ${activeContext.application.role}` : ''}`
        : null,
    }
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

  function deleteInterviewSession(id) {
    updateProjectData('interviewSessions', interviewSessions.filter(session => session.id !== id))
    if (selectedResult?.id === id) setSelectedResult(null)
  }

  function renderHubScreen(content, options = {}) {
    if (!isInterviewHub) return content
    return (
      <div className={options.fullHeight ? 'h-full' : 'overflow-y-auto h-full'}>
        {content}
      </div>
    )
  }

  // Normalize saved results into the shared shape
  const normalizedInterview = interviewSessions.map(session => ({
    id: session.id,
    date: session.date,
    tool: 'interview',
    toolLabel: 'Interview Simulator',
    inputs: { mode: session.mode, jd: session.jdSnippet || '' },
    result: {
      messages: session.messages,
      score: session.score,
      questionCount: session.questionCount,
      mode: session.mode,
    },
  }))
  const normalizedGap = gapResults.map(g => ({
    id: g.id, date: g.date, tool: 'gap', toolLabel: 'Gap Analysis',
    inputs: { jd: g.jdSnippet || '' },
    result: { gapResult: g.gapResult, scoreResult: g.scoreResult, redFlags: g.redFlags, tab: g.tab },
  }))
  const normalizedStar = starStories.map(s => ({
    id: s.id, date: s.date, tool: 'star', toolLabel: 'STAR Builder',
    inputs: { situation: s.situation || '' },
    result: { fullAnswer: s.fullAnswer, situation: s.situation, task: s.task, action: s.action, result: s.result, weaknesses: s.weaknesses, suggestedTags: s.suggestedTags, targetQuestions: s.targetQuestions },
  }))

  const allHistory = [...toolsHistory, ...normalizedInterview, ...normalizedGap, ...normalizedStar]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const relevantHistory = allHistory.filter(item => hub.toolIds.includes(item.tool))

  if (activeTool === 'interview') {
    return renderHubScreen(
      <InterviewSimulator onExit={() => setActiveTool(null)} hubLabel={hub.title} />,
      { fullHeight: true }
    )
  }
  if (activeTool === 'gap') return renderHubScreen(<GapAnalysis onBack={() => setActiveTool(null)} backLabel={hub.title} />)
  if (activeTool === 'star') return renderHubScreen(<STARBuilder onBack={() => setActiveTool(null)} backLabel={hub.title} />)

  if (activeTool === 'predictor') return renderHubScreen(<QuestionPredictor onBack={() => setActiveTool(null)} hubLabel={hub.title} resume={resume} activeContext={activeContext} saveHistory={(i, r) => saveHistory('predictor', 'Question Predictor', i, r)} history={historyFor('predictor')} onDelete={deleteHistory} />)
  if (activeTool === 'transferable') return renderHubScreen(<TransferableSkillsTool onBack={() => setActiveTool(null)} hubLabel={hub.title} resume={resume} saveHistory={(i, r) => saveHistory('transferable', 'Transferable Skills Coach', i, r)} history={historyFor('transferable')} onDelete={deleteHistory} />)
  if (activeTool === 'tone') return renderHubScreen(<ToneAnalyzer onBack={() => setActiveTool(null)} hubLabel={hub.title} saveHistory={(i, r) => saveHistory('tone', 'Tone Analyzer', i, r)} history={historyFor('tone')} onDelete={deleteHistory} />)
  if (activeTool === 'followup') return renderHubScreen(<FollowUpEmail onBack={() => setActiveTool(null)} hubLabel={hub.title} activeContext={activeContext} saveHistory={(i, r) => saveHistory('followup', 'Follow-up Email', i, r)} history={historyFor('followup')} onDelete={deleteHistory} />)
  if (activeTool === 'pitch') return renderHubScreen(<ElevatorPitch onBack={() => setActiveTool(null)} hubLabel={hub.title} resume={resume} saveHistory={(i, r) => saveHistory('pitch', 'Elevator Pitch', i, r)} history={historyFor('pitch')} onDelete={deleteHistory} />)
  if (activeTool === 'coverletter') return renderHubScreen(<CoverLetterOptimizer onBack={() => setActiveTool(null)} hubLabel={hub.title} resume={resume} activeContext={activeContext} saveHistory={(i, r) => saveHistory('coverletter', 'Cover Letter Optimizer', i, r)} history={historyFor('coverletter')} onDelete={deleteHistory} />)
  if (activeTool === 'resumechecker') return renderHubScreen(<ResumeChecker onBack={() => setActiveTool(null)} hubLabel={hub.title} resume={resume} activeContext={activeContext} saveHistory={(i, r) => saveHistory('resumechecker', 'Resume Checker', i, r)} history={historyFor('resumechecker')} onDelete={deleteHistory} />)
  if (activeTool === 'linkedin') return renderHubScreen(<LinkedInAuditor onBack={() => setActiveTool(null)} hubLabel={hub.title} saveHistory={(i, r) => saveHistory('linkedin', 'LinkedIn Auditor', i, r)} history={historyFor('linkedin')} onDelete={deleteHistory} />)
  if (activeTool === 'visualreview') return renderHubScreen(<VisualResumeReview onBack={() => setActiveTool(null)} hubLabel={hub.title} saveHistory={(i, r) => saveHistory('visualreview', 'Visual Design Review', i, r)} history={historyFor('visualreview')} onDelete={deleteHistory} />)

  // Inline result detail view (clicked from Recent Results)
  if (selectedResult) {
    const isGap = selectedResult.tool === 'gap'
    const isInterview = selectedResult.tool === 'interview'
    const onDelete = isGap ? deleteGapResult : isInterview ? deleteInterviewSession : deleteHistory
    return renderHubScreen(
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
  const presentTools = [...new Set(relevantHistory.map(h => h.tool))]
  const activeFilters = ['all', ...presentTools.filter(t => FILTER_LABELS[t])]

  const filteredRecent = relevantHistory
    .filter(h => recentFilter === 'all' || h.tool === recentFilter)
    .slice(0, 8)

  return renderHubScreen(
    <div className="p-4 md:p-6 animate-in">
      <h2 className="section-title mb-1">{hub.title}</h2>
      <p className="section-sub mb-5">{hub.subtitle}</p>
 
      {applications.length > 0 && (
        <div className="card border-teal-500/20 bg-teal-500/5 mb-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-white text-sm font-display font-semibold">Active Application</span>
                {activeContext?.application?.stage && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-800 text-slate-300">
                    {activeContext.application.stage}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-[11px] border ${activeContext?.jd?.trim() ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
                  {activeContext?.jd?.trim() ? 'JD ready' : 'No JD'}
                </span>
                {activeHasResearch && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Research
                  </span>
                )}
                {activeHasNotes && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                    Notes
                  </span>
                )}
              </div>
              <div className="text-teal-300 text-sm mt-2">
                {activeContext?.application ? applicationLabel(activeContext.application) : 'Choose a tracker application'}
              </div>
              <div className="text-slate-400 text-xs mt-1">
                {activeContext?.jd?.trim()
                  ? `${hub.title} will use this tracker application first.`
                  : 'Pick a tracker job and add a JD there to prefill the main tools.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {(applications.length > 1 || !activeApplicationId) && (
                <select
                  className="input-field h-10 min-w-[220px] text-xs"
                  value={activeApplicationId || ''}
                  onChange={e => switchActiveApplication(e.target.value)}
                >
                  {!activeApplicationId && <option value="">Choose tracker application</option>}
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {applicationLabel(app)}
                    </option>
                  ))}
                </select>
              )}
              {activeContext?.jd?.trim() && (
                <button onClick={() => setShowContextJd(prev => !prev)} className="btn-ghost text-xs">
                  {showContextJd ? 'Hide JD' : 'Preview JD'}
                </button>
              )}
              <button onClick={() => setActiveSection(SECTIONS.APPLICATIONS)} className="btn-ghost text-xs">
                Open Tracker
              </button>
            </div>
          </div>

          {showContextJd && activeContext?.jd?.trim() && (
            <div className="mt-3 rounded-2xl border border-navy-600 bg-navy-950/70 p-3">
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto pr-1">
                {activeContext.jd}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {hubCards.map(({ id, icon: Icon, label, desc }) => (
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

      {filteredRecent.length > 0 || relevantHistory.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-display font-semibold text-slate-400 text-sm mb-3 flex items-center gap-2">
            <Clock size={14}/> {hub.recentTitle}
          </h3>

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
            <p className="text-slate-500 text-sm">{recentFilter === 'all' ? hub.emptyHistory : 'No results match this filter.'}</p>
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

function ActiveJobContextCard({ activeContext, note }) {
  if (!activeContext?.application) return null

  const label = `${activeContext.application.company}${activeContext.application.role ? ` - ${activeContext.application.role}` : ''}`
  const hasJD = !!activeContext.jd.trim()

  return (
    <div className="card border-teal-500/20 bg-teal-500/5 mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-white text-sm font-display font-semibold">Active Job Context</div>
          <div className="text-teal-300 text-sm">{label}</div>
          <div className="text-slate-400 text-xs mt-1">
            {note || (hasJD
              ? 'Using the tracker JD here first. You can still edit the fields below for this run.'
              : 'This application is active, but it does not have a saved JD yet.')}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${hasJD ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
          {hasJD ? 'JD attached' : 'No JD saved'}
        </span>
      </div>
    </div>
  )
}

function HistorySummary({ item }) {
  if (item.tool === 'interview')
    return <p className="text-slate-400 text-xs truncate">{item.result?.mode || 'Interview'} · {item.result?.questionCount || 0} exchanges{item.result?.score != null ? ` · ${item.result.score}/10` : ''}</p>
  if (item.tool === 'gap')
    return <p className="text-slate-400 text-xs truncate">JD: {item.inputs?.jd || '—'}</p>
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
  if (item.tool === 'star' && item.inputs?.situation)
    return <p className="text-slate-400 text-xs truncate">{item.inputs.situation}</p>
  return null
}

// ─── Full history result renderer ─────────────────────────────────────────────

function FullHistoryResult({ item }) {
  if (item.tool === 'interview' && item.result) {
    const msgs = item.result.messages || []
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.result.mode && <span className="badge badge-indigo">{item.result.mode}</span>}
          {item.result.score != null && (
            <span className={`badge ${item.result.score >= 8 ? 'badge-green' : item.result.score >= 6 ? 'badge-yellow' : 'badge-red'}`}>
              {Number.isInteger(item.result.score) ? item.result.score : Number(item.result.score).toFixed(1)}/10
            </span>
          )}
          <span className="badge badge-slate">{item.result.questionCount || 0} exchanges</span>
        </div>
        <div className="space-y-2">
          {msgs.map((m, i) => (
            <div key={i} className={`rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'chat-user ml-auto max-w-[85%]' : 'chat-ai max-w-[85%]'}`}>
              <span className="text-xs opacity-60 block mb-1 font-display">{m.role === 'user' ? 'You' : 'Jordan Mitchell'}</span>
              <span className="whitespace-pre-wrap">{m.content}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (item.tool === 'gap' && item.result) {
    const { gapResult, scoreResult, redFlags } = item.result
    return (
      <div className="space-y-4">
        {scoreResult && (
          <div className="space-y-3">
            <div className="card flex items-center gap-4">
              <div className={`text-3xl font-display font-bold ${scoreResult.overallScore >= 75 ? 'text-green-400' : scoreResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {scoreResult.overallScore}%
              </div>
              <div>
                <div className="text-white font-medium text-sm">{scoreResult.verdict}</div>
                {scoreResult.recommendation && <div className="text-slate-400 text-xs mt-0.5">{scoreResult.recommendation}</div>}
                {scoreResult.applyAdvice && <span className={`badge mt-1 ${scoreResult.applyAdvice?.includes('Yes') ? 'badge-green' : 'badge-yellow'}`}>{scoreResult.applyAdvice}</span>}
              </div>
            </div>
            {scoreResult.breakdown && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(scoreResult.breakdown).map(([k, v]) => (
                  <div key={k} className="card text-center">
                    <div className={`font-display font-bold text-2xl mb-1 ${v >= 80 ? 'text-green-400' : v >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{v}</div>
                    <div className="text-slate-400 text-xs capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                ))}
              </div>
            )}
            {scoreResult.topStrengths?.length > 0 && <div className="flex flex-wrap gap-2">{scoreResult.topStrengths.map((s, i) => <span key={i} className="badge-green">{s}</span>)}</div>}
            {scoreResult.keyGaps?.length > 0 && <div className="flex flex-wrap gap-2">{scoreResult.keyGaps.map((s, i) => <span key={i} className="badge-red">{s}</span>)}</div>}
          </div>
        )}
        {redFlags?.length > 0 && (
          <div className="card border-red-500/20">
            <h4 className="font-display font-semibold text-white text-sm mb-2">🚩 Red Flags</h4>
            <ul className="space-y-1">{redFlags.map((f, i) => <li key={i} className="text-red-300 text-xs">• {f.flag || f.detail || String(f)}</li>)}</ul>
          </div>
        )}
        {gapResult && (
          <div className="card">
            <h4 className="font-display font-semibold text-white text-sm mb-2">Gap Analysis</h4>
            <div className="space-y-1">
              {String(gapResult).split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h3 key={i} className="font-display font-bold text-white text-base mt-4 mb-2">{line.slice(3)}</h3>
                if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1">• {line.slice(2)}</p>
                if (line.trim() === '') return <div key={i} className="h-1" />
                return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
              })}
            </div>
          </div>
        )}
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
    const r = item.result
    return (
      <div className="space-y-4">
        <div className="card text-center py-6">
          <div className={`font-display font-bold text-5xl mb-2 ${r.overallScore >= 80 ? 'text-green-400' : r.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{r.overallScore}</div>
          <div className="text-slate-400 text-sm">Overall LinkedIn Score</div>
          {r.ctaPresent === false && <div className="text-yellow-400 text-xs mt-2">⚠ No call-to-action detected</div>}
        </div>
        {r.summary && <div className="card border-indigo-500/20 bg-indigo-500/5"><p className="text-slate-200 text-sm leading-relaxed">{r.summary}</p></div>}
        {r.sections && Object.entries(r.sections).map(([key, section]) =>
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
        {r.sections?.keywords && (
          <div className="card">
            <h4 className="font-display font-semibold text-white text-sm mb-3">Keywords</h4>
            {r.sections.keywords.found?.length > 0 && (
              <div className="mb-3">
                <span className="text-green-400 text-xs font-display font-semibold">✓ Already there</span>
                <div className="flex flex-wrap gap-1.5 mt-2">{r.sections.keywords.found.map((kw, i) => <span key={i} className="badge-green">{kw}</span>)}</div>
              </div>
            )}
            {r.sections.keywords.missing?.length > 0 && (
              <div>
                <span className="text-yellow-400 text-xs font-display font-semibold">⚠ Add these for discoverability</span>
                <div className="flex flex-wrap gap-1.5 mt-2">{r.sections.keywords.missing.map((kw, i) => <span key={i} className="badge-yellow">{kw}</span>)}</div>
              </div>
            )}
          </div>
        )}
        {r.quickWins?.length > 0 && (
          <div className="card border-teal-500/20">
            <h4 className="font-display font-semibold text-white text-sm mb-2">⚡ Quick Wins</h4>
            <ul className="space-y-1">{r.quickWins.map((w, i) => <li key={i} className="text-slate-300 text-xs">• {w}</li>)}</ul>
          </div>
        )}
        {r.strengths?.length > 0 && (
          <div className="card border-green-500/20">
            <h4 className="font-display font-semibold text-white text-sm mb-2">✅ Already Strong</h4>
            <ul className="space-y-1">{r.strengths.map((s, i) => <li key={i} className="text-slate-300 text-xs">• {s}</li>)}</ul>
          </div>
        )}
      </div>
    )
  }
  if (item.tool === 'star' && item.result) {
    const r = item.result
    return (
      <div className="space-y-4">
        <div className="card border-teal-500/20">
          <h3 className="font-display font-semibold text-white text-sm mb-3">Interview-Ready Answer</h3>
          <p className="text-slate-200 text-sm font-body leading-relaxed">{r.fullAnswer}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[['S','Situation',r.situation,'teal'],['T','Task',r.task,'indigo'],['A','Action',r.action,'teal'],['R','Result',r.result,'indigo']].map(([l,label,content,c]) => (
            <div key={label} className="card">
              <div className={`w-7 h-7 rounded-lg mb-2 flex items-center justify-center font-display font-bold text-sm ${c==='teal'?'bg-teal-500/20 text-teal-400':'bg-indigo-500/20 text-indigo-400'}`}>{l}</div>
              <div className="text-slate-400 text-xs mb-1">{label}</div>
              <p className="text-slate-200 text-sm">{content}</p>
            </div>
          ))}
        </div>
        {r.weaknesses?.length > 0 && (
          <div className="card border-yellow-500/20 bg-yellow-500/5">
            <div className="text-yellow-400 text-sm font-display font-semibold mb-2">⚠️ Areas to strengthen</div>
            {r.weaknesses.map((w, i) => <p key={i} className="text-slate-400 text-xs">• {w}</p>)}
          </div>
        )}
        {(r.suggestedTags?.length > 0 || r.targetQuestions?.length > 0) && (
          <div className="card">
            {r.suggestedTags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">{r.suggestedTags.map((t,i) => <span key={i} className="badge-indigo text-xs">{t}</span>)}</div>
            )}
            {r.targetQuestions?.length > 0 && (
              <>
                <div className="text-slate-400 text-xs mb-1">Answers questions like:</div>
                {r.targetQuestions.map((q,i) => <p key={i} className="text-slate-300 text-xs">• {q}</p>)}
              </>
            )}
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

function TransferableSkillsTool({ onBack, hubLabel = 'Back', resume, saveHistory, history, onDelete }) {
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
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

function QuestionPredictor({ onBack, hubLabel = 'Back', resume, activeContext, saveHistory, history, onDelete }) {
  const { profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [jd, setJd] = useState(activeContext?.jd || '')
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Interview Question Predictor</h2>
      <p className="section-sub mb-5">See the 10 most likely questions before you walk in.</p>
      <ActiveJobContextCard activeContext={activeContext} />
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

function ToneAnalyzer({ onBack, hubLabel = 'Back', saveHistory, history, onDelete }) {
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
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

function FollowUpEmail({ onBack, hubLabel = 'Back', activeContext, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [company, setCompany] = useState(activeContext?.application?.company || '')
  const [interviewer, setInterviewer] = useState('')
  const [role, setRole] = useState(activeContext?.application?.role || '')
  const [notes, setNotes] = useState(activeContext?.notes?.prepNotes || '')
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Follow-up Email</h2>
      <p className="section-sub mb-5">Generate the perfect post-interview thank you email.</p>
      <ActiveJobContextCard activeContext={activeContext} note="Company, role, and prep notes were pulled from your active tracker application. Add interviewer details below." />
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

function ElevatorPitch({ onBack, hubLabel = 'Back', resume, saveHistory, history, onDelete }) {
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
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

function CoverLetterOptimizer({ onBack, hubLabel = 'Back', resume, activeContext, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [jd, setJd] = useState(activeContext?.jd || '')
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Cover Letter Optimizer</h2>
      <p className="section-sub mb-5">3 punchy versions (60-120 words each) — Corporate, Creative, Casual.</p>
      <ActiveJobContextCard activeContext={activeContext} />
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

function ResumeChecker({ onBack, hubLabel = 'Back', resume, activeContext, saveHistory, history, onDelete }) {
  const { callAI, isConnected } = useAI()
  const [resumeText, setResumeText] = useState(resume || '')
  const [jd, setJd] = useState(activeContext?.jd || '')
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs"><History size={14}/> History ({history.length})</button>
        )}
      </div>
      <h2 className="section-title mb-1">Resume Checker</h2>
      <p className="section-sub mb-5">ATS scanner + recruiter lens — see your resume like they do.</p>
      <ActiveJobContextCard activeContext={activeContext} />
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

function VisualResumeReview({ onBack, hubLabel = 'Back', saveHistory, history, onDelete }) {
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
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

function LinkedInAuditor({ onBack, hubLabel = 'Back', saveHistory, history, onDelete }) {
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {hubLabel}</button>
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
