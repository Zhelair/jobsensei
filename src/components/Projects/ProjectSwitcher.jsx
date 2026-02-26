import React, { useState, useRef } from 'react'
import { useProject } from '../../context/ProjectContext'
import { FolderOpen, Plus, ChevronDown, Download, Upload, Trash2, Edit3, Check, X, FolderArchive } from 'lucide-react'

export default function ProjectSwitcher({ collapsed }) {
  const { projects, activeProject, switchProject, createProject, deleteProject, renameProject, exportProject, exportAll, importProjects } = useProject()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef(null)

  function handleCreate() {
    if (!newName.trim()) return
    createProject(newName.trim())
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditName(p.name)
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
    setOpen(false)
    e.target.value = ''
  }

  if (collapsed) return (
    <button onClick={() => setOpen(!open)} className="nav-item w-full justify-center px-0" title={activeProject?.name || 'Projects'}>
      <FolderOpen size={18} className="text-teal-400" />
    </button>
  )

  return (
    <div className="relative">
      {/* Active project button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/15 transition-all"
      >
        <FolderOpen size={14} className="text-teal-400 flex-shrink-0" />
        <span className="text-teal-300 text-xs font-body font-medium truncate flex-1 text-left">
          {activeProject?.name || 'No project'}
        </span>
        <ChevronDown size={12} className={`text-teal-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-navy-800 border border-navy-600 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Project list */}
          <div className="max-h-48 overflow-y-auto">
            {projects.map(p => (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 hover:bg-navy-700 cursor-pointer group ${p.id === activeProject?.id ? 'bg-teal-500/10' : ''}`}>
                {editingId === p.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      className="flex-1 bg-navy-900 border border-navy-500 rounded-lg px-2 py-0.5 text-white text-xs focus:outline-none focus:border-teal-500"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                    />
                    <button onClick={commitEdit} className="text-teal-400 hover:text-teal-300"><Check size={12} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { switchProject(p.id); setOpen(false) }} className="flex-1 text-left">
                      <span className={`text-xs font-body ${p.id === activeProject?.id ? 'text-teal-300' : 'text-slate-300'}`}>{p.name}</span>
                    </button>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={() => startEdit(p)} className="text-slate-500 hover:text-slate-300 p-0.5"><Edit3 size={11} /></button>
                      <button onClick={() => exportProject(p.id)} className="text-slate-500 hover:text-teal-400 p-0.5"><Download size={11} /></button>
                      {projects.length > 1 && (
                        <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id) }} className="text-slate-500 hover:text-red-400 p-0.5"><Trash2 size={11} /></button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-navy-700 p-2 space-y-1">
            {/* New project */}
            {creating ? (
              <div className="flex gap-1">
                <input
                  className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-teal-500"
                  placeholder="Project name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  autoFocus
                />
                <button onClick={handleCreate} disabled={!newName.trim()} className="text-teal-400 hover:text-teal-300 px-1"><Check size={14} /></button>
                <button onClick={() => setCreating(false)} className="text-slate-500 px-1"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 text-xs transition-all">
                <Plus size={13} /> New Project
              </button>
            )}

            <button onClick={exportAll} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 text-xs transition-all">
              <FolderArchive size={13} /> Export All Projects
            </button>

            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 text-xs transition-all">
              <Upload size={13} /> {importing ? 'Importing...' : 'Import Project'}
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

            {importMsg && <p className="text-xs text-center py-1">{importMsg}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
