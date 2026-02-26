import React, { useState } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { generateId, formatDate, timeAgo } from '../../utils/helpers'
import { Plus, X, Download, Briefcase, BarChart2, Building2, ArrowLeft, Edit3, Check } from 'lucide-react'

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

export default function JobTracker() {
  const [applications, setApplications] = useLocalStorage('js_applications', [])
  const [notes, setNotes] = useLocalStorage('js_company_notes', {})
  const [tab, setTab] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newApp, setNewApp] = useState({ company: '', role: '', stage: 'Researching', jdUrl: '', notes: '' })
  const [selectedApp, setSelectedApp] = useState(null)

  function addApplication() {
    if (!newApp.company.trim()) return
    const app = { ...newApp, id: generateId(), date: new Date().toISOString() }
    setApplications(prev => [...prev, app])
    setNewApp({ company: '', role: '', stage: 'Researching', jdUrl: '', notes: '' })
    setShowAdd(false)
  }

  function updateApp(id, updates) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  function deleteApp(id) {
    setApplications(prev => prev.filter(a => a.id !== id))
  }

  function moveApp(id, stage) {
    updateApp(id, { stage })
  }

  function exportJSON() {
    const data = JSON.stringify({ applications, notes }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'jobsensei-tracker.json'; a.click()
  }

  if (selectedApp) return (
    <CompanyNotesView
      app={selectedApp}
      notes={notes[selectedApp.id] || { people: '', theyMentioned: '', techStack: '', culture: '', openQ: '', prepNotes: '' }}
      onSaveNotes={(n) => setNotes(prev => ({ ...prev, [selectedApp.id]: n }))}
      onBack={() => setSelectedApp(null)}
      onUpdateApp={(updates) => { updateApp(selectedApp.id, updates); setSelectedApp(a => ({...a, ...updates})) }}
    />
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Job Tracker</h2>
          <p className="section-sub">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportJSON} className="btn-ghost text-xs"><Download size={14} /> Export</button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus size={14} /> Add</button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">Add Application</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input className="input-field" placeholder="Company *" value={newApp.company} onChange={e => setNewApp(p => ({...p, company: e.target.value}))} />
            <input className="input-field" placeholder="Role title" value={newApp.role} onChange={e => setNewApp(p => ({...p, role: e.target.value}))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select className="input-field" value={newApp.stage} onChange={e => setNewApp(p => ({...p, stage: e.target.value}))}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="input-field" placeholder="JD URL (optional)" value={newApp.jdUrl} onChange={e => setNewApp(p => ({...p, jdUrl: e.target.value}))} />
          </div>
          <textarea className="textarea-field h-16 mb-3" placeholder="Notes..." value={newApp.notes} onChange={e => setNewApp(p => ({...p, notes: e.target.value}))} />
          <div className="flex gap-2">
            <button onClick={addApplication} disabled={!newApp.company.trim()} className="btn-primary">Add Application</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl mb-4">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all ${tab === i ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Kanban */}
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
                  <div className="space-y-2 kanban-col">
                    {stageApps.map(app => (
                      <div key={app.id} className="card-hover p-3">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <button onClick={() => setSelectedApp(app)} className="text-white text-xs font-body font-medium hover:text-teal-400 text-left">
                            {app.company}
                          </button>
                          <button onClick={() => deleteApp(app.id)} className="text-slate-600 hover:text-red-400 flex-shrink-0"><X size={12} /></button>
                        </div>
                        {app.role && <div className="text-slate-500 text-xs mb-2">{app.role}</div>}
                        <div className="text-slate-600 text-xs mb-2">{timeAgo(app.date)}</div>
                        {/* Move buttons */}
                        <select
                          className="w-full bg-navy-900 border border-navy-600 rounded-lg px-2 py-1 text-xs text-slate-400 focus:outline-none"
                          value={app.stage}
                          onChange={e => moveApp(app.id, e.target.value)}
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

      {/* Stats */}
      {tab === 1 && <TrackerStats applications={applications} />}

      {/* Notes list */}
      {tab === 2 && (
        <div className="space-y-2">
          {applications.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">Add applications to track company notes.</div>
          ) : applications.map(app => (
            <button key={app.id} onClick={() => setSelectedApp(app)} className="card-hover w-full text-left flex items-center gap-3">
              <Building2 size={18} className="text-slate-500 flex-shrink-0" />
              <div>
                <div className="text-white font-body font-medium text-sm">{app.company}</div>
                <div className="text-slate-500 text-xs">{app.role} · <span className={STAGE_COLORS[app.stage]?.split(' ')[0]}>{app.stage}</span></div>
              </div>
              <span className="ml-auto text-slate-600 text-xs">{notes[app.id] ? '📝' : '+'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TrackerStats({ applications }) {
  const total = applications.length
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.stage === s).length }), {})
  const active = applications.filter(a => !['Offer', 'Rejected'].includes(a.stage)).length
  const offers = byStage.Offer
  const rejected = byStage.Rejected

  return (
    <div className="space-y-4 animate-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total', total, 'text-white'], ['Active', active, 'text-teal-400'], ['Offers', offers, 'text-green-400'], ['Rejected', rejected, 'text-red-400']].map(([l, v, c]) => (
          <div key={l} className="card text-center">
            <div className={`font-display font-bold text-2xl mb-1 ${c}`}>{v}</div>
            <div className="text-slate-400 text-xs">{l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-white text-sm mb-3">By Stage</h3>
        <div className="space-y-2">
          {STAGES.map(stage => {
            const count = byStage[stage]
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">{stage}</span>
                <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-slate-500 text-xs w-4">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {offers > 0 && (
        <div className="card border-green-500/20 bg-green-500/5 text-center py-6">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-display font-bold text-green-400 text-lg">{offers} Offer{offers > 1 ? 's' : ''}!</div>
          <div className="text-slate-400 text-sm">Conversion rate: {total > 0 ? Math.round((offers/total)*100) : 0}%</div>
        </div>
      )}
    </div>
  )
}

function CompanyNotesView({ app, notes, onSaveNotes, onBack, onUpdateApp }) {
  const [form, setForm] = useState(notes)
  const [saved, setSaved] = useState(false)

  function save() {
    onSaveNotes(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Back to Tracker</button>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="section-title">{app.company}</h2>
          <p className="section-sub">{app.role}</p>
        </div>
        <select
          className="input-field w-36"
          value={app.stage}
          onChange={e => onUpdateApp({ stage: e.target.value })}
        >
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {[
          ['people', 'People I\'ve spoken to', 'Names, titles, LinkedIn...'],
          ['theyMentioned', 'Things they mentioned', 'Pain points, team dynamics, priorities...'],
          ['techStack', 'Tech stack / tools', 'Systems, platforms, tools they use...'],
          ['culture', 'Culture signals', 'Remote policy, values, vibe...'],
          ['openQ', 'Open questions', 'Things to ask or research...'],
          ['prepNotes', 'My prep notes', 'Key points to emphasize, custom angles...'],
        ].map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="text-sm text-slate-400 mb-1.5 block">{label}</label>
            <textarea
              className="textarea-field h-16"
              placeholder={placeholder}
              value={form[key] || ''}
              onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
            />
          </div>
        ))}
      </div>

      <button onClick={save} className={`btn-primary mt-4 ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
        {saved ? <><Check size={16} /> Saved!</> : <>Save Notes</>}
      </button>
    </div>
  )
}
