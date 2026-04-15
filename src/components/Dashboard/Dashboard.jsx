import React, { useEffect, useState } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { prompts } from '../../utils/prompts'
import { generateId } from '../../utils/helpers'
import { Mic, Search, BookOpen, Plus, TrendingUp, Award, Target, Sparkles, FolderOpen } from 'lucide-react'
import { isDueToday } from '../../utils/spacedRepetition'

function applicationLabel(app) {
  return `${app.company}${app.role ? ` - ${app.role}` : ''}`
}

function hasResearchData(noteData = {}) {
  return ['wowFacts', 'techStack', 'culture', 'openQ'].some(key => (noteData[key] || '').trim())
}

function hasPrepNotes(noteData = {}) {
  return ['prepNotes', 'people', 'theyMentioned'].some(key => (noteData[key] || '').trim())
}

export default function Dashboard() {
  const { setActiveSection, profile, stats } = useApp()
  const { callAI, isConnected } = useAI()
  const {
    activeProject,
    activeApplication,
    activeApplicationId,
    getProjectData,
    setActiveApplication,
    updateProjectData,
    updateProjectDataMultiple,
  } = useProject()

  const [tip, setTip] = useState('')
  const [loadingTip, setLoadingTip] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [jdDraft, setJdDraft] = useState('')
  const [newApplication, setNewApplication] = useState({ company: '', role: '' })
  const [jdSaveState, setJdSaveState] = useState('')
  const [showJdEditor, setShowJdEditor] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isJdExpanded, setIsJdExpanded] = useState(false)

  const sessions = getProjectData('interviewSessions')
  const topics = getProjectData('topics')
  const applications = getProjectData('applications')
  const companyNotes = getProjectData('companyNotes') || {}
  const currentJD = getProjectData('currentJD')

  const selectedApplication = applications.find(app => app.id === selectedAppId) || null
  const selectedNotes = selectedApplication ? companyNotes[selectedApplication.id] || {} : {}
  const selectedSavedJd = selectedApplication?.jdText || ''
  const selectedJd = jdDraft.trim()
  const hasSavedJd = !!selectedSavedJd.trim()
  const hasUnsavedJdChanges = !!selectedApplication && jdDraft.trim() !== selectedSavedJd.trim()
  const selectedHasResearch = hasResearchData(selectedNotes)
  const selectedHasNotes = hasPrepNotes(selectedNotes)

  const dueTopics = topics.filter(t => isDueToday(t.nextReview) && t.status === 'In Progress').length
  const completedTopics = topics.filter(t => t.status === 'Completed').length
  const activeApps = applications.filter(a => !['Offer', 'Rejected'].includes(a.stage)).length
  const avgScore = sessions.length
    ? (sessions.reduce((a, s) => a + (s.score || 0), 0) / sessions.length).toFixed(1)
    : null

  useEffect(() => {
    if (isConnected && !tip) fetchTip()
  }, [isConnected])

  useEffect(() => {
    if (activeApplicationId && applications.some(app => app.id === activeApplicationId)) {
      const nextActive = applications.find(app => app.id === activeApplicationId)
      setSelectedAppId(activeApplicationId)
      setJdDraft(nextActive?.jdText || currentJD || '')
      setShowJdEditor(!nextActive?.jdText?.trim())
      setIsJdExpanded(false)
      return
    }

    if (applications[0]) {
      setSelectedAppId(applications[0].id)
      setJdDraft(applications[0].jdText || currentJD || '')
      setShowJdEditor(!applications[0].jdText?.trim())
      setIsJdExpanded(false)
      return
    }

    setSelectedAppId('')
    setJdDraft(currentJD || '')
    setShowJdEditor(true)
    setShowCreateForm(true)
    setIsJdExpanded(false)
  }, [activeApplicationId, applications, currentJD])

  useEffect(() => {
    if (applications.length === 0) {
      setShowCreateForm(true)
    }
  }, [applications.length])

  async function fetchTip() {
    setLoadingTip(true)
    try {
      const nextTip = await callAI({
        systemPrompt: prompts.senseiTip(profile, stats),
        messages: [{ role: 'user', content: 'Give me my daily tip.' }],
        temperature: 0.8,
      })
      setTip(nextTip)
    } catch {}
    setLoadingTip(false)
  }

  function saveJdToApplication() {
    const trimmedJd = jdDraft.trim()
    if (!selectedAppId || !trimmedJd) return

    const nextApplications = applications.map(app =>
      app.id === selectedAppId ? { ...app, jdText: trimmedJd } : app
    )

    updateProjectDataMultiple({
      applications: nextApplications,
      activeApplicationId: selectedAppId,
      currentJD: trimmedJd,
    })
    setJdSaveState('saved')
    setShowJdEditor(false)
    setIsJdExpanded(false)
    setTimeout(() => setJdSaveState(''), 2000)
  }

  function createApplicationFromJd() {
    const trimmedCompany = newApplication.company.trim()
    const trimmedJd = jdDraft.trim()
    if (!trimmedCompany || !trimmedJd) return

    const app = {
      id: generateId(),
      company: trimmedCompany,
      role: newApplication.role.trim(),
      stage: 'Researching',
      jdUrl: '',
      jdText: trimmedJd,
      date: new Date().toISOString(),
      stageUpdatedAt: new Date().toISOString(),
    }

    updateProjectDataMultiple({
      applications: [...applications, app],
      activeApplicationId: app.id,
      currentJD: trimmedJd,
    })
    setSelectedAppId(app.id)
    setNewApplication({ company: '', role: '' })
    setShowCreateForm(false)
    setShowJdEditor(false)
    setJdSaveState('created')
    setTimeout(() => setJdSaveState(''), 2000)
  }

  function handleApplicationChange(nextId) {
    const nextApp = applications.find(app => app.id === nextId)
    setSelectedAppId(nextId)
    setJdDraft(nextApp?.jdText || '')
    setShowJdEditor(!nextApp?.jdText?.trim())
    setIsJdExpanded(false)
    if (nextId) {
      setActiveApplication(nextId)
      if (nextApp?.jdText?.trim()) {
        updateProjectData('currentJD', nextApp.jdText)
      }
    }
  }

  const statCards = [
    { label: 'Mock Interviews', value: sessions.length, icon: Mic, color: 'teal' },
    { label: 'Avg Score', value: avgScore ? `${avgScore}/10` : '-', icon: TrendingUp, color: 'indigo' },
    { label: 'Topics Mastered', value: completedTopics, icon: Award, color: 'teal' },
    { label: 'Active Applications', value: activeApps, icon: Target, color: 'indigo' },
  ]

  const quickActions = [
    { label: 'Start Mock Interview', icon: Mic, section: SECTIONS.INTERVIEW, color: 'teal' },
    { label: 'Analyze a JD', icon: Search, section: SECTIONS.TOOLS, color: 'indigo' },
    { label: 'Study a Topic', icon: BookOpen, section: SECTIONS.LEARNING, color: 'teal' },
    { label: 'Add Application', icon: Plus, section: SECTIONS.APPLICATIONS, color: 'indigo' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title">{profile?.name ? `Hey, ${profile.name}` : 'Welcome back'}</h2>
          <p className="section-sub">Here&apos;s your job hunt at a glance.</p>
        </div>
        {activeProject && (
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
            <FolderOpen size={14} className="text-teal-400" />
            <span className="text-teal-300 text-xs font-body font-medium">{activeProject.name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`w-9 h-9 rounded-xl mb-3 flex items-center justify-center ${color === 'teal' ? 'bg-teal-500/15' : 'bg-indigo-500/15'}`}>
              <Icon size={18} className={color === 'teal' ? 'text-teal-400' : 'text-indigo-400'} />
            </div>
            <div className="font-display font-bold text-2xl text-white">{value}</div>
            <div className="text-slate-400 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="card border-teal-500/20 bg-teal-500/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="font-display font-semibold text-white text-base mb-1">Active Application</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Choose the tracker job that should drive your JD-based tools. The saved JD follows that active application.
            </p>
          </div>
          <button onClick={() => setActiveSection(SECTIONS.APPLICATIONS)} className="btn-ghost text-xs self-start">
            <FolderOpen size={14}/> Open Tracker
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {applications.length > 0 ? (
            <>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Tracker application</label>
                <select
                  className="input-field"
                  value={selectedAppId}
                  onChange={e => handleApplicationChange(e.target.value)}
                >
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {applicationLabel(app)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedApplication && (
                <div className="rounded-2xl border border-navy-600 bg-navy-900/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-display font-semibold">{applicationLabel(selectedApplication)}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-800 text-slate-300">
                          {selectedApplication.stage}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] border ${hasSavedJd ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                          {hasSavedJd ? 'JD saved' : 'No JD'}
                        </span>
                        {hasUnsavedJdChanges && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                            Draft edits
                          </span>
                        )}
                        {selectedHasResearch && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                            Research
                          </span>
                        )}
                        {selectedHasNotes && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                            Notes
                          </span>
                        )}
                        {activeApplication?.id === selectedApplication.id && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setShowJdEditor(prev => !prev)} className="btn-ghost text-xs">
                        {showJdEditor ? 'Close Editor' : selectedJd ? 'Edit JD' : 'Add JD'}
                      </button>
                      {selectedJd && (
                        <button onClick={() => setIsJdExpanded(prev => !prev)} className="btn-ghost text-xs">
                          {isJdExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedJd ? (
                    <div className="mt-3 rounded-xl border border-navy-600 bg-navy-950/70 p-3">
                      <div className={`text-slate-300 text-sm leading-relaxed whitespace-pre-wrap ${isJdExpanded ? 'max-h-64 overflow-y-auto pr-1' : 'line-clamp-4'}`}>
                        {selectedJd}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs mt-3">
                      No JD saved yet. Add one here and the main tools will reuse it automatically.
                    </p>
                  )}

                  {showJdEditor && (
                    <div className="mt-3">
                      <label className="text-sm text-slate-400 mb-1.5 block">Job Description</label>
                      <textarea
                        className="textarea-field h-32"
                        placeholder="Paste the job description once for this application."
                        value={jdDraft}
                        onChange={e => setJdDraft(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={saveJdToApplication}
                  disabled={!selectedAppId || !jdDraft.trim()}
                  className="btn-primary text-xs"
                >
                  <Search size={14}/> Save JD Changes
                </button>
                <button onClick={() => setActiveSection(SECTIONS.TOOLS)} className="btn-ghost text-xs">
                  <Target size={14}/> Open Tools
                </button>
                <button onClick={() => setShowCreateForm(prev => !prev)} className="btn-ghost text-xs">
                  <Plus size={14}/> {showCreateForm ? 'Hide New Application' : 'New Application from JD'}
                </button>
                {jdSaveState === 'saved' && <span className="text-teal-300 text-xs">JD saved to the active tracker application.</span>}
                {jdSaveState === 'created' && <span className="text-teal-300 text-xs">New application created and set active.</span>}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-navy-600 bg-navy-900/50 p-4">
              <div className="text-white text-sm font-display font-semibold mb-1">No tracker applications yet</div>
              <p className="text-slate-400 text-sm">Create your first application here and save the JD once so the main tools can reuse it.</p>
              <div className="mt-3">
                <label className="text-sm text-slate-400 mb-1.5 block">Job Description</label>
                <textarea
                  className="textarea-field h-32"
                  placeholder="Paste the job description once for the new application."
                  value={jdDraft}
                  onChange={e => setJdDraft(e.target.value)}
                />
              </div>
            </div>
          )}

          {showCreateForm && (
            <div className="rounded-2xl border border-navy-600 bg-navy-900/70 p-4">
              <div className="text-white text-sm font-display font-semibold mb-3">Create New Application</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className="input-field"
                  placeholder="Company name"
                  value={newApplication.company}
                  onChange={e => setNewApplication(prev => ({ ...prev, company: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Role title (optional)"
                  value={newApplication.role}
                  onChange={e => setNewApplication(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={createApplicationFromJd}
                  disabled={!newApplication.company.trim() || !jdDraft.trim()}
                  className="btn-secondary text-xs"
                >
                  <Plus size={14}/> Create Application with This JD
                </button>
                <span className="text-slate-500 text-xs">The new application will become active right away.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, section, color }) => (
              <button
                key={label}
                onClick={() => setActiveSection(section)}
                className={`flex flex-col items-start gap-2 p-3 rounded-xl border transition-all hover:scale-[1.02] text-left ${color === 'teal' ? 'bg-teal-500/5 border-teal-500/20 hover:bg-teal-500/10' : 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10'}`}
              >
                <Icon size={18} className={color === 'teal' ? 'text-teal-400' : 'text-indigo-400'} />
                <span className="text-white text-xs font-body font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-teal-400"/> Sensei Tip
            </h3>
            <button onClick={fetchTip} disabled={loadingTip} className="text-xs text-slate-400 hover:text-teal-400 transition-colors">
              {loadingTip ? '...' : 'Refresh'}
            </button>
          </div>
          {loadingTip ? (
            <div className="space-y-2">
              <div className="h-3 bg-navy-700 rounded animate-pulse" />
              <div className="h-3 bg-navy-700 rounded animate-pulse w-3/4" />
            </div>
          ) : tip ? (
            <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
          ) : (
            <p className="text-slate-500 text-sm italic">{isConnected ? 'Loading tip...' : 'Connect your AI in Settings to get personalized tips.'}</p>
          )}
        </div>
      </div>

      {dueTopics > 0 && (
        <div className="card border-yellow-500/20 bg-yellow-500/5">
          <h3 className="font-display font-semibold text-white mb-2 flex items-center gap-2">Reviews Due</h3>
          <button onClick={() => setActiveSection(SECTIONS.LEARNING)} className="badge-yellow hover:opacity-80 cursor-pointer">
            {dueTopics} review{dueTopics > 1 ? 's' : ''} due today
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-3">Recent Interviews</h3>
          <div className="space-y-2">
            {[...sessions].slice(-3).reverse().map((session, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 border-b border-navy-700 last:border-0">
                <div>
                  <span className="text-white text-sm">{session.mode}</span>
                  <span className="text-slate-500 text-xs ml-2">{new Date(session.date).toLocaleDateString()}</span>
                </div>
                <span className={`font-display font-bold text-sm ${session.score >= 8 ? 'text-green-400' : session.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {session.score ? `${session.score}/10` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
