import React, { useState } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { LayoutDashboard, Mic, BookOpen, Wrench, Briefcase, Settings, FolderOpen, Check } from 'lucide-react'

const MOBILE_NAV = [
  { id: SECTIONS.DASHBOARD, icon: LayoutDashboard, label: 'Home' },
  { id: SECTIONS.INTERVIEW, icon: Mic, label: 'Interview' },
  { id: SECTIONS.LEARNING, icon: BookOpen, label: 'Learn' },
  { id: SECTIONS.TOOLS, icon: Wrench, label: 'Tools' },
  { id: SECTIONS.TRACKER, icon: Briefcase, label: 'Tracker' },
]

export default function BottomNav() {
  const { activeSection, setActiveSection } = useApp()
  const { projects, activeProject, switchProject } = useProject()
  const [showProjects, setShowProjects] = useState(false)

  function handleNavClick(id) {
    setActiveSection(id)
    setShowProjects(false)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-700 z-40">
      {/* Projects overlay panel */}
      {showProjects && (
        <div className="absolute bottom-full left-0 right-0 bg-navy-800 border-t border-navy-700 shadow-2xl">
          <div className="p-3 space-y-1 max-h-52 overflow-y-auto">
            <p className="text-slate-500 text-xs px-2 pb-1 font-display font-semibold tracking-wide uppercase">Switch Project</p>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => { switchProject(p.id); setShowProjects(false) }}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                  p.id === activeProject?.id
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20'
                    : 'text-slate-300 hover:bg-navy-700'
                }`}
              >
                <FolderOpen size={15} className="text-teal-400 flex-shrink-0" />
                <span className="truncate flex-1">{p.name}</span>
                {p.id === activeProject?.id && <Check size={13} className="text-teal-400 flex-shrink-0" />}
              </button>
            ))}
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

        {/* Projects button */}
        <button
          onClick={() => setShowProjects(v => !v)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
            showProjects ? 'text-teal-400' : 'text-slate-500'
          }`}
        >
          <FolderOpen size={19} />
          <span className="font-body">Projects</span>
        </button>

        {/* Settings button */}
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
