import React from 'react'
import { AppProvider, useApp, SECTIONS } from './context/AppContext'
import { AIProvider } from './context/AIContext'
import { ProjectProvider } from './context/ProjectContext'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import BottomNav from './components/Layout/BottomNav'
import OnboardingWizard from './components/Onboarding/OnboardingWizard'
import Dashboard from './components/Dashboard/Dashboard'
import InterviewSimulator from './components/InterviewSimulator/InterviewSimulator'
import GapAnalysis from './components/GapAnalysis/GapAnalysis'
import LearningSection from './components/LearningSection/LearningSection'
import STARBuilder from './components/STARBuilder/STARBuilder'
import NegotiationSim from './components/NegotiationSim/NegotiationSim'
import Tools from './components/Tools/Tools'
import JobTracker from './components/JobTracker/JobTracker'
import Settings from './components/Settings/Settings'

function AppContent() {
  const { activeSection, showOnboarding } = useApp()

  const sections = {
    [SECTIONS.DASHBOARD]: Dashboard,
    [SECTIONS.INTERVIEW]: InterviewSimulator,
    [SECTIONS.GAP]: GapAnalysis,
    [SECTIONS.LEARNING]: LearningSection,
    [SECTIONS.STAR]: STARBuilder,
    [SECTIONS.NEGOTIATION]: NegotiationSim,
    [SECTIONS.TOOLS]: Tools,
    [SECTIONS.TRACKER]: JobTracker,
    [SECTIONS.SETTINGS]: Settings,
  }

  const ActiveSection = sections[activeSection] || Dashboard

  // Sections that use full height (chat interfaces)
  const fullHeightSections = [SECTIONS.INTERVIEW, SECTIONS.NEGOTIATION]
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
    </div>
  )
}

export default function App() {
  return (
    <AIProvider>
      <AppProvider>
        <ProjectProvider>
          <AppContent />
        </ProjectProvider>
      </AppProvider>
    </AIProvider>
  )
}
