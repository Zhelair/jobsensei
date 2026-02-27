import React, { useState, useRef } from 'react'
import { useProject } from '../../context/ProjectContext'
import { generateId, formatDate, timeAgo } from '../../utils/helpers'
import { Plus, X, Download, Building2, ArrowLeft, Check, FileSpreadsheet, Upload, Edit3 } from 'lucide-react'

const STAGES = ['Researching', 'Applied', 'Screening', 'Interviewing', 'Awaiting', 'Offer', 'Rejected']
const STAGE_COLORS = {
  Researching: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  Applied: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Screening: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  Interviewing: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  Awaiting: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Offer: 'text-green-400 bg-green-400/10 border-green-400/20',
  Rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
}
const TABS = ['Kanban', 'Stats', 'Company Notes']

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
  const { getProjectData, updateProjectData } = useProject()
  const applications = getProjectData('applications')
  const notes = getProjectData('companyNotes')

  const [tab, setTab] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newApp, setNewApp] = useState({ company: '', role: '', stage: 'Researching', jdUrl: '', notes: '' })
  const [selectedApp, setSelectedApp] = useState(null)
  const [editingApp, setEditingApp] = useState(null)
  const [importMsg, setImportMsg] = useState('')
  const importRef = useRef(null)

  function setApplications(updater) {
    const next = typeof updater === 'function' ? updater(applications) : updater
    updateProjectData('applications', next)
  }
  function setNotes(updater) {
    const next = typeof updater === 'function' ? updater(notes) : updater
    updateProjectData('companyNotes', next)
  }

  function addApplication() {
    if (!newApp.company.trim()) return
    const app = { ...newApp, id: generateId(), date: new Date().toISOString() }
    setApplications(prev => [...prev, app])
    // Pre-populate Company Notes > "My prep notes" from the creation note field
    if (newApp.notes.trim()) {
      setNotes(prev => ({
        ...prev,
        [app.id]: { ...(prev[app.id] || {}), prepNotes: newApp.notes }
      }))
    }
    setNewApp({ company: '', role: '', stage: 'Researching', jdUrl: '', notes: '' })
    setShowAdd(false)
  }

  function updateApp(id, updates) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    if (selectedApp?.id === id) setSelectedApp(a => ({ ...a, ...updates }))
  }

  function saveEdit(updated) {
    setApplications(prev => prev.map(a => a.id === updated.id ? updated : a))
    if (selectedApp?.id === updated.id) setSelectedApp(updated)
    setEditingApp(null)
  }

  function deleteApp(id) {
    setApplications(prev => prev.filter(a => a.id !== id))
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed.applications) {
        setApplications(prev => [...prev, ...parsed.applications.map(a => ({ ...a, id: generateId() }))])
        if (parsed.notes) setNotes(prev => ({ ...prev, ...parsed.notes }))
        setImportMsg(`✅ Imported ${parsed.applications.length} applications`)
      } else throw new Error()
    } catch { setImportMsg('❌ Invalid file') }
    setTimeout(() => setImportMsg(''), 3000)
    e.target.value = ''
  }

  if (selectedApp) return (
    <CompanyNotesView
      app={selectedApp}
      notes={notes[selectedApp.id] || {}}
      onSaveNotes={n => setNotes(prev => ({ ...prev, [selectedApp.id]: n }))}
      onBack={() => setSelectedApp(null)}
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
          <h2 className="section-title">Job Tracker</h2>
          <p className="section-sub">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => document.getElementById('tracker-export-menu').classList.toggle('hidden')}
              className="btn-ghost text-xs">
              <Download size={14}/> Export
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
          <button onClick={() => importRef.current?.click()} className="btn-ghost text-xs"><Upload size={14}/> Import</button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport}/>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus size={14}/> Add</button>
        </div>
      </div>

      {importMsg && <div className="mb-3 text-xs text-center py-2 rounded-xl bg-navy-700">{importMsg}</div>}

      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">Add Application</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input className="input-field" placeholder="Company *" value={newApp.company}
              onChange={e => setNewApp(p => ({ ...p, company: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addApplication()} />
            <input className="input-field" placeholder="Role title" value={newApp.role}
              onChange={e => setNewApp(p => ({ ...p, role: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select className="input-field" value={newApp.stage}
              onChange={e => setNewApp(p => ({ ...p, stage: e.target.value }))}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="input-field" placeholder="JD URL (optional)" value={newApp.jdUrl}
              onChange={e => setNewApp(p => ({ ...p, jdUrl: e.target.value }))} />
          </div>
          <textarea className="textarea-field h-16 mb-1" placeholder="Initial prep note (optional)…"
            value={newApp.notes} onChange={e => setNewApp(p => ({ ...p, notes: e.target.value }))} />
          <p className="text-slate-600 text-xs mb-3">↳ This note will appear in <strong className="text-slate-500">Company Notes → My prep notes</strong></p>
          <div className="flex gap-2">
            <button onClick={addApplication} disabled={!newApp.company.trim()} className="btn-primary">Add</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl mb-4">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all ${tab === i ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-3 min-w-max pb-4">
            {STAGES.map(stage => {
              const stageApps = applications.filter(a => a.stage === stage)
              return (
                <div key={stage} className="w-52 flex-shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 border text-xs font-display font-semibold ${STAGE_COLORS[stage]}`}>
                    {stage} <span className="ml-auto opacity-60">{stageApps.length}</span>
                  </div>
                  <div className="space-y-2 min-h-16">
                    {stageApps.map(app => (
                      <div key={app.id} className="card p-3">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <button onClick={() => setSelectedApp(app)}
                            className="text-white text-xs font-body font-semibold hover:text-teal-400 text-left leading-snug flex-1">
                            {app.company}
                          </button>
                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                            {/* Edit button */}
                            <button onClick={() => setEditingApp({ ...app })}
                              className="text-slate-600 hover:text-teal-400 p-0.5" title="Edit job">
                              <Edit3 size={11}/>
                            </button>
                            <button onClick={() => deleteApp(app.id)}
                              className="text-slate-600 hover:text-red-400 p-0.5">
                              <X size={12}/>
                            </button>
                          </div>
                        </div>
                        {app.role && <div className="text-slate-500 text-xs mb-1.5 leading-snug">{app.role}</div>}
                        <div className="text-slate-600 text-xs mb-2">{timeAgo(app.date)}</div>
                        <select
                          className="w-full bg-navy-900 border border-navy-600 rounded-lg px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-teal-500 cursor-pointer"
                          value={app.stage}
                          onChange={e => updateApp(app.id, { stage: e.target.value })}
                        >
                          {STAGES.map(s => <option key={s}>{s}</option>)}
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

      {tab === 1 && <TrackerStats applications={applications} />}

      {tab === 2 && (
        <div className="space-y-2">
          {applications.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">Add applications first.</div>
          ) : applications.map(app => (
            <button key={app.id} onClick={() => setSelectedApp(app)}
              className="card-hover w-full text-left flex items-center gap-3">
              <Building2 size={18} className="text-slate-500 flex-shrink-0"/>
              <div className="flex-1">
                <div className="text-white font-body font-medium text-sm">{app.company}</div>
                <div className="text-slate-500 text-xs">{app.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge text-xs border ${STAGE_COLORS[app.stage]}`}>{app.stage}</span>
                <span className="text-slate-600 text-xs">{notes[app.id] ? '📝' : '+'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Edit Job Modal ──────────────────────────────────────────────────────────
function EditJobModal({ app, onSave, onClose }) {
  const [form, setForm] = useState({ ...app })
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-800 border border-navy-600 rounded-2xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white">Edit Application</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400"/></button>
        </div>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Company *</label>
              <input className="input-field" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Role title</label>
              <input className="input-field" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Stage</label>
              <select className="input-field" value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">JD URL</label>
              <input className="input-field" placeholder="https://…" value={form.jdUrl || ''}
                onChange={e => setForm(f => ({ ...f, jdUrl: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(form)} disabled={!form.company.trim()}
            className="btn-primary flex-1 justify-center"><Check size={14}/> Save</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Stats ───────────────────────────────────────────────────────────────────
function TrackerStats({ applications }) {
  const total = applications.length
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.stage === s).length }), {})
  const active = applications.filter(a => !['Offer', 'Rejected'].includes(a.stage)).length
  return (
    <div className="space-y-4 animate-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total', total, 'text-white'], ['Active', active, 'text-teal-400'], ['Offers', byStage.Offer, 'text-green-400'], ['Rejected', byStage.Rejected, 'text-red-400']].map(([l, v, c]) => (
          <div key={l} className="card text-center">
            <div className={`font-display font-bold text-2xl mb-1 ${c}`}>{v}</div>
            <div className="text-slate-400 text-xs">{l}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-display font-semibold text-white text-sm mb-3">Pipeline</h3>
        <div className="space-y-2">
          {STAGES.map(stage => {
            const count = byStage[stage]
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">{stage}</span>
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
          <div className="font-display font-bold text-green-400 text-lg">{byStage.Offer} Offer{byStage.Offer > 1 ? 's' : ''}!</div>
          <div className="text-slate-400 text-sm">Conversion: {total > 0 ? Math.round((byStage.Offer / total) * 100) : 0}%</div>
        </div>
      )}
    </div>
  )
}

// ── Company Notes View ──────────────────────────────────────────────────────
function CompanyNotesView({ app, notes, onSaveNotes, onBack, onUpdateApp }) {
  const [form, setForm] = useState({
    people: '', theyMentioned: '', techStack: '', culture: '', openQ: '', prepNotes: '', ...notes
  })
  const [saved, setSaved] = useState(false)

  function save() {
    onSaveNotes(form); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16}/> Back to Tracker</button>
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h2 className="section-title">{app.company}</h2>
          <p className="section-sub">{app.role}</p>
        </div>
        <select className="input-field w-36" value={app.stage}
          onChange={e => onUpdateApp({ stage: e.target.value })}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {app.jdUrl && (
        <div className="mb-4">
          <a href={app.jdUrl} target="_blank" rel="noopener noreferrer"
            className="text-teal-400 text-sm hover:text-teal-300 underline underline-offset-2">
            🔗 View Job Description
          </a>
        </div>
      )}

      <div className="space-y-3">
        {[
          ['people', "People I've spoken to", 'Names, titles, LinkedIn…'],
          ['theyMentioned', 'Things they mentioned', 'Pain points, team, priorities…'],
          ['techStack', 'Tech stack / tools', 'Systems, platforms…'],
          ['culture', 'Culture signals', 'Remote policy, values, vibe…'],
          ['openQ', 'Open questions', 'Things to ask or research…'],
          ['prepNotes', 'My prep notes', 'Key points to emphasize… (pre-filled from creation note)'],
        ].map(([key, label, ph]) => (
          <div key={key}>
            <label className="text-sm text-slate-400 mb-1.5 block">{label}</label>
            <textarea className="textarea-field h-16" placeholder={ph}
              value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
      </div>

      <button onClick={save} className={`btn-primary mt-4 ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
        {saved ? <><Check size={16}/> Saved!</> : <>Save Notes</>}
      </button>
    </div>
  )
}
