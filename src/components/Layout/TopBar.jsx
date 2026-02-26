import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { Settings, GraduationCap, Zap, Shield } from 'lucide-react'

const SECTION_TITLES = {
  dashboard: 'Dashboard',
  interview: 'Interview Simulator',
  gap: 'Gap Analysis',
  learning: 'Learning',
  star: 'STAR Builder',
  negotiation: 'Negotiation Simulator',
  tools: 'Tools',
  tracker: 'Job Tracker',
  settings: 'Settings',
}

export default function TopBar() {
  const { activeSection, setActiveSection, drillMode, setDrillMode } = useApp()
  const { isConnected } = useAI()

  return (
    <header className="bg-navy-900 border-b border-navy-700 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
          <GraduationCap size={14} className="text-white" />
        </div>
        <span className="font-display font-bold text-white">JobSensei</span>
      </div>

      {/* Desktop title */}
      <h1 className="hidden md:block font-display font-semibold text-white text-lg">
        {SECTION_TITLES[activeSection] || ''}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Connection indicator */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {isConnected ? 'AI Connected' : 'No API Key'}
        </div>

        {/* Sensei/Drill toggle */}
        <button
          onClick={() => setDrillMode(!drillMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-200 ${
            drillMode
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20'
          }`}
          title={drillMode ? 'Switch to Sensei Mode (supportive)' : 'Switch to Drill Sergeant Mode (brutal)'}
        >
          {drillMode ? <Zap size={12} /> : <Shield size={12} />}
          <span className="hidden sm:inline">{drillMode ? 'Drill 🔱' : 'Sensei'}</span>
        </button>

        <button
          onClick={() => setActiveSection(SECTIONS.SETTINGS)}
          className="btn-ghost"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
