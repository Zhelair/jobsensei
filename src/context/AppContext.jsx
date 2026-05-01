import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AppContext = createContext(null)

export const SECTIONS = {
  TODAY: 'today',
  APPLICATIONS: 'applications',
  DASHBOARD: 'dashboard',
  INTERVIEW: 'interview',
  LEARNING: 'learning',
  TOOLS: 'tools',
  TRACKER: 'tracker',
  SETTINGS: 'settings',
}

const APP_HISTORY_KEY = 'jobsensei'
const SECTION_VALUES = Object.values(SECTIONS)

function parseSavedJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function getSectionFromLocation() {
  const stateSection = window.history.state?.[APP_HISTORY_KEY]?.section
  if (SECTION_VALUES.includes(stateSection)) return stateSection

  const hashSection = window.location.hash.replace(/^#\/?/, '')
  if (SECTION_VALUES.includes(hashSection)) return hashSection

  return SECTIONS.TODAY
}

export function AppProvider({ children }) {
  const [activeSection, setActiveSectionState] = useState(() => getSectionFromLocation())
  const [drillMode, setDrillMode] = useState(false) // false = Sensei, true = Drill Sergeant
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [navKey, setNavKey] = useState(0)
  const [pendingToolRequest, setPendingToolRequest] = useState(null)
  const [pendingLearningRequest, setPendingLearningRequest] = useState(null)
  const [pendingTrackerRequest, setPendingTrackerRequest] = useState(null)
  const activeSectionRef = useRef(activeSection)

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
    const parsedProfile = parseSavedJson(savedProfile)
    const parsedStats = parseSavedJson(savedStats)

    if (parsedProfile) setProfile(parsedProfile)
    if (parsedStats) setStats(parsedStats)
    if (!onboardingDone) setShowOnboarding(true)

    // Update streak
    const today = new Date().toDateString()
    const last = parsedStats?.lastActive || null
    if (last && last !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (last !== yesterday.toDateString()) {
        // streak broken
        updateStats({ streak: 0, lastActive: today })
      }
    }
  }, [])

  useEffect(() => {
    activeSectionRef.current = activeSection
  }, [activeSection])

  const makeHistoryState = useCallback((section, detail = {}) => ({
    [APP_HISTORY_KEY]: {
      section,
      ...detail,
    },
  }), [])

  const replaceAppHistory = useCallback((section = activeSectionRef.current, detail = {}) => {
    if (!SECTION_VALUES.includes(section)) return
    const state = makeHistoryState(section, detail)
    window.history.replaceState(state, '', `#${section}`)
  }, [makeHistoryState])

  const pushAppHistory = useCallback((section = activeSectionRef.current, detail = {}) => {
    if (!SECTION_VALUES.includes(section)) return
    const current = window.history.state?.[APP_HISTORY_KEY]
    const next = { section, ...detail }
    if (JSON.stringify(current || {}) === JSON.stringify(next)) return
    window.history.pushState(makeHistoryState(section, detail), '', `#${section}`)
  }, [makeHistoryState])

  useEffect(() => {
    replaceAppHistory(activeSectionRef.current)

    const handlePopState = (event) => {
      const section = event.state?.[APP_HISTORY_KEY]?.section || getSectionFromLocation()
      if (!SECTION_VALUES.includes(section)) return
      setActiveSectionState(section)
      setNavKey(k => k + 1)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [replaceAppHistory])

  const setActiveSection = useCallback((nextSectionOrUpdater, detail = {}) => {
    setActiveSectionState(prev => {
      const nextSection = typeof nextSectionOrUpdater === 'function'
        ? nextSectionOrUpdater(prev)
        : nextSectionOrUpdater

      if (!SECTION_VALUES.includes(nextSection)) return prev
      if (nextSection !== prev || Object.keys(detail).length > 0) {
        pushAppHistory(nextSection, detail)
      }
      return nextSection
    })
  }, [pushAppHistory])

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

  function launchTool(section, toolId) {
    const requestedAt = Date.now()
    setPendingToolRequest({ section, toolId, requestedAt })
    setNavKey(prev => prev + 1)
    setActiveSection(section, { toolId, requestedAt })
  }

  function clearPendingToolRequest() {
    setPendingToolRequest(null)
  }

  function openLearningTopic(topicId, view = 'tutor') {
    setPendingLearningRequest({ topicId, view, requestedAt: Date.now() })
    setNavKey(prev => prev + 1)
    setActiveSection(SECTIONS.LEARNING, { learningView: view, topicId })
  }

  function clearPendingLearningRequest() {
    setPendingLearningRequest(null)
  }

  function openTrackerApplication(applicationId, workspaceTab = 'overview') {
    setPendingTrackerRequest({ applicationId, workspaceTab, requestedAt: Date.now() })
    setNavKey(prev => prev + 1)
    setActiveSection(SECTIONS.APPLICATIONS, { trackerView: 'workspace', applicationId, workspaceTab })
  }

  function clearPendingTrackerRequest() {
    setPendingTrackerRequest(null)
  }

  return (
    <AppContext.Provider value={{
      activeSection, setActiveSection,
      pushAppHistory, replaceAppHistory,
      drillMode, setDrillMode,
      showOnboarding, setShowOnboarding,
      profile, saveProfile,
      stats, updateStats,
      sidebarOpen, setSidebarOpen,
      isMuted, setIsMuted,
      navKey, setNavKey,
      pendingToolRequest, launchTool, clearPendingToolRequest,
      pendingLearningRequest, openLearningTopic, clearPendingLearningRequest,
      pendingTrackerRequest, openTrackerApplication, clearPendingTrackerRequest,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
