import React, { useState, useRef } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import {
  LayoutDashboard, Mic, BookOpen, Wrench, Briefcase,
  Settings, FolderOpen, Plus, Check, X, Edit3, Download, Trash2, Upload, FolderArchive
} from 'lucide-react'

const MOBILE_NAV = [
  { id: SECTIONS.DASHBOARD, icon: LayoutDashboard, label: 'Home' },
  { id: SECTIONS.INTERVIEW, icon: Mic, label: 'Interview' },
  { id: SECTIONS.LEARNING, icon: BookOpen, label: 'Learn' },
  { id: SECTIONS.TOOLS, icon: Wrench, label: 'Tools' },
  { id: SECTIONS.TRACKER, icon: Briefcase, label: 'Tracker' },
]

export default function BottomNav() {
  const { activeSection, setActiveSection } = useApp()
  const {
    projects, activeProject,
    switchProject, createProject, deleteProject, renameProject,
    exportProject, exportAll, importProjects
  } = useProject()

  const [showProjects, setShowProjects] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  function handleNavClick(id) {
    setActiveSection(id)
    setShowProjects(false)
  }

  function handleCreate() {
    if (!newName.trim()) return
    createProject(newName.trim())
    setNewName('')
    setCreating(false)
  }

  function commitEdit() {
    if (editName.trim()) renameProject(editingId, editName.trim())
    setEditingId(null)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const count = await importProjects(file)
      setImportMsg(`✅ Imported ${count} project${count > 1 ? 's' : ''}`)
      setTimeout(() => setImportMsg(''), 3000)
    } catch {
      setImportMsg('❌ Invalid file')
      setTimeout(() => setImportMsg(''), 3000)
    }
    setImporting(false)
    e.target.value = ''
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-700 z-40">
      {/* Projects panel */}
      {showProjects && (
        <div className="absolute bottom-full left-0 right-0 bg-navy-800 border-t border-navy-700 shadow-2xl">
          <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wide">Projects</p>
              <button onClick={() => setShowProjects(false)} className="text-slate-500 hover:text-slate-300 p-1">
                <X size={14} />
              </button>
            </div>

            {/* Project list */}
            {projects.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
                  p.id === activeProject?.id
                    ? 'bg-teal-500/15 border border-teal-500/20'
                    : 'bg-navy-700/40'
                }`}
              >
                {editingId === p.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      className="flex-1 bg-navy-900 border border-navy-500 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-teal-500"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                    />
                    <button onClick={commitEdit} className="text-teal-400 p-1"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 p-1"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { switchProject(p.id); setShowProjects(false) }}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <FolderOpen size={14} className="text-teal-400 flex-shrink-0" />
                      <span className={`text-sm truncate ${p.id === activeProject?.id ? 'text-teal-300 font-medium' : 'text-slate-300'}`}>
                        {p.name}
                      </span>
                      {p.id === activeProject?.id && <Check size={12} className="text-teal-400 flex-shrink-0 ml-auto" />}
                    </button>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                        className="p-1.5 text-slate-500 hover:text-slate-300 rounded"
                        title="Rename"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => exportProject(p.id)}
                        className="p-1.5 text-slate-500 hover:text-teal-400 rounded"
                        title="Export"
                      >
                        <Download size={13} />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id) }}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Create new project */}
            {creating ? (
              <div className="flex gap-1 pt-1">
                <input
                  className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Project name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  autoFocus
                />
                <button onClick={handleCreate} disabled={!newName.trim()} className="text-teal-400 hover:text-teal-300 px-2"><Check size={16} /></button>
                <button onClick={() => setCreating(false)} className="text-slate-500 px-1"><X size={16} /></button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-700 text-sm transition-all"
              >
                <Plus size={14} /> New Project
              </button>
            )}

            {/* Import / Export */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={exportAll}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-navy-700/50 text-slate-400 hover:text-white text-xs transition-all"
              >
                <FolderArchive size={13} /> Export All
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-navy-700/50 text-slate-400 hover:text-white text-xs transition-all"
              >
                <Upload size={13} /> {importing ? 'Importing…' : 'Import'}
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>

            {importMsg && <p className="text-xs text-center py-1">{importMsg}</p>}
          </div>
        </div>
      )}

      {/* Nav row */}
      <div className="flex">
        {MOBILE_NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
              activeSection === id && !showProjects ? 'text-teal-400' : 'text-slate-500'
            }`}
          >
            <Icon size={19} />
            <span className="font-body">{label}</span>
          </button>
        ))}

        {/* Projects */}
        <button
          onClick={() => setShowProjects(v => !v)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
            showProjects ? 'text-teal-400' : 'text-slate-500'
          }`}
        >
          <FolderOpen size={19} />
          <span className="font-body">Projects</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => handleNavClick(SECTIONS.SETTINGS)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
            activeSection === SECTIONS.SETTINGS && !showProjects ? 'text-teal-400' : 'text-slate-500'
          }`}
        >
          <Settings size={19} />
          <span className="font-body">Settings</span>
        </button>
      </div>
    </nav>
  )
}
