import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import {
  LayoutDashboard, Mic, BookOpen,
  Wrench, Briefcase, Settings, ChevronLeft, ChevronRight, GraduationCap
} from 'lucide-react'
import ProjectSwitcher from '../Projects/ProjectSwitcher'

const NAV_ITEMS = [
  { id: SECTIONS.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { id: SECTIONS.INTERVIEW, icon: Mic, label: 'Interview Sim' },
  { id: SECTIONS.LEARNING, icon: BookOpen, label: 'Learning' },
  { id: SECTIONS.TOOLS, icon: Wrench, label: 'Tools' },
  { id: SECTIONS.TRACKER, icon: Briefcase, label: 'Job Tracker' },
]

export default function Sidebar() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen } = useApp()

  return (
    <aside className={`hidden md:flex flex-col bg-navy-900 border-r border-navy-700 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-700">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={16} className="text-white" />
        </div>
        {sidebarOpen && (
          <span className="font-display font-bold text-white text-lg">JobSensei</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            title={!sidebarOpen ? label : undefined}
            className={`nav-item w-full ${activeSection === id ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-navy-700 space-y-2">
        <ProjectSwitcher collapsed={!sidebarOpen} />
        <button
          onClick={() => setActiveSection(SECTIONS.SETTINGS)}
          className={`nav-item w-full ${activeSection === SECTIONS.SETTINGS ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
        >
          <Settings size={18} className="flex-shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </button>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="nav-item w-full justify-center px-0"
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </aside>
  )
}
