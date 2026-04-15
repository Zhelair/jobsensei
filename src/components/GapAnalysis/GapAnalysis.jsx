import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, matchColor, generateId } from '../../utils/helpers'
import ScoreRing from '../shared/ScoreRing'
import { Search, AlertTriangle, Zap, Save, Clock, Trash2, ArrowLeft } from 'lucide-react'

const TABS = ['Gap Analysis', 'App Scoring', 'Red Flags']

function normalizeStudyTopic(value = '') {
  return value
    .replace(/^[-*•]\s*/, '')
    .replace(/\((Quick Learn|Needs Framing|Significant Gap)\)\s*/ig, '')
    .replace(/^#+\s*/, '')
    .replace(/^Gaps to Address:?/i, '')
    .replace(/^Key Gaps:?/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.:;,\s-]+$/, '')
    .trim()
}

function extractStudyTopicsFromGapText(gapText = '') {
  const sectionMatch = gapText.match(/##\s+.*Gaps to Address[\s\S]*?(?=\n##\s|$)/i)
  const section = sectionMatch ? sectionMatch[0] : gapText

  return section
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('* '))
    .map(line => normalizeStudyTopic(line))
    .filter(Boolean)
}

export default function GapAnalysis({ onBack, backLabel = 'Back' }) {
  const { profile, drillMode, openLearningTopic } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData, activeApplication } = useProject()

  const resume = getProjectData('resume')
  const savedResults = getProjectData('gapResults')
  const topics = getProjectData('topics') || []
  const persistedJD = getProjectData('currentJD')
  const activeContextJD = activeApplication ? (activeApplication.jdText || '') : persistedJD

  const [tab, setTab] = useState(0)
  const [jd, setJd] = useState(activeContextJD || '')
  const [background, setBackground] = useState(
    resume || (profile ? `${profile.currentRole}, ${profile.experience} experience in ${profile.industry}.` : '')
  )

  React.useEffect(() => {
    setJd(activeContextJD || '')
  }, [activeApplication?.id, activeContextJD])

  // Persist JD to project only when no tracker application is driving context
  React.useEffect(() => {
    if (activeApplication?.id) return
    const t = setTimeout(() => updateProjectData('currentJD', jd), 600)
    return () => clearTimeout(t)
  }, [jd, activeApplication?.id])
  const [loading, setLoading] = useState(false)
  const [gapResult, setGapResult] = useState('')
  const [scoreResult, setScoreResult] = useState(null)
  const [redFlags, setRedFlags] = useState(null)
  const [error, setError] = useState('')
  const [studyMsg, setStudyMsg] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  React.useEffect(() => {
    if (resume && !background) setBackground(resume)
  }, [resume])

  async function runGapAnalysis() {
    if (!jd.trim() || !background.trim()) return
    setLoading(true); setError(''); setGapResult('')
    try {
      let full = ''
      await callAI({
        systemPrompt: prompts.gapAnalysis(background, jd, drillMode),
        messages: [{ role: 'user', content: 'Analyze the gap.' }],
        temperature: 0.6,
        onChunk: (_, acc) => { full = acc; setGapResult(acc) },
      })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function runScoring() {
    if (!jd.trim() || !background.trim()) return
    setLoading(true); setError(''); setScoreResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.applicationScoring(background, jd), messages: [{ role: 'user', content: 'Score.' }], temperature: 0.3 })
      const parsed = tryParseJSON(raw)
      if (parsed) setScoreResult(parsed)
      else setError('Could not parse result. Try again.')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function runRedFlags() {
    if (!jd.trim()) return
    setLoading(true); setError(''); setRedFlags(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.redFlagDetector(jd), messages: [{ role: 'user', content: 'Analyze.' }], temperature: 0.4 })
      const parsed = tryParseJSON(raw)
      if (parsed) setRedFlags(parsed)
      else setError('Could not parse. Try again.')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  function saveResult() {
    if (!gapResult && !scoreResult) return
    const entry = {
      id: generateId(),
      date: new Date().toISOString(),
      tab: TABS[tab],
      jdSnippet: jd.slice(0, 120),
      gapResult: tab === 0 ? gapResult : null,
      scoreResult: tab === 1 ? scoreResult : null,
      redFlags: tab === 2 ? redFlags : null,
      applicationId: activeApplication?.id || null,
      applicationLabel: activeApplication
        ? `${activeApplication.company}${activeApplication.role ? ` - ${activeApplication.role}` : ''}`
        : null,
    }
    updateProjectData('gapResults', [...savedResults, entry])
  }

  function deleteResult(id) {
    updateProjectData('gapResults', savedResults.filter(r => r.id !== id))
  }

  function loadResult(entry) {
    if (entry.gapResult) { setGapResult(entry.gapResult); setTab(0) }
    if (entry.scoreResult) { setScoreResult(entry.scoreResult); setTab(1) }
    if (entry.redFlags) { setRedFlags(entry.redFlags); setTab(2) }
    setShowHistory(false)
  }

  function addStudyTopic(topicLabel) {
    const normalizedTitle = normalizeStudyTopic(topicLabel)
    if (!normalizedTitle) return

    const existingTopic = topics.find(topic => topic.title.toLowerCase() === normalizedTitle.toLowerCase())
    if (existingTopic) {
      if (existingTopic.status === 'Not Started') {
        updateProjectData(
          'topics',
          topics.map(topic => topic.id === existingTopic.id ? { ...topic, status: 'In Progress' } : topic)
        )
      }
      openLearningTopic(existingTopic.id, 'tutor')
      setStudyMsg(`Opened study topic: ${existingTopic.title}`)
      return
    }

    const newTopic = {
      id: generateId(),
      title: normalizedTitle,
      category: 'Career',
      difficulty: 'Intermediate',
      status: 'In Progress',
      messages: [],
      quizScores: [],
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReview: null,
      source: 'gap-analysis',
      applicationId: activeApplication?.id || null,
      applicationLabel: activeApplication
        ? `${activeApplication.company}${activeApplication.role ? ` - ${activeApplication.role}` : ''}`
        : '',
    }

    updateProjectData('topics', [...topics, newTopic])
    openLearningTopic(newTopic.id, 'tutor')
    setStudyMsg(`Added study topic: ${newTopic.title}`)
  }

  const suggestedStudyTopics = Array.from(new Set([
    ...(scoreResult?.keyGaps || []),
    ...extractStudyTopicsFromGapText(gapResult || ''),
  ].map(normalizeStudyTopic).filter(Boolean).map(value => value.toLowerCase()))).map(lowered => {
    const original = [...(scoreResult?.keyGaps || []), ...extractStudyTopicsFromGapText(gapResult || '')]
      .find(item => normalizeStudyTopic(item).toLowerCase() === lowered)
    return normalizeStudyTopic(original || lowered)
  }).slice(0, 5)

  const severityClass = { low: 'badge-teal', medium: 'badge-yellow', high: 'badge-red' }

  if (showHistory) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={() => setShowHistory(false)} className="btn-ghost mb-4"><ArrowLeft size={16} /> Back</button>
      <h2 className="section-title mb-1">Saved Analyses</h2>
      <p className="section-sub mb-4">{savedResults.length} saved in this project</p>
      {savedResults.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No saved analyses yet. Run one and click Save.</div>
      ) : (
        <div className="space-y-2">
          {[...savedResults].reverse().map(r => (
            <div key={r.id} className="card-hover flex items-center gap-3">
              <button onClick={() => loadResult(r)} className="flex-1 text-left">
                <div className="text-white text-sm font-body font-medium">{r.tab}</div>
                <div className="text-slate-500 text-xs mt-0.5">{new Date(r.date).toLocaleDateString()} · {r.jdSnippet}...</div>
                {r.scoreResult && <span className={`badge mt-1 ${r.scoreResult.overallScore >= 75 ? 'badge-green' : r.scoreResult.overallScore >= 50 ? 'badge-yellow' : 'badge-red'}`}>{r.scoreResult.overallScore}% · {r.scoreResult.verdict}</span>}
              </button>
              <button onClick={() => deleteResult(r.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-in">
      {onBack && (
        <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> {backLabel}</button>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Gap Analysis</h2>
          <p className="section-sub">Analyze fit, score applications, detect red flags.</p>
        </div>
        <button onClick={() => setShowHistory(true)} className="btn-ghost text-xs">
          <Clock size={14} /> History ({savedResults.length})
        </button>
      </div>

      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl mb-5">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all ${tab === i ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
        ))}
      </div>

      {activeApplication && (
        <div className="card border-teal-500/20 bg-teal-500/5 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-white text-sm font-display font-semibold">Active Job Context</div>
              <div className="text-teal-300 text-sm">{activeApplication.company}{activeApplication.role ? ` - ${activeApplication.role}` : ''}</div>
              <div className="text-slate-400 text-xs mt-1">
                {activeContextJD.trim()
                  ? 'Using the saved JD from Job Tracker. You can still edit the field below for this run.'
                  : 'This application is active, but it does not have a saved JD yet.'}
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${activeContextJD.trim() ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
              {activeContextJD.trim() ? 'JD attached' : 'No JD saved'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Job Description</label>
          <textarea className="textarea-field h-28" placeholder="Paste the job description..." value={jd} onChange={e => setJd(e.target.value)} />
        </div>
        {tab !== 2 && (
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Your Background {resume && <span className="text-teal-400 text-xs ml-1">← from resume</span>}</label>
            <textarea className="textarea-field h-20" placeholder="Describe your experience..." value={background} onChange={e => setBackground(e.target.value)} />
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={tab === 0 ? runGapAnalysis : tab === 1 ? runScoring : runRedFlags}
          disabled={loading || !isConnected || !jd.trim()}
          className="btn-primary">
          {tab === 0 ? <Search size={16} /> : tab === 1 ? <Zap size={16} /> : <AlertTriangle size={16} />}
          {loading ? 'Analyzing...' : tab === 0 ? 'Analyze Gap' : tab === 1 ? 'Score Application' : 'Detect Red Flags'}
        </button>
        {(gapResult || scoreResult || redFlags) && (
          <button onClick={saveResult} className="btn-secondary"><Save size={14} /> Save to Project</button>
        )}
      </div>

      {error && <div className="badge-red mb-4 py-2 px-3 rounded-xl">{error}</div>}
      {studyMsg && <div className="badge-green mb-4 py-2 px-3 rounded-xl">{studyMsg}</div>}

      {tab === 0 && gapResult && (
        <div className="space-y-4 animate-in">
          <div className="card">
          {gapResult.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h3 key={i} className="font-display font-bold text-white text-base mt-4 mb-2">{line.slice(3)}</h3>
            if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1">• {line.slice(2)}</p>
            if (line.trim() === '') return <div key={i} className="h-1" />
            return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
          })}
          </div>
          {suggestedStudyTopics.length > 0 && (
            <div className="card border-teal-500/20 bg-teal-500/5">
              <div className="text-white text-sm font-display font-semibold mb-1">Study from this analysis</div>
              <div className="text-slate-400 text-xs mb-3">Send the biggest gaps into Learning and open tutor mode right away.</div>
              <div className="flex flex-wrap gap-2">
                {suggestedStudyTopics.map(topic => (
                  <button key={topic} onClick={() => addStudyTopic(topic)} className="btn-secondary text-xs py-1.5 px-3">
                    Study: {topic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 1 && scoreResult && (
        <div className="card animate-in space-y-5">
          <div className="flex items-center gap-6">
            <ScoreRing score={scoreResult.overallScore} size={90} />
            <div>
              <div className={`text-xl font-display font-bold mb-1 ${scoreResult.overallScore >= 75 ? 'text-green-400' : scoreResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{scoreResult.verdict}</div>
              <div className="text-slate-400 text-sm">{scoreResult.recommendation}</div>
              <div className={`badge mt-2 ${scoreResult.applyAdvice?.includes('Yes') ? 'badge-green' : 'badge-yellow'}`}>{scoreResult.applyAdvice}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(scoreResult.breakdown || {}).map(([k, v]) => (
              <div key={k} className="bg-navy-900 rounded-xl p-3">
                <div className="text-slate-400 text-xs mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, backgroundColor: matchColor(v) }} />
                  </div>
                  <span className="text-white text-xs font-mono">{v}%</span>
                </div>
              </div>
            ))}
          </div>
          {scoreResult.topStrengths?.length > 0 && <div><div className="text-slate-400 text-xs mb-2">Top Strengths</div><div className="flex flex-wrap gap-2">{scoreResult.topStrengths.map((s, i) => <span key={i} className="badge-green">{s}</span>)}</div></div>}
          {scoreResult.keyGaps?.length > 0 && (
            <div className="space-y-3">
              <div><div className="text-slate-400 text-xs mb-2">Key Gaps</div><div className="flex flex-wrap gap-2">{scoreResult.keyGaps.map((s, i) => <span key={i} className="badge-red">{s}</span>)}</div></div>
              <div>
                <div className="text-slate-400 text-xs mb-2">Study These Gaps</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedStudyTopics.map(topic => (
                    <button key={topic} onClick={() => addStudyTopic(topic)} className="btn-secondary text-xs py-1.5 px-3">
                      Study: {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 2 && redFlags && (
        <div className="space-y-2 animate-in">
          {redFlags.map((flag, i) => (
            <div key={i} className="card flex gap-3">
              <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${flag.severity === 'high' ? 'text-red-400' : flag.severity === 'medium' ? 'text-yellow-400' : 'text-teal-400'}`} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-body font-medium">{flag.flag}</span>
                  <span className={`badge ${severityClass[flag.severity] || 'badge-slate'}`}>{flag.severity}</span>
                  <span className="badge-slate">{flag.category}</span>
                </div>
                <p className="text-slate-400 text-xs">{flag.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
