import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  LayoutDashboard, BookOpen,
  Briefcase, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import ProjectSwitcher from '../Projects/ProjectSwitcher'
import BrandMark from '../shared/BrandMark'

const NAV_ITEMS = [
  { id: SECTIONS.TODAY, icon: LayoutDashboard, labelKey: 'nav.today' },
  { id: SECTIONS.APPLICATIONS, icon: Briefcase, labelKey: 'nav.applications' },
  { id: SECTIONS.LEARNING, icon: BookOpen, labelKey: 'nav.learning' },
]

export default function Sidebar() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, navKey, setNavKey } = useApp()
  const { t } = useLanguage()

  function isNavActive(id) {
    if (id === SECTIONS.APPLICATIONS) {
      return activeSection === SECTIONS.APPLICATIONS || activeSection === SECTIONS.TRACKER
    }
    if (id === SECTIONS.TODAY) {
      return activeSection === SECTIONS.TODAY || activeSection === SECTIONS.DASHBOARD
    }
    return activeSection === id
  }

  function handleNavClick(id) {
    if (isNavActive(id)) setNavKey(k => k + 1)
    setActiveSection(id)
  }

  return (
    <aside className={`hidden md:flex flex-col bg-navy-900 border-r border-navy-700 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-700">
        <BrandMark className="w-9 h-9" />
        {sidebarOpen && (
          <div className="flex flex-col gap-0.5">
            <span className="font-display font-bold text-white text-xl leading-tight tracking-tight">JobSensei</span>
            <span className="logo-mantra text-xs leading-tight">{t('brand.tagline')}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            data-guide={`nav-${id}`}
            onClick={() => handleNavClick(id)}
            title={!sidebarOpen ? t(labelKey) : undefined}
            className={`nav-item w-full ${isNavActive(id) ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>{t(labelKey)}</span>}
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
          {sidebarOpen && <span>{t('nav.settings')}</span>}
        </button>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="nav-item w-full justify-center px-0"
          title={sidebarOpen ? t('common.collapse') : t('common.expand')}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </aside>
  )
}
