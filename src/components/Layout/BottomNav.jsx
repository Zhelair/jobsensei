import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { LayoutDashboard, Mic, Search, BookOpen, Briefcase } from 'lucide-react'

const MOBILE_NAV = [
  { id: SECTIONS.DASHBOARD, icon: LayoutDashboard, label: 'Home' },
  { id: SECTIONS.INTERVIEW, icon: Mic, label: 'Interview' },
  { id: SECTIONS.GAP, icon: Search, label: 'Gap' },
  { id: SECTIONS.LEARNING, icon: BookOpen, label: 'Learn' },
  { id: SECTIONS.TRACKER, icon: Briefcase, label: 'Tracker' },
]

export default function BottomNav() {
  const { activeSection, setActiveSection } = useApp()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-700 z-40">
      <div className="flex">
        {MOBILE_NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activeSection === id ? 'text-teal-400' : 'text-slate-500'
            }`}
          >
            <Icon size={20} />
            <span className="font-body">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
