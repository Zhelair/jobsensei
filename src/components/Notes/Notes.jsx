import React, { useState } from 'react'
import { useProject } from '../../context/ProjectContext'
import { FileText, Building2, Plus, Trash2, X } from 'lucide-react'

export default function Notes() {
  const { getProjectData, updateProjectData } = useProject()
  const [tab, setTab] = useState('my')
  const [newCompany, setNewCompany] = useState('')
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)

  const notes = getProjectData('notes') || ''
  const companyNotes = getProjectData('companyNotes') || {}

  function setNotes(value) {
    updateProjectData('notes', value)
  }

  function setCompanyNote(company, value) {
    updateProjectData('companyNotes', { ...companyNotes, [company]: value })
  }

  function addCompany() {
    const name = newCompany.trim()
    if (!name || companyNotes[name] !== undefined) return
    updateProjectData('companyNotes', { ...companyNotes, [name]: '' })
    setSelectedCompany(name)
    setNewCompany('')
    setShowAddCompany(false)
  }

  function deleteCompany(name) {
    if (!confirm(`Delete notes for "${name}"?`)) return
    const next = { ...companyNotes }
    delete next[name]
    updateProjectData('companyNotes', next)
    if (selectedCompany === name) setSelectedCompany(null)
  }

  const companies = Object.keys(companyNotes)

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Notes & Workbook</h2>
          <p className="section-sub">Your personal scratchpad — auto-saves as you type</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-navy-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('my')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-display font-medium transition-all ${tab === 'my' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <FileText size={14} /> My Notes
        </button>
        <button
          onClick={() => setTab('company')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-display font-medium transition-all ${tab === 'company' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Building2 size={14} /> Company Notes
          {companies.length > 0 && <span className="text-xs bg-navy-700 rounded-full px-1.5 py-0.5">{companies.length}</span>}
        </button>
      </div>

      {tab === 'my' && (
        <div className="animate-in">
          <textarea
            className="textarea-field w-full font-mono text-sm leading-relaxed"
            style={{ minHeight: '60vh' }}
            placeholder={`Write anything here…\n\nIdeas, prep notes, things to research, key talking points, salary targets — whatever helps your job search.\n\nAuto-saves as you type.`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <p className="text-slate-600 text-xs mt-2 text-right">{notes.length} characters · auto-saved</p>
        </div>
      )}

      {tab === 'company' && (
        <div className="flex gap-4 animate-in" style={{ minHeight: '60vh' }}>
          {/* Company list */}
          <div className="w-52 flex-shrink-0 flex flex-col gap-2">
            {companies.length === 0 && !showAddCompany && (
              <p className="text-slate-500 text-xs px-1">No companies yet. Add one to start.</p>
            )}
            {companies.map(name => (
              <button
                key={name}
                onClick={() => setSelectedCompany(name)}
                className={`group w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between gap-2 ${
                  selectedCompany === name
                    ? 'bg-teal-500/10 border-teal-500/30 text-white'
                    : 'bg-navy-800 border-navy-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="truncate">{name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteCompany(name) }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))}

            {showAddCompany ? (
              <div className="flex gap-1">
                <input
                  className="input-field text-sm py-1.5 flex-1"
                  placeholder="Company name"
                  value={newCompany}
                  onChange={e => setNewCompany(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCompany(); if (e.key === 'Escape') { setShowAddCompany(false); setNewCompany('') } }}
                  autoFocus
                />
                <button onClick={() => { setShowAddCompany(false); setNewCompany('') }} className="btn-ghost p-1.5"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setShowAddCompany(true)} className="btn-secondary text-xs justify-center"><Plus size={13} /> Add Company</button>
            )}
          </div>

          {/* Note editor */}
          <div className="flex-1">
            {selectedCompany ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-teal-400" />
                  <span className="text-white text-sm font-display font-semibold">{selectedCompany}</span>
                </div>
                <textarea
                  className="textarea-field w-full font-mono text-sm leading-relaxed"
                  style={{ minHeight: '52vh' }}
                  placeholder={`Notes for ${selectedCompany}…\n\nResearch, contacts, interview prep, salary data, follow-up tasks…`}
                  value={companyNotes[selectedCompany] || ''}
                  onChange={e => setCompanyNote(selectedCompany, e.target.value)}
                />
                <p className="text-slate-600 text-xs mt-2 text-right">{(companyNotes[selectedCompany] || '').length} characters · auto-saved</p>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Building2 size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Select a company to view or edit notes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
