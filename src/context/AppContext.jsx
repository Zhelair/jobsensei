import React, { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export const SECTIONS = {
  DASHBOARD: 'dashboard',
  INTERVIEW: 'interview',
  LEARNING: 'learning',
  TOOLS: 'tools',
  TRACKER: 'tracker',
  SETTINGS: 'settings',
}

export function AppProvider({ children }) {
  const [activeSection, setActiveSection] = useState(SECTIONS.DASHBOARD)
  const [drillMode, setDrillMode] = useState(false) // false = Sensei, true = Drill Sergeant
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMuted, setIsMuted] = useState(false)

  // Stats tracking
  const [stats, setStats] = useState({
    mockInterviews: 0,
    avgScore: 0,
    topicsStudied: 0,
    applications: 0,
    streak: 0,
    lastActive: null,
  })

  useEffect(() => {
    const savedProfile = localStorage.getItem('js_profile')
    const savedStats = localStorage.getItem('js_stats')
    const onboardingDone = localStorage.getItem('js_onboarding_done')

    if (savedProfile) setProfile(JSON.parse(savedProfile))
    if (savedStats) setStats(JSON.parse(savedStats))
    if (!onboardingDone) setShowOnboarding(true)

    // Update streak
    const today = new Date().toDateString()
    const last = savedStats ? JSON.parse(savedStats).lastActive : null
    if (last && last !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (last !== yesterday.toDateString()) {
        // streak broken
        updateStats({ streak: 0, lastActive: today })
      }
    }
  }, [])

  function saveProfile(data) {
    setProfile(data)
    localStorage.setItem('js_profile', JSON.stringify(data))
    localStorage.setItem('js_onboarding_done', 'true')
    setShowOnboarding(false)
  }

  function updateStats(updates) {
    setStats(prev => {
      const next = { ...prev, ...updates, lastActive: new Date().toDateString() }
      localStorage.setItem('js_stats', JSON.stringify(next))
      return next
    })
  }

  return (
    <AppContext.Provider value={{
      activeSection, setActiveSection,
      drillMode, setDrillMode,
      showOnboarding, setShowOnboarding,
      profile, saveProfile,
      stats, updateStats,
      sidebarOpen, setSidebarOpen,
      isMuted, setIsMuted,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
