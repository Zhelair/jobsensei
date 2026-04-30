import React from 'react'
import { AppProvider, useApp, SECTIONS } from './context/AppContext'
import { AIProvider } from './context/AIContext'
import { ProjectProvider, useProject } from './context/ProjectContext'
import { ThemeProvider } from './context/ThemeContext'
import { VisualsProvider } from './context/VisualsContext'
import VisualsOverlay from './components/shared/VisualsOverlay'
import PaywallModal from './components/shared/PaywallModal'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import BottomNav from './components/Layout/BottomNav'
import OnboardingWizard from './components/Onboarding/OnboardingWizard'
import ExtensionCaptureBridge from './components/shared/ExtensionCaptureBridge'
import Dashboard from './components/Dashboard/Dashboard'
import TodayPage from './components/Today/TodayPage'
import LearningSection from './components/LearningSection/LearningSection'
import Tools from './components/Tools/Tools'
import JobTracker from './components/JobTracker/JobTracker'
import Settings from './components/Settings/Settings'

const APPLICATION_REQUIRED_SECTIONS = new Set([
  SECTIONS.DASHBOARD,
  SECTIONS.INTERVIEW,
  SECTIONS.TOOLS,
])

function ApplicationRequiredGate({ sectionLabel }) {
  const { setActiveSection } = useApp()

  return (
    <div className="min-h-full p-4 md:p-6 flex items-center justify-center animate-in">
      <div className="card max-w-xl w-full border-teal-500/25 bg-teal-500/5 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-300">
          <span className="font-display font-bold text-lg">JS</span>
        </div>
        <h2 className="font-display font-bold text-white text-2xl mb-2">Add an application first</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-5">
          {sectionLabel} works best when JobSensei knows the company, role, and job description.
          Create or capture one real application first, then the tools will unlock with the right context.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveSection(SECTIONS.APPLICATIONS)}
            className="btn-primary justify-center"
          >
            Add Application
          </button>
          <button
            onClick={() => setActiveSection(SECTIONS.TODAY)}
            className="btn-ghost justify-center"
          >
            Back to Today
          </button>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { activeSection, showOnboarding, navKey } = useApp()
  const { getProjectData } = useProject()
  const applications = getProjectData('applications') || []

  const sections = {
    [SECTIONS.TODAY]: TodayPage,
    [SECTIONS.APPLICATIONS]: JobTracker,
    [SECTIONS.DASHBOARD]: Dashboard,
    [SECTIONS.INTERVIEW]: () => <Tools mode="interview-prep" />,
    [SECTIONS.LEARNING]: LearningSection,
    [SECTIONS.TOOLS]: () => <Tools mode="prep-tools" />,
    [SECTIONS.TRACKER]: JobTracker,
    [SECTIONS.SETTINGS]: Settings,
  }

  const ActiveSection = sections[activeSection] || Dashboard
  const requiresApplication = APPLICATION_REQUIRED_SECTIONS.has(activeSection) && applications.length === 0

  // Sections that use full height (chat interfaces)
  const fullHeightSections = [SECTIONS.INTERVIEW]
  const isFullHeight = fullHeightSections.includes(activeSection)

  return (
    <div className="flex h-screen overflow-hidden bg-mesh">
      {showOnboarding && <OnboardingWizard />}
      <ExtensionCaptureBridge />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className={`flex-1 ${isFullHeight ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} pb-16 md:pb-0`}>
          {requiresApplication ? (
            <ApplicationRequiredGate sectionLabel={activeSection === SECTIONS.INTERVIEW ? 'Interview Prep' : activeSection === SECTIONS.TOOLS ? 'Prep Tools' : 'Dashboard'} />
          ) : (
            <ActiveSection key={navKey} />
          )}
        </main>
      </div>
      <BottomNav />
      <VisualsOverlay />
      <PaywallModal />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <VisualsProvider>
        <AIProvider>
          <AppProvider>
            <ProjectProvider>
              <AppContent />
            </ProjectProvider>
          </AppProvider>
        </AIProvider>
      </VisualsProvider>
    </ThemeProvider>
  )
}
