import React from 'react'
import { AppProvider, useApp, SECTIONS } from './context/AppContext'
import { AIProvider } from './context/AIContext'
import { ProjectProvider } from './context/ProjectContext'
import { ThemeProvider } from './context/ThemeContext'
import { VisualsProvider } from './context/VisualsContext'
import VisualsOverlay from './components/shared/VisualsOverlay'
import PaywallModal from './components/shared/PaywallModal'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import BottomNav from './components/Layout/BottomNav'
import OnboardingWizard from './components/Onboarding/OnboardingWizard'
import Dashboard from './components/Dashboard/Dashboard'
import InterviewSimulator from './components/InterviewSimulator/InterviewSimulator'
import LearningSection from './components/LearningSection/LearningSection'
import Tools from './components/Tools/Tools'
import JobTracker from './components/JobTracker/JobTracker'
import Settings from './components/Settings/Settings'

function AppContent() {
  const { activeSection, showOnboarding } = useApp()

  const sections = {
    [SECTIONS.DASHBOARD]: Dashboard,
    [SECTIONS.INTERVIEW]: InterviewSimulator,
    [SECTIONS.LEARNING]: LearningSection,
    [SECTIONS.TOOLS]: Tools,
    [SECTIONS.TRACKER]: JobTracker,
    [SECTIONS.SETTINGS]: Settings,
  }

  const ActiveSection = sections[activeSection] || Dashboard

  // Sections that use full height (chat interfaces)
  const fullHeightSections = [SECTIONS.INTERVIEW]
  const isFullHeight = fullHeightSections.includes(activeSection)

  return (
    <div className="flex h-screen overflow-hidden bg-mesh">
      {showOnboarding && <OnboardingWizard />}
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className={`flex-1 ${isFullHeight ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} pb-16 md:pb-0`}>
          <ActiveSection />
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
