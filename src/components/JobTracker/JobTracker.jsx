import React, { useState, useRef, useEffect } from 'react'
import { useProject } from '../../context/ProjectContext'
import { useAI } from '../../context/AIContext'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useLanguage } from '../../context/LanguageContext'
import { prompts } from '../../utils/prompts'
import { generateId, formatDate, timeAgo, tryParseJSON } from '../../utils/helpers'
import { Plus, X, Download, Building2, ArrowLeft, Check, FileSpreadsheet, Upload, Edit3, Clock, Search, Scale, Copy, Printer, Save, Sparkles, FileText, Mic, Target, Star, Gauge, Mail, Megaphone, ClipboardCheck, Globe, Camera, Zap } from 'lucide-react'

const STAGES = ['Researching', 'Applied', 'Screening', 'Interviewing', 'Awaiting', 'Offer', 'Rejected']
const STAGE_LABEL_KEYS = {
  Researching: 'applications.stage.researching',
  Applied: 'applications.stage.applied',
  Screening: 'applications.stage.screening',
  Interviewing: 'applications.stage.interviewing',
  Awaiting: 'applications.stage.awaiting',
  Offer: 'applications.stage.offer',
  Rejected: 'applications.stage.rejected',
}
const FOLLOWUP_DAYS = { Applied: 7, Screening: 5, Interviewing: 3, Awaiting: 5 }
const EMPTY_APPLICATION = { company: '', role: '', stage: 'Researching', jdUrl: '', jdText: '', notes: '' }

function hasResearchData(noteData = {}) {
  return ['wowFacts', 'techStack', 'culture', 'openQ'].some(key => (noteData[key] || '').trim())
}

function hasPrepNotes(noteData = {}) {
  return ['prepNotes', 'people', 'theyMentioned'].some(key => (noteData[key] || '').trim())
}

function getOverdueApps(apps) {
  const now = new Date()
  return apps.filter(app => {
    const days = FOLLOWUP_DAYS[app.stage]
    if (!days) return false
    if (app.followupSnoozedUntil && new Date(app.followupSnoozedUntil) > now) return false
    const since = new Date(app.stageUpdatedAt || app.date)
    return (now - since) / (1000 * 60 * 60 * 24) >= days
  })
}
const STAGE_COLORS = {
  Researching: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  Applied: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Screening: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  Interviewing: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  Awaiting: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Offer: 'text-green-400 bg-green-400/10 border-green-400/20',
  Rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
}
const TABS = ['Kanban', 'Workspace', 'Offers', 'Stats']
const TAB_LABEL_KEYS = {
  Kanban: 'applications.tabs.kanban',
  Workspace: 'applications.tabs.workspace',
  Offers: 'applications.tabs.offers',
  Stats: 'applications.tabs.stats',
}
const WORKSPACE_TABS = [
  { id: 'overview', labelKey: 'applications.workspaceTabs.workspace' },
  { id: 'jd', labelKey: 'applications.workspaceTabs.capture' },
  { id: 'research', labelKey: 'applications.workspaceTabs.research' },
]

const OFFER_FIELDS = [
  { key: 'salaryScore', labelKey: 'applications.offer.salary', defaultWeight: 30 },
  { key: 'growth',      labelKey: 'applications.offer.growth', defaultWeight: 25 },
  { key: 'cultureFit',  labelKey: 'applications.offer.culture', defaultWeight: 20 },
  { key: 'workLife',    labelKey: 'applications.offer.workLife', defaultWeight: 15 },
  { key: 'benefits',    labelKey: 'applications.offer.benefits', defaultWeight: 7 },
  { key: 'remote',      labelKey: 'applications.offer.flexibility', defaultWeight: 3 },
]

function AutoTextarea({ className, value, onChange, placeholder }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px' }
  }, [value])
  return (
    <textarea ref={ref} className={className} value={value} onChange={onChange} placeholder={placeholder}
      style={{ resize: 'none', overflow: 'hidden', minHeight: '5rem' }} />
  )
}

function exportToCSV(applications) {
  const headers = ['Company', 'Role', 'Stage', 'Date Applied', 'JD URL', 'Notes']
  const rows = applications.map(a => [
    a.company, a.role, a.stage,
    new Date(a.date).toLocaleDateString(),
    a.jdUrl || '', a.notes || ''
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'jobsensei-tracker.csv'; a.click()
  URL.revokeObjectURL(url)
}

function exportToJSON(applications, notes) {
  const data = JSON.stringify({ applications, notes }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'jobsensei-tracker.json'; a.click()
  URL.revokeObjectURL(url)
}

export default function JobTracker() {
  const { getProjectData, updateProjectData, updateProjectDataMultiple, activeApplicationId } = useProject()
  const { pendingTrackerRequest, clearPendingTrackerRequest, pushAppHistory } = useApp()
  const { language, t } = useLanguage()
  const applications = getProjectData('applications') || []
  const notes = getProjectData('companyNotes') || {}
  const offerData = getProjectData('offerComparisons') || {}
  const historyState = window.history.state?.jobsensei || {}
  const historyAppId = historyState.section === SECTIONS.APPLICATIONS && historyState.trackerView === 'workspace'
    ? historyState.applicationId
    : null
  const historyApp = historyAppId ? applications.find(app => app.id === historyAppId) || null : null

  function updateOfferData(appId, data) {
    updateProjectData('offerComparisons', { ...offerData, [appId]: data })
  }

  const { callAI, isConnected } = useAI()

  const [tab, setTab] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newApp, setNewApp] = useState(EMPTY_APPLICATION)
  const [pendingResearch, setPendingResearch] = useState(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState(historyApp?.id || null)
  const [selectedWorkspaceTab, setSelectedWorkspaceTab] = useState(historyApp ? historyState.workspaceTab || 'overview' : 'overview')
  const [editingApp, setEditingApp] = useState(null)
  const [importMsg, setImportMsg] = useState('')
  const [synced, setSynced] = useState(false)
  const importRef = useRef(null)
  const selectedApp = selectedAppId ? applications.find(app => app.id === selectedAppId) || null : null
  const stageLabel = (stage) => t(STAGE_LABEL_KEYS[stage] || 'applications.stage.unknown', { stage })
  const tabLabel = (tabName) => t(TAB_LABEL_KEYS[tabName] || 'applications.tabs.unknown', { tab: tabName })

  useEffect(() => {
    if (!pendingTrackerRequest?.applicationId) return
    const targetApp = applications.find(app => app.id === pendingTrackerRequest.applicationId)
    if (!targetApp) return
    setSelectedWorkspaceTab(pendingTrackerRequest.workspaceTab || 'overview')
    setSelectedAppId(targetApp.id)
    activateApplication(targetApp)
    clearPendingTrackerRequest()
  }, [pendingTrackerRequest, applications, clearPendingTrackerRequest])

  useEffect(() => {
    if (!selectedAppId) return
    if (!applications.some(app => app.id === selectedAppId)) {
      setSelectedAppId(null)
      setSelectedWorkspaceTab('overview')
    }
  }, [applications, selectedAppId])

  useEffect(() => {
    if (applications.length === 0) setShowAdd(true)
  }, [applications.length])

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state?.jobsensei
      if (state?.section !== SECTIONS.APPLICATIONS) return

      if (state.trackerView === 'workspace' && applications.some(app => app.id === state.applicationId)) {
        setSelectedAppId(state.applicationId)
        setSelectedWorkspaceTab(state.workspaceTab || 'overview')
        return
      }

      setSelectedAppId(null)
      setSelectedWorkspaceTab('overview')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [applications])

  function activateApplication(app) {
    if (!app) return
    updateProjectDataMultiple({
      activeApplicationId: app.id,
      currentJD: app.jdText || '',
    })
  }

  function syncToProject() {
    updateProjectDataMultiple({ applications, companyNotes: notes, offerComparisons: offerData })
    setSynced(true)
    setTimeout(() => setSynced(false), 2000)
  }

  function openApplication(app, workspaceTab = 'overview') {
    setSelectedWorkspaceTab(workspaceTab)
    setSelectedAppId(app.id)
    activateApplication(app)
    pushAppHistory(SECTIONS.APPLICATIONS, { trackerView: 'workspace', applicationId: app.id, workspaceTab })
  }

  function closeWorkspace() {
    setSelectedWorkspaceTab('overview')
    setSelectedAppId(null)
    pushAppHistory(SECTIONS.APPLICATIONS)
  }

  function resetAddForm() {
    setNewApp(EMPTY_APPLICATION)
    setPendingResearch(null)
    setShowAdd(false)
  }

  async function researchForAdd() {
    if (!newApp.company.trim()) return
    setResearchLoading(true)
    try {
      let searchContext = null
      try {
        const searchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: newApp.company, role: newApp.role }),
        })
        const searchData = await searchRes.json()
        if (!searchData.fallback && searchData.snippets) {
          searchContext = searchData.answer
            ? `Summary: ${searchData.answer}\n\n${searchData.snippets}`
            : searchData.snippets
        }
      } catch {}
      const raw = await callAI({
        systemPrompt: prompts.companyResearch(newApp.company, newApp.role, searchContext, language),
        messages: [{ role: 'user', content: 'Research this company.' }],
        temperature: 0.5,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) {
        setPendingResearch({ ...parsed, _liveData: !!searchContext })
        if (parsed.prepNotes) setNewApp(p => ({ ...p, notes: parsed.prepNotes }))
      }
    } catch {}
    setResearchLoading(false)
  }

  function setNotes(updater) {
    const next = typeof updater === 'function' ? updater(notes) : updater
    updateProjectData('companyNotes', next)
  }

  function addApplication() {
    if (!newApp.company.trim()) return
    const { _liveData, ...researchNotes } = pendingResearch || {}
    const { notes: prepNote, ...appFields } = newApp
    const app = { ...appFields, id: generateId(), date: new Date().toISOString(), stageUpdatedAt: new Date().toISOString() }
    const mergedNotes = {
      ...(prepNote.trim() ? { prepNotes: prepNote } : {}),
      ...researchNotes,
    }
    const nextApplications = [...applications, app]

    updateProjectDataMultiple({
      applications: nextApplications,
      companyNotes: Object.keys(mergedNotes).length > 0 ? { ...notes, [app.id]: mergedNotes } : notes,
      ...(activeApplicationId
        ? {}
        : {
            activeApplicationId: app.id,
            currentJD: app.jdText || '',
          }),
    })
    resetAddForm()
  }

  function createAndOpenApplication() {
    if (!newApp.company.trim()) return
    const { _liveData, ...researchNotes } = pendingResearch || {}
    const { notes: prepNote, ...appFields } = newApp
    const app = { ...appFields, id: generateId(), date: new Date().toISOString(), stageUpdatedAt: new Date().toISOString() }
    const mergedNotes = {
      ...(prepNote.trim() ? { prepNotes: prepNote } : {}),
      ...researchNotes,
    }

    updateProjectDataMultiple({
      applications: [...applications, app],
      companyNotes: Object.keys(mergedNotes).length > 0 ? { ...notes, [app.id]: mergedNotes } : notes,
      activeApplicationId: app.id,
      currentJD: app.jdText || '',
    })
    setSelectedWorkspaceTab('overview')
    setSelectedAppId(app.id)
    pushAppHistory(SECTIONS.APPLICATIONS, { trackerView: 'workspace', applicationId: app.id, workspaceTab: 'overview' })
    resetAddForm()
  }

  function updateApp(id, updates) {
    const stageUpdate = updates.stage ? { stageUpdatedAt: new Date().toISOString(), followupSnoozedUntil: null } : {}
    const nextApplications = applications.map(a => a.id === id ? { ...a, ...updates, ...stageUpdate } : a)
    if (activeApplicationId === id && Object.prototype.hasOwnProperty.call(updates, 'jdText')) {
      updateProjectDataMultiple({
        applications: nextApplications,
        currentJD: updates.jdText || '',
      })
    } else {
      updateProjectData('applications', nextApplications)
    }
  }

  function snoozeApp(id, days) {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    updateApp(id, { followupSnoozedUntil: until })
  }

  function dismissApp(id) {
    updateApp(id, { followupSnoozedUntil: '9999-12-31T00:00:00.000Z' })
  }

  function saveEdit(updated) {
    const nextApplications = applications.map(a => a.id === updated.id ? updated : a)
    if (activeApplicationId === updated.id) {
      updateProjectDataMultiple({
        applications: nextApplications,
        currentJD: updated.jdText || '',
      })
    } else {
      updateProjectData('applications', nextApplications)
    }
    setEditingApp(null)
  }

  function deleteApp(id) {
    const nextApplications = applications.filter(a => a.id !== id)
    const nextActiveId = activeApplicationId === id ? nextApplications[0]?.id || null : activeApplicationId
    const nextActiveApp = nextApplications.find(app => app.id === nextActiveId)
    updateProjectDataMultiple({
      applications: nextApplications,
      activeApplicationId: nextActiveId,
      currentJD: nextActiveApp?.jdText || '',
    })
    if (selectedAppId === id) {
      setSelectedAppId(null)
      setSelectedWorkspaceTab('overview')
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed.applications) {
        const idMap = {}
        const importedApps = parsed.applications.map(a => {
          const newId = generateId()
          idMap[a.id] = newId
          return { ...a, id: newId }
        })
        const importedNotes = {}
        if (parsed.notes) {
          Object.entries(parsed.notes).forEach(([oldId, noteData]) => {
            const newId = idMap[oldId]
            if (newId) importedNotes[newId] = noteData
          })
        }
        updateProjectDataMultiple({
          applications: [...applications, ...importedApps],
          companyNotes: { ...notes, ...importedNotes },
        })
        setImportMsg(t('applications.importedMany', { count: importedApps.length }))
      } else throw new Error()
    } catch { setImportMsg(t('applications.invalidFile')) }
    setTimeout(() => setImportMsg(''), 3000)
    e.target.value = ''
  }

  const overdueApps = getOverdueApps(applications)
  const addCompany = newApp.company.trim()
  const addRole = newApp.role.trim()
  const addJd = newApp.jdText.trim()
  const addPrepNote = newApp.notes.trim()
  const addReadiness = [
    { label: t('applications.add.readiness.company'), complete: !!addCompany, hint: addCompany || t('applications.add.required') },
    { label: t('applications.add.readiness.role'), complete: !!addRole, hint: addRole || t('applications.add.recommended') },
    { label: t('applications.add.readiness.jd'), complete: !!addJd, hint: addJd ? t('applications.add.saved') : t('applications.add.addNowOrLater') },
    {
      label: t('applications.add.readiness.research'),
      complete: !!pendingResearch,
      hint: pendingResearch
        ? t(pendingResearch._liveData ? 'applications.add.readyLive' : 'applications.add.readyAi')
        : isConnected ? t('applications.add.optionalAiAssist') : t('applications.add.connectAiSettings'),
    },
  ]
  const addReadyCount = addReadiness.filter(item => item.complete).length
  const addPrimaryLabel = addJd
    ? t('applications.add.createOpenWorkspace')
    : t('applications.add.createAddJdLater')

  if (selectedApp) return (
    <ApplicationWorkspaceView
      key={`${selectedApp.id}:${selectedApp.capturedAt || selectedApp.updatedAt || ''}`}
      app={selectedApp}
      initialTab={selectedWorkspaceTab}
      notes={notes[selectedApp.id] || {}}
      onSaveNotes={n => setNotes(prev => ({ ...prev, [selectedApp.id]: n }))}
      onBack={() => {
        closeWorkspace()
      }}
      onUpdateApp={updates => updateApp(selectedApp.id, updates)}
    />
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      {/* Edit job modal */}
      {editingApp && (
        <EditJobModal
          app={editingApp}
          onSave={saveEdit}
          onClose={() => setEditingApp(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">{t('applications.title')}</h2>
          <p className="section-sub">{t('applications.subtitle', { count: applications.length })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => document.getElementById('tracker-export-menu').classList.toggle('hidden')}
              className="btn-ghost text-xs">
              <Download size={14}/> {t('applications.exportJobs')}
            </button>
            <div id="tracker-export-menu" className="hidden absolute right-0 top-full mt-1 bg-navy-800 border border-navy-600 rounded-xl shadow-xl z-20 min-w-36 overflow-hidden">
              <button onClick={() => { exportToJSON(applications, notes); document.getElementById('tracker-export-menu').classList.add('hidden') }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-navy-700">
                <Download size={12}/> JSON
              </button>
              <button onClick={() => { exportToCSV(applications); document.getElementById('tracker-export-menu').classList.add('hidden') }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-navy-700">
                <FileSpreadsheet size={12}/> CSV / Excel
              </button>
            </div>
          </div>
          <button onClick={() => importRef.current?.click()} className="btn-ghost text-xs"><Upload size={14}/> {t('applications.importJobs')}</button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport}/>
          <button onClick={syncToProject} className={`btn-ghost text-xs transition-colors ${synced ? 'text-green-400' : ''}`}>
            <Save size={14}/> {synced ? t('applications.synced') : t('applications.sync')}
          </button>
          <button
            data-guide="applications-add"
            onClick={() => showAdd ? (applications.length === 0 ? setShowAdd(true) : resetAddForm()) : setShowAdd(true)}
            className="btn-primary text-xs"
          >
            {showAdd && applications.length > 0 ? <X size={14}/> : <Plus size={14}/>}
            {showAdd && applications.length > 0 ? t('common.close') : t('common.add')}
          </button>
        </div>
      </div>

      {importMsg && <div className="mb-3 text-xs text-center py-2 rounded-xl bg-navy-700">{importMsg}</div>}

      {showAdd && (
        <div className="card mb-4 border-teal-500/20 bg-teal-500/5">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="min-w-0 max-w-3xl">
              <div className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wide mb-2">{t('applications.add.kicker')}</div>
              <h3 className="font-display font-semibold text-white text-lg mb-1">{t('applications.add.title')}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('applications.add.copy')}
              </p>
            </div>
            <div className="px-3 py-2 rounded-xl border border-navy-600 bg-navy-950/70">
              <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{t('applications.add.readiness.title')}</div>
              <div className="text-white text-sm font-display font-semibold">{t('applications.add.readiness.count', { count: addReadyCount })}</div>
              <div className="text-slate-400 text-xs mt-1">
                {addJd ? t('applications.add.openImmediately') : t('applications.add.addJdLaterHelp')}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {addReadiness.map(item => (
              <div key={item.label} className={`rounded-2xl border px-3 py-3 ${item.complete ? 'border-teal-500/30 bg-teal-500/10' : 'border-navy-600 bg-navy-950/60'}`}>
                <div className={`text-[11px] font-display font-semibold uppercase tracking-wide mb-1 ${item.complete ? 'text-teal-300' : 'text-slate-500'}`}>
                  {item.label}
                </div>
                <div className="text-white text-sm">{item.hint}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-2">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.fields.companyRequired')}</label>
              <input className="input-field" placeholder={t('applications.placeholders.company')} value={newApp.company}
              onChange={e => { setNewApp(p => ({ ...p, company: e.target.value })); setPendingResearch(null) }}
              onKeyDown={e => e.key === 'Enter' && createAndOpenApplication()} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.fields.roleTitle')}</label>
              <input className="input-field" placeholder={t('applications.placeholders.roleTitle')} value={newApp.role}
                onChange={e => { setNewApp(p => ({ ...p, role: e.target.value })); setPendingResearch(null) }} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.fields.stage')}</label>
              <select className="input-field" value={newApp.stage}
                onChange={e => setNewApp(p => ({ ...p, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.fields.jdUrl')}</label>
              <input className="input-field" placeholder={t('applications.placeholders.jdUrl')} value={newApp.jdUrl}
                onChange={e => setNewApp(p => ({ ...p, jdUrl: e.target.value }))} />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.fields.jobDescription')}</label>
            <AutoTextarea className="textarea-field" placeholder={t('applications.placeholders.jobDescription')}
              value={newApp.jdText} onChange={e => setNewApp(p => ({ ...p, jdText: e.target.value }))} />
            <p className="text-slate-500 text-xs mt-2">{t('applications.add.jdHelp')}</p>
          </div>

          {newApp.company.trim() && (
            <div className={`ai-research-card ${pendingResearch ? 'is-ready' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="ai-research-icon">
                  {pendingResearch ? <Check size={18}/> : <Sparkles size={18}/>}
                </div>
                <div className="min-w-0">
                  {pendingResearch
                    ? <>
                        <div className="ai-research-title">{pendingResearch._liveData ? t('applications.add.researchReadyLive') : t('applications.add.researchReadyAi')}</div>
                        <div className="ai-research-copy">{t('applications.add.researchReadyCopy')}</div>
                      </>
                    : <>
                        <div className="ai-research-title">{t('applications.add.researchPrefix')} <span>{newApp.company}</span> {t('applications.add.researchSuffix')}</div>
                        <div className="ai-research-copy">{t('applications.add.researchCopy')}</div>
                      </>
                  }
                </div>
              </div>
              <button onClick={researchForAdd} disabled={researchLoading || !isConnected}
                className={`ai-research-button ${pendingResearch ? 'is-ready' : ''}`}>
                <Search size={15}/> {researchLoading ? t('applications.add.researching') : pendingResearch ? t('applications.add.rerun') : t('applications.add.research')}
              </button>
            </div>
          )}

          <div className="mb-3">
            <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.fields.initialPrepNote')}</label>
            <AutoTextarea className="textarea-field mb-1" placeholder={t('applications.placeholders.initialPrepNote')}
              value={newApp.notes} onChange={e => setNewApp(p => ({ ...p, notes: e.target.value }))} />
            <p className="text-slate-500 text-xs mt-2">
              {t('applications.add.savedTo')} <strong className="text-slate-400">{t('applications.add.myPrepNotes')}</strong>{addPrepNote ? ` ${t('applications.add.whenCreated')}` : '.'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={createAndOpenApplication} disabled={!newApp.company.trim()} className="btn-primary">
              {addPrimaryLabel}
            </button>
            <button onClick={addApplication} disabled={!newApp.company.trim()} className="btn-secondary">
              {t('applications.add.saveToBoardOnly')}
            </button>
            <button onClick={resetAddForm} className="btn-ghost">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl mb-4">
        {TABS.map((t, i) => (
          <button
            key={t}
            data-guide={t === 'Workspace' ? 'applications-workspace-tab' : t === 'Offers' ? 'applications-offers-tab' : undefined}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-body font-medium transition-all ${tab === i ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{tabLabel(t)}</button>
        ))}
      </div>

      {tab === 0 && overdueApps.length > 0 && (
        <div className="mb-3 card border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-yellow-400"/>
            <span className="text-yellow-400 text-xs font-display font-semibold">{t('applications.followUpToday', { count: overdueApps.length })}</span>
          </div>
          <div className="space-y-2">
            {overdueApps.map(app => (
              <div key={app.id} className="flex items-center gap-2 flex-wrap">
                <button onClick={() => openApplication(app)} className="text-white text-xs hover:text-teal-400 text-left flex-1 min-w-0 truncate">
                  {app.company}{app.role ? ` — ${app.role}` : ''}
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`badge text-xs border ${STAGE_COLORS[app.stage]}`}>{stageLabel(app.stage)}</span>
                  <span className="text-slate-500 text-xs">{timeAgo(app.stageUpdatedAt || app.date)}</span>
                  <select
                    className="bg-navy-800 border border-navy-600 rounded-lg px-1.5 py-0.5 text-xs text-slate-400 focus:outline-none focus:border-teal-500 cursor-pointer"
                    defaultValue=""
                    onChange={e => { if (e.target.value) { snoozeApp(app.id, parseInt(e.target.value)); e.target.value = '' } }}
                    title={t('applications.reminders.snooze')}
                  >
                    <option value="" disabled>⏰</option>
                    <option value="3">{t('applications.reminders.days', { count: 3 })}</option>
                    <option value="7">{t('applications.reminders.days', { count: 7 })}</option>
                    <option value="14">{t('applications.reminders.days', { count: 14 })}</option>
                  </select>
                  <button onClick={() => dismissApp(app.id)} className="text-slate-500 hover:text-red-400 transition-colors" title={t('applications.reminders.dismiss')}>
                    <X size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-3 min-w-max pb-4">
            {STAGES.map(stage => {
              const stageApps = applications.filter(a => a.stage === stage)
              return (
                <div key={stage} className="w-52 flex-shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 border text-xs font-display font-semibold ${STAGE_COLORS[stage]}`}>
                    {stageLabel(stage)} <span className="ml-auto opacity-60">{stageApps.length}</span>
                  </div>
                  <div className="space-y-2 min-h-16">
                    {stageApps.map(app => (
                      <div key={app.id} className={`card p-3 ${activeApplicationId === app.id ? 'border border-teal-500/30 bg-teal-500/5' : ''}`}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <button onClick={() => openApplication(app)}
                            className="text-white text-xs font-body font-semibold hover:text-teal-400 text-left leading-snug flex-1">
                            {app.company}
                          </button>
                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                            {/* Edit button */}
                            <button onClick={() => setEditingApp({ ...app })}
                              className="text-slate-600 hover:text-teal-400 p-0.5" title={t('applications.reminders.editJob')}>
                              <Edit3 size={11}/>
                            </button>
                            <button onClick={() => deleteApp(app.id)}
                              className="text-slate-600 hover:text-red-400 p-0.5">
                              <X size={12}/>
                            </button>
                          </div>
                        </div>
                        {app.role && <div className="text-slate-500 text-xs mb-1.5 leading-snug">{app.role}</div>}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {activeApplicationId === app.id ? (
                            <span className="badge-teal inline-flex">{t('applications.badges.active')}</span>
                          ) : (
                            <button
                              onClick={() => activateApplication(app)}
                              className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300 hover:border-teal-500/40 hover:text-teal-300 transition-colors"
                            >
                              {t('applications.setActive')}
                            </button>
                          )}
                          {app.jdText?.trim() && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                              JD
                            </span>
                          )}
                          {hasResearchData(notes[app.id]) && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                              {t('applications.badges.research')}
                            </span>
                          )}
                          {hasPrepNotes(notes[app.id]) && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                              {t('applications.badges.notes')}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 text-xs mb-2">{timeAgo(app.date)}</div>
                        <select
                          className="w-full bg-navy-900 border border-navy-600 rounded-lg px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-teal-500 cursor-pointer"
                          value={app.stage}
                          onChange={e => updateApp(app.id, { stage: e.target.value })}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-2">
          {applications.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">{t('applications.empty.addFirst')}</div>
          ) : [...applications].sort((a, b) => new Date(b.date) - new Date(a.date)).map(app => (
            <div key={app.id} className="card-hover w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0 w-full sm:flex-1">
                <button onClick={() => openApplication(app)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                  <Building2 size={18} className="text-slate-500 flex-shrink-0 mt-0.5"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-body font-medium text-sm">{app.company}</div>
                    <div className="text-slate-500 text-xs">{app.role}</div>
                    <div className="text-slate-600 text-xs">{timeAgo(app.date)}</div>
                  </div>
                </button>
                <span className={`badge text-xs border flex-shrink-0 self-start ${STAGE_COLORS[app.stage]}`}>{stageLabel(app.stage)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:justify-end">
                {activeApplicationId === app.id ? (
                  <span className="badge-teal">{t('applications.badges.active')}</span>
                ) : (
                  <button
                    onClick={() => activateApplication(app)}
                    className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300 hover:border-teal-500/40 hover:text-teal-300 transition-colors"
                  >
                    {t('applications.setActive')}
                  </button>
                )}
                {app.jdText?.trim() && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                    JD
                  </span>
                )}
                {hasResearchData(notes[app.id]) && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    {t('applications.badges.research')}
                  </span>
                )}
                {hasPrepNotes(notes[app.id]) && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                    {t('applications.badges.notes')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 2 && (
        <OfferComparison
          applications={applications}
          offerData={offerData}
          onUpdateOfferData={updateOfferData}
          onSelectApp={app => openApplication(app)}
        />
      )}

      {tab === 3 && <TrackerStats applications={applications} />}
    </div>
  )
}

// ── Edit Job Modal ──────────────────────────────────────────────────────────
function EditJobModal({ app, onSave, onClose }) {
  const [form, setForm] = useState({ ...app })
  const { t } = useLanguage()
  const stageLabel = (stage) => t(STAGE_LABEL_KEYS[stage] || 'applications.stage.unknown', { stage })
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-800 border border-navy-600 rounded-2xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white">{t('applications.edit.title')}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400"/></button>
        </div>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('applications.fields.companyRequired')}</label>
              <input className="input-field" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('applications.fields.roleTitle')}</label>
              <input className="input-field" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('applications.fields.stage')}</label>
              <select className="input-field" value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('applications.fields.jdUrl')}</label>
              <input className="input-field" placeholder="https://…" value={form.jdUrl || ''}
                onChange={e => setForm(f => ({ ...f, jdUrl: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('applications.fields.jobDescription')}</label>
            <AutoTextarea className="textarea-field" placeholder={t('applications.placeholders.editJobDescription')}
              value={form.jdText || ''} onChange={e => setForm(f => ({ ...f, jdText: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(form)} disabled={!form.company.trim()}
            className="btn-primary flex-1 justify-center"><Check size={14}/> {t('common.save')}</button>
          <button onClick={onClose} className="btn-ghost">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Stats ───────────────────────────────────────────────────────────────────
function TrackerStats({ applications }) {
  const { t } = useLanguage()
  const stageLabel = (stage) => t(STAGE_LABEL_KEYS[stage] || 'applications.stage.unknown', { stage })
  const total = applications.length
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.stage === s).length }), {})
  const active = applications.filter(a => !['Offer', 'Rejected'].includes(a.stage)).length
  return (
    <div className="space-y-4 animate-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          [t('applications.stats.total'), total, 'text-white'],
          [t('applications.stats.active'), active, 'text-teal-400'],
          [t('applications.stats.offers'), byStage.Offer, 'text-green-400'],
          [t('applications.stats.rejected'), byStage.Rejected, 'text-red-400'],
        ].map(([l, v, c]) => (
          <div key={l} className="card text-center">
            <div className={`font-display font-bold text-2xl mb-1 ${c}`}>{v}</div>
            <div className="text-slate-400 text-xs">{l}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-display font-semibold text-white text-sm mb-3">{t('applications.stats.pipeline')}</h3>
        <div className="space-y-2">
          {STAGES.map(stage => {
            const count = byStage[stage]
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">{stageLabel(stage)}</span>
                <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }}/>
                </div>
                <span className="text-slate-500 text-xs w-4">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
      {byStage.Offer > 0 && (
        <div className="card border-green-500/20 bg-green-500/5 text-center py-6">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-display font-bold text-green-400 text-lg">{t('applications.stats.offerCount', { count: byStage.Offer })}</div>
          <div className="text-slate-400 text-sm">{t('applications.stats.conversion', { percent: total > 0 ? Math.round((byStage.Offer / total) * 100) : 0 })}</div>
        </div>
      )}
    </div>
  )
}

// ── Company Notes View ──────────────────────────────────────────────────────
function ApplicationWorkspaceView({ app, initialTab = 'overview', notes, onSaveNotes, onBack, onUpdateApp }) {
  const { callAI, isConnected } = useAI()
  const { getProjectData } = useProject()
  const { launchTool, pushAppHistory } = useApp()
  const { language, t } = useLanguage()
  const initialWorkspaceTab = initialTab === 'notes' ? 'research' : initialTab
  const [workspaceTab, setWorkspaceTab] = useState(initialWorkspaceTab)
  const [form, setForm] = useState({
    people: '',
    theyMentioned: '',
    techStack: '',
    culture: '',
    openQ: '',
    prepNotes: '',
    wowFacts: '',
    ...notes,
  })
  const [jdText, setJdText] = useState(app.jdText || '')
  const [showJdEditor, setShowJdEditor] = useState(!(app.jdText || '').trim())
  const [isJdExpanded, setIsJdExpanded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchMsg, setResearchMsg] = useState('')
  const [researchMsgTone, setResearchMsgTone] = useState('info')
  const [cheatSheet, setCheatSheet] = useState('')
  const [cheatLoading, setCheatLoading] = useState(false)
  const [workspaceSummary, setWorkspaceSummary] = useState('')
  const [workspaceSummaryLoading, setWorkspaceSummaryLoading] = useState(false)
  const [showAdvancedTools, setShowAdvancedTools] = useState(false)
  const interviewSessions = getProjectData('interviewSessions') || []
  const toolsHistory = getProjectData('toolsHistory') || []
  const gapResults = getProjectData('gapResults') || []
  const starStories = getProjectData('starStories') || []
  const notesSignature = JSON.stringify(notes || {})

  useEffect(() => {
    setWorkspaceTab(initialTab === 'notes' ? 'research' : initialTab || 'overview')
    setShowAdvancedTools(false)
  }, [app.id, initialTab])

  useEffect(() => {
    setForm({
      people: '',
      theyMentioned: '',
      techStack: '',
      culture: '',
      openQ: '',
      prepNotes: '',
      wowFacts: '',
      ...notes,
    })
    setJdText(app.jdText || '')
    setShowJdEditor(!(app.jdText || '').trim())
  }, [app.id, app.capturedAt, app.jdText, notesSignature])

  const hasJd = jdText.trim().length > 0
  const hasResearch = hasResearchData(form)
  const hasPrep = hasPrepNotes(form)
  const noteCount = Object.values(form).filter(value => (value || '').trim()).length
  const applicationLabel = `${app.company}${app.role ? ` - ${app.role}` : ''}`
  const stageLabel = (stage) => t(STAGE_LABEL_KEYS[stage] || 'applications.stage.unknown', { stage })

  function matchesApplicationEntry(entry) {
    if (!entry) return false
    if (entry.applicationId) return entry.applicationId === app.id
    if (entry.applicationLabel) return entry.applicationLabel === applicationLabel

    const entryJd = (entry.jdSnippet || entry.inputs?.jd || '').trim()
    const currentJd = (app.jdText || '').trim()
    if (entryJd && currentJd) {
      return currentJd.startsWith(entryJd) || entryJd.startsWith(currentJd.slice(0, Math.min(currentJd.length, entryJd.length)))
    }

    return false
  }

  function latestEntry(entries) {
    if (!entries.length) return null
    return [...entries].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0]
  }

  function statusInfo(state) {
    if (state === 'complete') {
      return {
        label: t('applications.workspace.status.complete'),
        badge: 'border-green-500/30 bg-green-500/10 text-green-300',
        card: 'border-green-500/20 bg-green-500/5',
      }
    }
    if (state === 'in-progress') {
      return {
        label: t('applications.workspace.status.inProgress'),
        badge: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
        card: 'border-teal-500/20 bg-teal-500/5',
      }
    }
    if (state === 'blocked') {
      return {
        label: t('applications.workspace.status.blocked'),
        badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
        card: 'border-yellow-500/20 bg-yellow-500/5',
      }
    }
    return {
      label: t('applications.workspace.status.ready'),
      badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      card: 'border-indigo-500/20 bg-indigo-500/5',
    }
  }

  const appGapResults = gapResults.filter(matchesApplicationEntry)
  const appStarStories = starStories.filter(matchesApplicationEntry)
  const appInterviewSessions = interviewSessions.filter(matchesApplicationEntry)
  const appPredictorRuns = toolsHistory.filter(entry => entry.tool === 'predictor' && matchesApplicationEntry(entry))
  const appFollowupRuns = toolsHistory.filter(entry => entry.tool === 'followup' && matchesApplicationEntry(entry))
  const appTailorRuns = toolsHistory.filter(entry => ['coverletter', 'resumechecker'].includes(entry.tool) && matchesApplicationEntry(entry))
  const appTransferableRuns = toolsHistory.filter(entry => entry.tool === 'transferable' && matchesApplicationEntry(entry))
  const appToneRuns = toolsHistory.filter(entry => entry.tool === 'tone' && matchesApplicationEntry(entry))
  const appPitchRuns = toolsHistory.filter(entry => entry.tool === 'pitch' && matchesApplicationEntry(entry))

  const researchFields = [
    ['wowFacts', t('applications.workspace.research.fields.wowFacts.label'), t('applications.workspace.research.fields.wowFacts.placeholder')],
    ['techStack', t('applications.workspace.research.fields.techStack.label'), t('applications.workspace.research.fields.techStack.placeholder')],
    ['culture', t('applications.workspace.research.fields.culture.label'), t('applications.workspace.research.fields.culture.placeholder')],
    ['openQ', t('applications.workspace.research.fields.openQ.label'), t('applications.workspace.research.fields.openQ.placeholder')],
  ]
  const prepFields = [
    ['people', t('applications.workspace.research.fields.people.label'), t('applications.workspace.research.fields.people.placeholder')],
    ['theyMentioned', t('applications.workspace.research.fields.theyMentioned.label'), t('applications.workspace.research.fields.theyMentioned.placeholder')],
    ['prepNotes', t('applications.workspace.research.fields.prepNotes.label'), t('applications.workspace.research.fields.prepNotes.placeholder')],
  ]
  const prepActions = [
    { id: 'interview', label: t('tools.toolLabels.interview'), desc: t('tools.toolDescriptions.interview'), icon: Mic },
    { id: 'predictor', label: t('tools.toolLabels.predictor'), desc: t('tools.toolDescriptions.predictor'), icon: Target },
    { id: 'star', label: t('tools.toolLabels.star'), desc: t('tools.toolDescriptions.star'), icon: Star },
    { id: 'tone', label: t('tools.toolLabels.tone'), desc: t('tools.toolDescriptions.tone'), icon: Gauge },
    { id: 'followup', label: t('tools.toolLabels.followup'), desc: t('tools.toolDescriptions.followup'), icon: Mail },
    { id: 'pitch', label: t('tools.toolLabels.pitch'), desc: t('tools.toolDescriptions.pitch'), icon: Megaphone },
  ]
  const toolActions = [
    { id: 'gap', label: t('tools.toolLabels.gap'), desc: t('tools.toolDescriptions.gap'), icon: Search },
    { id: 'coverletter', label: t('tools.toolLabels.coverletter'), desc: t('tools.toolDescriptions.coverletter'), icon: FileText },
    { id: 'resumechecker', label: t('tools.toolLabels.resumechecker'), desc: t('tools.toolDescriptions.resumechecker'), icon: ClipboardCheck },
    { id: 'linkedin', label: t('tools.toolLabels.linkedin'), desc: t('tools.toolDescriptions.linkedin'), icon: Globe },
    { id: 'visualreview', label: t('tools.toolLabels.visualreview'), desc: t('tools.toolDescriptions.visualreview'), icon: Camera },
    { id: 'transferable', label: t('tools.toolLabels.transferable'), desc: t('tools.toolDescriptions.transferable'), icon: Zap },
  ]

  function saveWorkspace(showFeedback = true) {
    onSaveNotes(form)
    if (jdText !== (app.jdText || '')) {
      onUpdateApp({ jdText })
    }
    if (showFeedback) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  function navigateWorkspaceTab(tabId) {
    setWorkspaceTab(tabId)
    pushAppHistory(SECTIONS.APPLICATIONS, {
      trackerView: 'workspace',
      applicationId: app.id,
      workspaceTab: tabId,
    })
  }

  function launchWorkspaceTool(section, toolId) {
    saveWorkspace(false)
    launchTool(section, toolId)
  }

  function getWorkspaceNotesText() {
    return [
      form.people && `People spoken to:\n${form.people}`,
      form.theyMentioned && `Things they mentioned:\n${form.theyMentioned}`,
      form.wowFacts && `Wow Facts & Recent News:\n${form.wowFacts}`,
      form.techStack && `Tools & Systems:\n${form.techStack}`,
      form.culture && `Culture Signals:\n${form.culture}`,
      form.openQ && `Open Questions:\n${form.openQ}`,
      form.prepNotes && `Prep Notes:\n${form.prepNotes}`,
    ].filter(Boolean).join('\n\n')
  }

  async function runResearch() {
    setResearching(true)
    setResearchMsg('')
    setResearchMsgTone('info')
    try {
      let searchContext = null
      try {
        const searchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: app.company, role: app.role }),
        })
        const searchData = await searchRes.json()
        if (!searchData.fallback && searchData.snippets) {
          searchContext = searchData.answer
            ? `Summary: ${searchData.answer}\n\n${searchData.snippets}`
            : searchData.snippets
        }
      } catch {}
      const raw = await callAI({
        systemPrompt: prompts.companyResearch(app.company, app.role, searchContext, language),
        messages: [{ role: 'user', content: 'Research this company.' }],
        temperature: 0.5,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) {
        setForm(prev => ({
          ...prev,
          wowFacts: parsed.wowFacts || prev.wowFacts,
          techStack: parsed.techStack || prev.techStack,
          culture: parsed.culture || prev.culture,
          openQ: parsed.openQ || prev.openQ,
          prepNotes: parsed.prepNotes || prev.prepNotes,
        }))
        setResearchMsg(searchContext
          ? t('applications.workspace.research.messages.livePrefill')
          : t('applications.workspace.research.messages.prefill'))
      } else {
        setResearchMsg(t('applications.workspace.research.messages.parseFailed'))
        setResearchMsgTone('error')
      }
    } catch {
      setResearchMsg(t('applications.workspace.research.messages.failed'))
      setResearchMsgTone('error')
    }
    setResearching(false)
  }

  async function generateCheatSheet() {
    const notesText = getWorkspaceNotesText()

    setCheatLoading(true)
    setCheatSheet('')
    try {
      await callAI({
        systemPrompt: prompts.interviewCheatSheet(app.company, app.role, notesText, language),
        messages: [{ role: 'user', content: 'Generate interview cheat sheet.' }],
        temperature: 0.5,
        onChunk: (_, acc) => setCheatSheet(acc),
      })
    } catch {}
    setCheatLoading(false)
  }

  async function generateWorkspaceSummary() {
    const notesText = getWorkspaceNotesText()

    setWorkspaceSummaryLoading(true)
    setWorkspaceSummary('')
    saveWorkspace(false)
    try {
      await callAI({
        systemPrompt: prompts.workspaceResearchSummary(app.company, app.role, notesText, language),
        messages: [{ role: 'user', content: 'Summarize workspace research notes.' }],
        temperature: 0.45,
        onChunk: (_, acc) => setWorkspaceSummary(acc),
      })
    } catch {}
    setWorkspaceSummaryLoading(false)
  }

  function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadCheatAsPng(title, content, filenameSuffix = 'cheatsheet') {
    const canvas = document.createElement('canvas')
    const width = 900
    const padding = 44
    const lineH = 22
    const ctx = canvas.getContext('2d')
    const lines = []
    content.split('\n').forEach(line => {
      if (line.startsWith('## ') || line.startsWith('# ') || (line.startsWith('**') && line.endsWith('**'))) {
        lines.push({ text: line.replace(/^#+\s*/, '').replace(/\*\*/g, ''), bold: true, size: 16, gap: 8 })
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        lines.push({ text: '- ' + line.slice(2), bold: false, size: 14, gap: 2 })
      } else if (line.trim() === '') {
        lines.push({ text: '', bold: false, size: 14, gap: 6 })
      } else {
        lines.push({ text: line, bold: false, size: 14, gap: 2 })
      }
    })
    const wrapped = []
    const maxW = width - padding * 2
    lines.forEach(line => {
      if (!line.text) {
        wrapped.push({ ...line })
        return
      }
      ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px system-ui,sans-serif`
      const words = line.text.split(' ')
      let current = ''
      words.forEach(word => {
        const test = current ? `${current} ${word}` : word
        if (ctx.measureText(test).width > maxW) {
          wrapped.push({ ...line, text: current })
          current = word
        } else {
          current = test
        }
      })
      if (current) wrapped.push({ ...line, text: current })
    })
    const headerH = 60
    const totalH = headerH + wrapped.reduce((acc, line) => acc + lineH + (line.gap || 0), 0) + padding * 2
    canvas.width = width
    canvas.height = Math.max(totalH, 200)
    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, width, canvas.height)
    ctx.fillStyle = '#14B8A6'
    ctx.fillRect(0, 0, width, headerH)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px system-ui,sans-serif'
    ctx.fillText(title, padding, 36)
    let y = headerH + padding
    wrapped.forEach(line => {
      if (line.text) {
        ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px system-ui,sans-serif`
        ctx.fillStyle = line.bold ? '#F1F5F9' : '#CBD5E1'
        ctx.fillText(line.text, padding, y)
      }
      y += lineH + (line.gap || 0)
    })
    const link = document.createElement('a')
    link.download = `${app.company.replace(/\s+/g, '_')}_${filenameSuffix}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function renderGeneratedCard(content) {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="font-display font-semibold text-white text-sm mt-3 mb-1">{line.slice(3)}</h3>
      if (line.startsWith('# ')) return <h2 key={i} className="font-display font-bold text-white mb-2">{line.slice(2)}</h2>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-white font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</p>
      if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1">- {line.slice(2)}</p>
      if (line.trim() === '') return <div key={i} className="h-2" />
      return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
    })
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function printTextAsPdf(title, content) {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#111;line-height:1.6}
      h1{font-size:1.4rem;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}
      h2{font-size:1.1rem;margin-top:20px;margin-bottom:6px}
      ul{padding-left:20px;margin:6px 0}li{margin-bottom:4px}
      @media print{body{margin:10px}@page{margin:1cm}}
    </style></head><body>
      <h1>${escapeHtml(title)}</h1>
      <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.9rem">${escapeHtml(content)}</pre>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  function printCheatAsPdf() {
    printTextAsPdf(`Interview Cheat Sheet: ${app.company}${app.role ? ` - ${app.role}` : ''}`, cheatSheet)
  }

  function renderField(key, label, placeholder) {
    return (
      <div key={key}>
        <label className="text-sm text-slate-400 mb-1.5 block">{label}</label>
        <AutoTextarea
          className="textarea-field"
          placeholder={placeholder}
          value={form[key] || ''}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    )
  }

  function renderActionGrid(items, section) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => launchWorkspaceTool(section, id)}
            className="card-hover text-left flex gap-3 items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-body font-medium text-sm mb-1">{label}</div>
              <div className="text-slate-400 text-xs">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  function renderJdPanel() {
    return (
      <div className="card border-teal-500/20 bg-teal-500/5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="text-white text-sm font-display font-semibold">{t('applications.workspace.jd.captureTitle')}</div>
            <div className="text-slate-400 text-xs">{t('applications.workspace.jd.captureSubtitle')}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${hasJd ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
              {hasJd ? t('applications.workspace.jd.badgeReady') : t('applications.workspace.jd.badgeMissing')}
            </span>
            <button onClick={() => setShowJdEditor(prev => !prev)} className="btn-ghost text-xs">
              {showJdEditor ? t('applications.workspace.jd.closeEditor') : hasJd ? t('applications.workspace.jd.editJd') : t('applications.workspace.jd.addJd')}
            </button>
            {hasJd && (
              <button onClick={() => setIsJdExpanded(prev => !prev)} className="btn-ghost text-xs">
                {isJdExpanded ? t('applications.workspace.jd.collapse') : t('applications.workspace.jd.expand')}
              </button>
            )}
          </div>
        </div>

        {app.jdUrl && (
          <a
            href={app.jdUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-400 text-xs hover:text-teal-300 underline underline-offset-2 mb-3"
          >
            {t('applications.workspace.jd.viewJobDescription')}
          </a>
        )}

        {hasJd ? (
          <div className="rounded-2xl border border-navy-600 bg-navy-950/70 p-3">
            <div className={`text-slate-300 text-sm leading-relaxed whitespace-pre-wrap ${isJdExpanded ? 'max-h-80 overflow-y-auto pr-1' : 'line-clamp-4'}`}>
              {jdText}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-xs">{t('applications.workspace.jd.empty')}</p>
        )}

        {showJdEditor && (
          <div className="mt-3">
            <label className="text-sm text-slate-400 mb-1.5 block">{t('applications.workspace.jd.savedJobDescription')}</label>
            <textarea
              className="textarea-field h-40"
              placeholder={t('applications.workspace.jd.placeholder')}
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
            <p className="text-slate-500 text-xs mt-2">{t('applications.workspace.jd.saveHint')}</p>
          </div>
        )}
      </div>
    )
  }

  function renderOverviewTab() {
    const researchFieldCount = researchFields.filter(([key]) => (form[key] || '').trim()).length
    const latestGapResult = latestEntry(appGapResults)
    const latestStarStory = latestEntry(appStarStories)
    const latestInterviewSession = latestEntry(appInterviewSessions)
    const latestPredictorRun = latestEntry(appPredictorRuns)
    const latestFollowupRun = latestEntry(appFollowupRuns)
    const latestTailorRun = latestEntry([...appTailorRuns, ...appTransferableRuns])
    const latestTailorActivity = latestEntry([latestStarStory, latestGapResult, latestTailorRun].filter(Boolean))
    const latestWorkspaceActivity = latestEntry([
      ...appGapResults,
      ...appStarStories,
      ...appInterviewSessions,
      ...appPredictorRuns,
      ...appFollowupRuns,
      ...appTailorRuns,
      ...appTransferableRuns,
      ...appToneRuns,
      ...appPitchRuns,
    ])

    const captureState = hasJd ? 'complete' : 'ready'
    const researchState = hasResearch ? 'complete' : 'ready'
    const tailorComplete = appGapResults.length > 0 || appStarStories.length > 0 || appTailorRuns.length > 0
    const tailorState = tailorComplete
      ? 'complete'
      : hasPrep || appTransferableRuns.length > 0 || noteCount > 0
        ? 'in-progress'
        : hasJd || hasResearch
          ? 'ready'
          : 'blocked'
    const predictState = appPredictorRuns.length > 0 ? 'complete' : hasJd ? 'ready' : 'blocked'
    const mockState = appInterviewSessions.length > 0 ? 'complete' : hasJd ? 'ready' : 'blocked'
    const followupState = appFollowupRuns.length > 0 ? 'complete' : 'ready'
    const tailorArtifactCount = appGapResults.length + appStarStories.length + appTailorRuns.length
    const latestMockScore = latestInterviewSession?.score != null
      ? (Number.isInteger(latestInterviewSession.score) ? latestInterviewSession.score : latestInterviewSession.score.toFixed(1))
      : null

    const stepCards = [
      {
        id: 'capture',
        step: '1',
        title: t('applications.workspace.steps.capture.title'),
        state: captureState,
        desc: hasJd
          ? t('applications.workspace.steps.capture.descReady')
          : t('applications.workspace.steps.capture.descMissing'),
        summary: hasJd
          ? app.jdUrl
            ? t('applications.workspace.steps.capture.summaryReadyLinked')
            : t('applications.workspace.steps.capture.summaryReady')
          : t('applications.workspace.steps.capture.summaryMissing'),
        actions: [
          { label: hasJd ? t('applications.workspace.steps.capture.actionReview') : t('applications.workspace.steps.capture.actionAdd'), onClick: () => navigateWorkspaceTab('jd'), variant: 'primary' },
          { label: t('applications.workspace.overview.researchNotes'), onClick: () => navigateWorkspaceTab('research'), variant: 'ghost' },
          ...(app.jdUrl ? [{ label: t('applications.workspace.steps.capture.actionOpenJdLink'), href: app.jdUrl, variant: 'ghost' }] : []),
        ],
      },
      {
        id: 'research',
        step: '2',
        title: t('applications.workspace.steps.research.title'),
        state: researchState,
        desc: hasResearch
          ? t('applications.workspace.steps.research.descReady')
          : t('applications.workspace.steps.research.descMissing'),
        summary: hasResearch
          ? t('applications.workspace.steps.research.summaryReady', { count: researchFieldCount })
          : t('applications.workspace.steps.research.summaryMissing'),
        actions: [
          { label: hasResearch ? t('applications.workspace.steps.research.actionReview') : t('applications.workspace.steps.research.actionOpen'), onClick: () => navigateWorkspaceTab('research'), variant: 'primary' },
          { label: researching ? t('applications.workspace.steps.research.actionResearching') : t('applications.workspace.steps.research.actionAutofill'), onClick: () => runResearch(), variant: 'secondary', disabled: !isConnected || researching },
        ],
      },
      {
        id: 'tailor',
        step: '3',
        title: t('applications.workspace.steps.tailor.title'),
        state: tailorState,
        desc: t('applications.workspace.steps.tailor.desc'),
        summary: tailorComplete
          ? latestTailorActivity?.date
            ? t('applications.workspace.steps.tailor.summaryReadyWithActivity', { count: tailorArtifactCount, timeAgo: timeAgo(latestTailorActivity.date) })
            : t('applications.workspace.steps.tailor.summaryReady', { count: tailorArtifactCount })
          : hasPrep
            ? t('applications.workspace.steps.tailor.summaryNotes', { count: noteCount })
            : t('applications.workspace.steps.tailor.summaryMissing'),
        actions: [
          { label: t('applications.workspace.steps.tailor.actionGap'), onClick: () => launchWorkspaceTool(SECTIONS.TOOLS, 'gap'), variant: 'primary' },
          { label: t('applications.workspace.steps.tailor.actionStar'), onClick: () => launchWorkspaceTool(SECTIONS.INTERVIEW, 'star'), variant: 'secondary' },
          { label: t('applications.workspace.steps.tailor.actionResume'), onClick: () => launchWorkspaceTool(SECTIONS.TOOLS, 'resumechecker'), variant: 'ghost' },
          { label: t('applications.workspace.steps.tailor.actionCover'), onClick: () => launchWorkspaceTool(SECTIONS.TOOLS, 'coverletter'), variant: 'ghost' },
        ],
      },
      {
        id: 'predict',
        step: '4',
        title: t('applications.workspace.steps.predict.title'),
        state: predictState,
        desc: hasJd
          ? t('applications.workspace.steps.predict.descReady')
          : t('applications.workspace.steps.predict.descMissing'),
        summary: latestPredictorRun?.date
          ? t('applications.workspace.steps.predict.summaryReady', { timeAgo: timeAgo(latestPredictorRun.date) })
          : hasJd
            ? t('applications.workspace.steps.predict.summaryMissing')
            : t('applications.workspace.steps.predict.summaryBlocked'),
        actions: [
          {
            label: hasJd ? t('applications.workspace.steps.predict.actionPredict') : t('applications.workspace.steps.predict.actionCaptureFirst'),
            onClick: () => hasJd ? launchWorkspaceTool(SECTIONS.INTERVIEW, 'predictor') : navigateWorkspaceTab('jd'),
            variant: 'primary',
          },
        ],
      },
      {
        id: 'mock',
        step: '5',
        title: t('applications.workspace.steps.mock.title'),
        state: mockState,
        desc: t('applications.workspace.steps.mock.desc'),
        summary: latestInterviewSession?.date
          ? latestMockScore != null
            ? t('applications.workspace.steps.mock.summaryReadyWithScore', { timeAgo: timeAgo(latestInterviewSession.date), score: latestMockScore })
            : t('applications.workspace.steps.mock.summaryReady', { timeAgo: timeAgo(latestInterviewSession.date) })
          : hasJd
            ? t('applications.workspace.steps.mock.summaryMissing')
            : t('applications.workspace.steps.mock.summaryBlocked'),
        actions: [
          {
            label: hasJd ? t('applications.workspace.steps.mock.actionStart') : t('applications.workspace.steps.mock.actionCaptureFirst'),
            onClick: () => hasJd ? launchWorkspaceTool(SECTIONS.INTERVIEW, 'interview') : navigateWorkspaceTab('jd'),
            variant: 'primary',
          },
        ],
      },
      {
        id: 'followup',
        step: '6',
        title: t('applications.workspace.steps.followup.title'),
        state: followupState,
        desc: t('applications.workspace.steps.followup.desc'),
        summary: latestFollowupRun?.date
          ? t('applications.workspace.steps.followup.summaryReady', { timeAgo: timeAgo(latestFollowupRun.date) })
          : t('applications.workspace.steps.followup.summaryMissing'),
        actions: [
          { label: t('applications.workspace.steps.followup.actionDraft'), onClick: () => launchWorkspaceTool(SECTIONS.INTERVIEW, 'followup'), variant: 'primary' },
          { label: t('applications.workspace.overview.researchNotes'), onClick: () => navigateWorkspaceTab('research'), variant: 'ghost' },
        ],
      },
    ]

    const completedSteps = stepCards.filter(card => card.state === 'complete').length
    const nextStep = stepCards.find(card => card.state !== 'complete') || null
    const nextStepAction = nextStep?.actions?.find(action => !action.disabled && action.onClick) || nextStep?.actions?.[0] || null
    const advancedTools = [
      { label: t('tools.toolLabels.transferable'), section: SECTIONS.TOOLS, toolId: 'transferable', count: appTransferableRuns.length },
      { label: t('tools.toolLabels.tone'), section: SECTIONS.INTERVIEW, toolId: 'tone', count: appToneRuns.length },
      { label: t('tools.toolLabels.pitch'), section: SECTIONS.INTERVIEW, toolId: 'pitch', count: appPitchRuns.length },
      { label: t('tools.toolLabels.linkedin'), section: SECTIONS.TOOLS, toolId: 'linkedin' },
      { label: t('tools.toolLabels.visualreview'), section: SECTIONS.TOOLS, toolId: 'visualreview' },
    ]

    return (
      <div className="space-y-4">
        <div className="card border-teal-500/20 bg-teal-500/5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 max-w-3xl">
              <div className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wide mb-2">{t('applications.workspace.overview.title')}</div>
              <h3 className="text-white text-lg font-display font-semibold mb-1">{app.company}{app.role ? ` - ${app.role}` : ''}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('applications.workspace.overview.subtitle')}
              </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300">
                    {stageLabel(app.stage)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                    {t('applications.workspace.overview.stepsComplete', { count: completedSteps, total: stepCards.length })}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] border ${hasJd ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                    {hasJd ? t('applications.workspace.overview.status.jdReady') : t('applications.workspace.overview.status.needsJd')}
                  </span>
                  {hasResearch && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    {t('applications.workspace.overview.status.research')}
                  </span>
                )}
                {hasPrep && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                    {t('applications.workspace.overview.status.notes')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {nextStepAction && (
                <button onClick={nextStepAction.onClick} className="btn-primary text-xs">
                  {completedSteps === stepCards.length ? t('applications.workspace.overview.reviewWorkspace') : t('applications.workspace.overview.continueStep', { step: nextStep.title })}
                </button>
              )}
              <button onClick={() => navigateWorkspaceTab('research')} className="btn-ghost text-xs">
                {t('applications.workspace.overview.researchNotes')}
              </button>
              <button onClick={() => navigateWorkspaceTab('jd')} className="btn-ghost text-xs">
                {t('applications.workspace.overview.capture')}
              </button>
              {app.jdUrl && (
                <a href={app.jdUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                  {t('applications.workspace.overview.viewJd')}
                </a>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-2xl border border-navy-600 bg-navy-950/60 px-4 py-3">
              <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{t('applications.workspace.overview.stats.nextUp')}</div>
              <div className="text-white text-sm font-display font-semibold">{nextStep ? nextStep.title : t('applications.workspace.overview.stats.workflowComplete')}</div>
              <div className="text-slate-400 text-xs mt-1">
                {nextStep ? nextStep.summary : t('applications.workspace.overview.stats.workflowCompleteCopy')}
              </div>
            </div>
            <div className="rounded-2xl border border-navy-600 bg-navy-950/60 px-4 py-3">
              <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{t('applications.workspace.overview.stats.latestActivity')}</div>
              <div className="text-white text-sm font-display font-semibold">
                {latestWorkspaceActivity?.date ? timeAgo(latestWorkspaceActivity.date) : t('applications.workspace.overview.stats.noSavedActivity')}
              </div>
              <div className="text-slate-400 text-xs mt-1">
                {latestWorkspaceActivity?.date ? t('applications.workspace.overview.stats.savedOn', { date: formatDate(latestWorkspaceActivity.date) }) : t('applications.workspace.overview.stats.startBuilding')}
              </div>
            </div>
            <div className="rounded-2xl border border-navy-600 bg-navy-950/60 px-4 py-3">
              <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{t('applications.workspace.overview.stats.researchNotes')}</div>
              <div className="text-white text-sm font-display font-semibold">{t('applications.workspace.overview.stats.savedFields', { count: noteCount })}</div>
              <div className="text-slate-400 text-xs mt-1">
                {hasPrep ? t('applications.workspace.overview.stats.prepReady') : t('applications.workspace.overview.stats.prepHint')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {stepCards.map(card => {
            const status = statusInfo(card.state)

            return (
              <div key={card.id} className={`card ${status.card}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-2">
                      {t('applications.workspace.overview.stepLabel', { step: card.step })}
                    </div>
                    <h4 className="text-white text-base font-display font-semibold mb-1">{card.title}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                    <p className="text-slate-500 text-xs mt-2">{card.summary}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] border whitespace-nowrap ${status.badge}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {card.actions.map(action => {
                    const buttonClass = action.variant === 'primary'
                      ? 'btn-primary text-xs'
                      : action.variant === 'secondary'
                        ? 'btn-secondary text-xs'
                        : 'btn-ghost text-xs'

                    if (action.href) {
                      return (
                        <a
                          key={action.label}
                          href={action.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonClass}
                        >
                          {action.label}
                        </a>
                      )
                    }

                    return (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={buttonClass}
                      >
                        {action.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <div className="text-white text-sm font-display font-semibold">{t('applications.workspace.overview.advancedToolsTitle')}</div>
              <div className="text-slate-400 text-xs">{t('applications.workspace.overview.advancedToolsSubtitle')}</div>
            </div>
            <button onClick={() => setShowAdvancedTools(prev => !prev)} className="btn-ghost text-xs">
              {showAdvancedTools ? t('applications.workspace.overview.hideAdvancedTools') : t('applications.workspace.overview.showAdvancedTools')}
            </button>
          </div>
          {showAdvancedTools && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {advancedTools.map(item => (
                <button
                  key={item.label}
                  onClick={() => launchWorkspaceTool(item.section, item.toolId)}
                  className="card-hover text-left"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-white text-sm font-body font-medium">{item.label}</div>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs">{t('applications.workspace.overview.openWithContext')}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderResearchTab() {
    return (
      <div className="space-y-4">
        <div className="card border-teal-500/20 bg-teal-500/5">
          <h4 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-teal-400" /> {t('applications.workspace.research.aiActions')}
            <span className="text-slate-500 text-xs font-normal">{/*
              — Research This Company
            */}- {t('applications.workspace.research.researchCompany')}</span>
          </h4>

          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            <button
              onClick={generateWorkspaceSummary}
              disabled={!isConnected || workspaceSummaryLoading || noteCount === 0}
              className="btn-secondary flex-1 justify-center text-xs"
            >
              <FileText size={13} /> {workspaceSummaryLoading ? t('applications.workspace.research.summarizing') : t('applications.workspace.research.summarize')}
            </button>
            <button
              onClick={runResearch}
              disabled={!isConnected || researching}
              className="btn-primary flex-1 justify-center text-xs"
            >
              <Search size={13} /> {researching ? t('applications.workspace.research.researching') : t('applications.workspace.research.researchCompany')}
            </button>
          </div>

          {researchMsg && (
            <p className={`text-xs mb-3 ${researchMsgTone === 'error' ? 'text-red-400' : 'text-teal-400'}`}>
              {researchMsg}
            </p>
          )}

          {noteCount === 0 && (
            <p className="text-slate-500 text-xs">{t('applications.workspace.research.emptySummaryHint')}</p>
          )}

          {workspaceSummary && (
            <div className="animate-in">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wider">{t('applications.workspace.research.summary')}</span>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(workspaceSummary)} className="btn-ghost text-xs">
                    <Copy size={12} /> {t('tools.shared.copy')}
                  </button>
                  <button
                    onClick={() => downloadTextFile(workspaceSummary, `${app.company.replace(/\s+/g, '_')}_research_summary.txt`)}
                    className="btn-ghost text-xs"
                  >
                    <Download size={12} /> .txt
                  </button>
                  <button
                    onClick={() => printTextAsPdf(`${app.company} - Research Summary`, workspaceSummary)}
                    className="btn-ghost text-xs"
                  >
                    <Printer size={12} /> PDF
                  </button>
                  <button
                    onClick={() => downloadCheatAsPng(`${app.company} - Research Summary`, workspaceSummary, 'research_summary')}
                    className="btn-secondary text-xs"
                  >
                    <Download size={12} /> .png
                  </button>
                </div>
              </div>
              <div className="bg-navy-900 rounded-xl p-4">
                {renderGeneratedCard(workspaceSummary)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide">{t('applications.workspace.research.prepNotesSection')}</div>
          {prepFields.map(([key, label, placeholder]) => renderField(key, label, placeholder))}
          <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide pt-2">{t('applications.workspace.research.companyResearchSection')}</div>
          {researchFields.map(([key, label, placeholder]) => renderField(key, label, placeholder))}
        </div>
      </div>
    )
  }

  function renderPrepTab() {
    return (
      <div className="space-y-4">
        <div className="card">
          <div className="text-white text-sm font-display font-semibold mb-1">{t('applications.workspace.prep.shortcutsTitle')}</div>
          <div className="text-slate-400 text-xs mb-3">{t('applications.workspace.prep.shortcutsSubtitle')}</div>
          {renderActionGrid(prepActions, SECTIONS.INTERVIEW)}
        </div>

        <div className="card border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-white text-sm font-display font-semibold flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" /> {t('applications.workspace.prep.cheatSheetTitle')}
              </div>
              <div className="text-slate-400 text-xs">{t('applications.workspace.prep.cheatSheetSubtitle')}</div>
            </div>
            <button onClick={generateCheatSheet} disabled={!isConnected || cheatLoading} className="btn-primary text-xs flex-shrink-0">
              {cheatLoading ? t('applications.workspace.prep.generating') : cheatSheet ? t('applications.workspace.prep.regenerate') : t('applications.workspace.prep.generate')}
            </button>
          </div>

          {cheatSheet && (
            <div className="mt-4 animate-in">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wider">{t('applications.workspace.prep.resultTitle')}</span>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(cheatSheet)} className="btn-ghost text-xs">
                    <Copy size={12} /> {t('tools.shared.copy')}
                  </button>
                  <button onClick={printCheatAsPdf} className="btn-ghost text-xs">
                    <Printer size={12} /> PDF
                  </button>
                  <button onClick={() => downloadCheatAsPng(`${app.company} - Interview Cheat Sheet`, cheatSheet)} className="btn-secondary text-xs">
                    <Download size={12} /> PNG
                  </button>
                </div>
              </div>
              <div className="bg-navy-900 rounded-xl p-4">
                {cheatSheet.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) return <h3 key={i} className="font-display font-semibold text-white text-sm mt-3 mb-1">{line.slice(3)}</h3>
                  if (line.startsWith('# ')) return <h2 key={i} className="font-display font-bold text-white mb-2">{line.slice(2)}</h2>
                  if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-white font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</p>
                  if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1">- {line.slice(2)}</p>
                  if (line.trim() === '') return <div key={i} className="h-2" />
                  return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {prepFields.map(([key, label, placeholder]) => renderField(key, label, placeholder))}
        </div>
      </div>
    )
  }

  function renderToolsTab() {
    return (
      <div className="space-y-4">
        <div className="card border-teal-500/20 bg-teal-500/5">
          <div className="text-white text-sm font-display font-semibold mb-1">{t('applications.workspace.tools.title')}</div>
          <div className="text-slate-400 text-xs">{t('applications.workspace.tools.subtitle')}</div>
        </div>
        {renderActionGrid(toolActions, SECTIONS.TOOLS)}
      </div>
    )
  }

  function renderCurrentTab() {
    if (workspaceTab === 'overview') return renderOverviewTab()
    if (workspaceTab === 'jd') return renderJdPanel()
    if (workspaceTab === 'research') return renderResearchTab()
    if (workspaceTab === 'prep') return renderPrepTab()
    if (workspaceTab === 'tools') return renderToolsTab()
    if (workspaceTab === 'notes') return renderResearchTab()
    return null
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <button onClick={onBack} className="btn-ghost mb-3"><ArrowLeft size={16} /> {t('applications.workspace.back')}</button>
          <h2 className="section-title">{app.company}</h2>
          <p className="section-sub">{app.role || t('applications.workspace.defaultTitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
            {t('applications.workspace.activeWorkspace')}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] border ${hasJd ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
            {hasJd ? t('applications.badges.jdAttached') : t('applications.badges.noJd')}
          </span>
          {hasResearch && (
            <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
              {t('applications.badges.researchReady')}
            </span>
          )}
          {hasPrep && (
            <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
              {t('applications.badges.prepNotes')}
            </span>
          )}
          <select className="input-field w-36" value={app.stage} onChange={e => onUpdateApp({ stage: e.target.value })}>
            {STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
          </select>
          <button onClick={() => saveWorkspace(true)} className={`btn-primary ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
            {saved ? <><Check size={16} /> {t('applications.workspace.saved')}</> : <>{t('applications.workspace.save')}</>}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-5">
        <div className="flex gap-2 min-w-max">
          {WORKSPACE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigateWorkspaceTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-body transition-all whitespace-nowrap ${
                workspaceTab === tab.id
                  ? 'bg-navy-700 text-white border border-navy-600'
                  : 'bg-navy-900 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {renderCurrentTab()}

      <div className="flex items-center justify-end gap-2 mt-5 mb-6">
        <button onClick={() => saveWorkspace(true)} className={`btn-primary ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
          {saved ? <><Check size={16} /> {t('applications.workspace.saved')}</> : <>{t('applications.workspace.save')}</>}
        </button>
      </div>
    </div>
  )
}

function OfferComparison({ applications, offerData, onUpdateOfferData, onSelectApp }) {
  const { callAI, isConnected } = useAI()
  const { profile } = useApp()
  const { language, t } = useLanguage()
  const offerApps = applications.filter(a => a.stage === 'Offer')
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(OFFER_FIELDS.map(f => [f.key, f.defaultWeight]))
  )
  const [showWeights, setShowWeights] = useState(false)
  const [advice, setAdvice] = useState('')
  const [loadingAdvice, setLoadingAdvice] = useState(false)

  function getScore(appId) {
    const d = offerData[appId] || {}
    return Math.round(OFFER_FIELDS.reduce((sum, f) => sum + (d[f.key] || 3) * 20 * (weights[f.key] / 100), 0))
  }

  function updateField(appId, field, value) {
    onUpdateOfferData(appId, { ...(offerData[appId] || {}), [field]: value })
  }

  async function getAdvice() {
    setLoadingAdvice(true); setAdvice('')
    const offersText = offerApps.map(app => {
      const d = offerData[app.id] || {}
      return `${app.company} (${app.role || 'role n/a'}): Score ${getScore(app.id)}/100 | Salary: ${d.baseSalary || 'not listed'} | Bonus: ${d.bonus || 'n/a'} | ${OFFER_FIELDS.map(f => `${t(f.labelKey)}: ${d[f.key] || 3}/5`).join(', ')}`
    }).join('\n')
    const profileSummary = `${profile?.currentRole || 'professional'}, targeting ${profile?.targetRole || 'new role'}`
    try {
      await callAI({
        systemPrompt: prompts.offerAdvisor(offersText, profileSummary, language),
        messages: [{ role: 'user', content: 'Which offer should I take?' }],
        temperature: 0.6,
        onChunk: (_, acc) => setAdvice(acc),
      })
    } catch {}
    setLoadingAdvice(false)
  }

  if (offerApps.length === 0) return (
    <div className="card text-center py-12 animate-in">
      <Scale size={32} className="text-slate-600 mx-auto mb-3"/>
      <div className="text-white font-display font-semibold mb-1">{t('applications.offer.noOffers')}</div>
      <div className="text-slate-400 text-sm">{t('applications.offer.noOffersCopy')}</div>
    </div>
  )

  const sortedOffers = [...offerApps].sort((a, b) => getScore(b.id) - getScore(a.id))
  const weightTotal = Object.values(weights).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-4 animate-in">
      {/* Weights */}
      <div className="card">
        <button onClick={() => setShowWeights(!showWeights)} className="flex items-center justify-between w-full">
          <span className="text-white text-sm font-display font-semibold">{t('applications.offer.whatMatters')}</span>
          <span className="text-teal-400 text-xs">{showWeights ? t('applications.offer.hide') : t('applications.offer.customizeWeights')}</span>
        </button>
        {showWeights && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OFFER_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{t(f.labelKey)} <span className="text-teal-400">{weights[f.key]}%</span></label>
                <input type="range" min="0" max="50" value={weights[f.key]}
                  onChange={e => setWeights(w => ({ ...w, [f.key]: parseInt(e.target.value) }))}
                  className="w-full accent-teal-500"/>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3">
              <p className={`text-xs ${weightTotal !== 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                {t('applications.offer.weightTotal', { total: weightTotal })} {weightTotal !== 100 ? t('applications.offer.adjustWeights') : t('applications.offer.weightOk')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Winner badge */}
      {sortedOffers.length > 1 && (
        <div className="card border-green-500/20 bg-green-500/5 text-center py-3">
          <div className="text-green-400 text-xs font-display font-semibold mb-0.5">{t('applications.offer.currentLeader')}</div>
          <div className="text-white font-display font-bold text-lg">{sortedOffers[0].company}</div>
          <div className="text-slate-400 text-xs">{sortedOffers[0].role} · Score {getScore(sortedOffers[0].id)}/100</div>
        </div>
      )}

      {/* Offer cards */}
      {sortedOffers.map((app, rank) => {
        const d = offerData[app.id] || {}
        const score = getScore(app.id)
        return (
          <div key={app.id} className={`card ${rank === 0 && sortedOffers.length > 1 ? 'border-green-500/30' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <button onClick={() => onSelectApp(app)} className="text-white font-display font-semibold hover:text-teal-400 text-left text-sm">
                  {app.company}
                </button>
                <div className="text-slate-400 text-xs">{app.role}</div>
              </div>
              <div className={`text-2xl font-display font-bold ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-slate-400'}`}>
                {score}<span className="text-slate-500 text-xs font-normal">/100</span>
              </div>
            </div>

            {/* Text fields */}
            <div className="grid sm:grid-cols-2 gap-2 mb-3">
              <input className="input-field text-xs" placeholder={t('applications.offer.baseSalaryPlaceholder')}
                value={d.baseSalary || ''} onChange={e => updateField(app.id, 'baseSalary', e.target.value)}/>
              <input className="input-field text-xs" placeholder={t('applications.offer.bonusPlaceholder')}
                value={d.bonus || ''} onChange={e => updateField(app.id, 'bonus', e.target.value)}/>
            </div>

            {/* Rating rows */}
            <div className="space-y-2">
              {OFFER_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-20 flex-shrink-0">{t(f.labelKey)}</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={() => updateField(app.id, f.key, v)}
                        className={`w-7 h-7 rounded-lg text-xs font-display font-semibold transition-all ${(d[f.key] || 3) === v ? 'bg-teal-500 text-white' : 'bg-navy-700 text-slate-400 hover:bg-navy-600'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-600 text-xs flex-shrink-0">{weights[f.key]}%</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* AI Offer Advisor */}
      <div className="card border-indigo-500/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white text-sm font-display font-semibold">{t('applications.offer.aiAdvisorTitle')}</div>
            <div className="text-slate-400 text-xs">{t('applications.offer.aiAdvisorCopy')}</div>
          </div>
          <button onClick={getAdvice} disabled={loadingAdvice || !isConnected || offerApps.length < 1}
            className="btn-primary text-xs">
            {loadingAdvice ? t('applications.offer.analyzing') : t('applications.offer.getAdvice')}
          </button>
        </div>
        {advice && (
          <div className="bg-navy-900 rounded-xl p-3">
            <p className="text-slate-200 text-sm leading-relaxed">{advice}</p>
          </div>
        )}
      </div>
    </div>
  )
}
