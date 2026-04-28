import React, { createContext, useContext, useState, useEffect } from 'react'
import { generateId } from '../utils/helpers'
import { makeTrackerApplication, normalizeApplicationUrl } from '../utils/jobIntake'

const ProjectContext = createContext(null)

const EMPTY_PROJECT_DATA = {
  gapResults: [],           // saved gap analyses
  interviewSessions: [],    // interview history
  toolsHistory: [],         // tools usage history
  quizHistory: [],          // full quiz result snapshots
  starStories: [],          // STAR bank
  applications: [],         // job tracker
  companyNotes: {},         // company notes
  topics: [],               // learning topics
  resume: '',               // resume text
  notes: '',                // free notes
  topicNotes: [],           // saved notes from learning sessions
  currentJD: '',            // persistent JD field across gap/interview
  activeApplicationId: null,// tracker application currently driving tool context
  interviewMode: 'hr',      // last interview mode used
}

function normalizeProject(project) {
  return {
    ...project,
    data: {
      ...EMPTY_PROJECT_DATA,
      ...(project?.data || {}),
    },
  }
}

function makeProject(name) {
  return {
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: { ...EMPTY_PROJECT_DATA },
  }
}

function parseSavedJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeMatchText(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findExistingCapturedApplication(applications, { normalizedUrl, company, role }) {
  const companyKey = normalizeMatchText(company)
  const roleKey = normalizeMatchText(role)

  return applications.find(app => {
    if (normalizedUrl && app.jdUrl && normalizeApplicationUrl(app.jdUrl) === normalizedUrl) {
      return true
    }

    const appCompanyKey = normalizeMatchText(app.company)
    const appRoleKey = normalizeMatchText(app.role)
    return !!companyKey && !!roleKey && appCompanyKey === companyKey && appRoleKey === roleKey
  })
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)

  // Load on mount
  useEffect(() => {
    const saved = localStorage.getItem('js_projects')
    const activeId = localStorage.getItem('js_active_project')
    const parsedSaved = parseSavedJson(saved)

    if (Array.isArray(parsedSaved)) {
      const parsed = parsedSaved.map(normalizeProject)
      setProjects(parsed)
      localStorage.setItem('js_projects', JSON.stringify(parsed))
      // Migrate old data into default project if no projects exist yet
      if (parsed.length === 0) {
        initDefaultProject()
      } else {
        setActiveProjectId(parsed.some(p => p.id === activeId) ? activeId : parsed[0].id)
      }
    } else {
      initDefaultProject()
    }
  }, [])

  function initDefaultProject() {
    // Migrate any old localStorage data into a "Default" project
    const oldSessions = localStorage.getItem('js_interview_sessions')
    const oldTopics = localStorage.getItem('js_topics')
    const oldApps = localStorage.getItem('js_applications')
    const oldStars = localStorage.getItem('js_star_stories')
    const oldNotes = localStorage.getItem('js_company_notes')

    const defaultProject = makeProject('My Job Search')
    defaultProject.data.interviewSessions = parseSavedJson(oldSessions, [])
    defaultProject.data.topics = parseSavedJson(oldTopics, [])
    defaultProject.data.applications = parseSavedJson(oldApps, [])
    defaultProject.data.starStories = parseSavedJson(oldStars, [])
    defaultProject.data.companyNotes = parseSavedJson(oldNotes, {})

    const initial = [defaultProject]
    setProjects(initial)
    setActiveProjectId(defaultProject.id)
    localStorage.setItem('js_projects', JSON.stringify(initial))
    localStorage.setItem('js_active_project', defaultProject.id)
  }

  function persist(updatedProjects) {
    const normalized = updatedProjects.map(normalizeProject)
    setProjects(normalized)
    localStorage.setItem('js_projects', JSON.stringify(normalized))
  }

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null
  const activeApplicationId = activeProject?.data?.activeApplicationId ?? null
  const activeApplication = (activeProject?.data?.applications || []).find(app => app.id === activeApplicationId) || null

  function switchProject(id) {
    setActiveProjectId(id)
    localStorage.setItem('js_active_project', id)
  }

  function createProject(name) {
    const p = makeProject(name)
    // Copy starter topics into new project
    const starterTopics = [
      { id: generateId(), title: 'B2B vs B2C Fraud: Key Differences', category: 'FRAML', difficulty: 'Intermediate', status: 'Not Started', messages: [], quizScores: [], repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: null },
      { id: generateId(), title: 'Merchant Risk Assessment & Onboarding', category: 'FRAML', difficulty: 'Intermediate', status: 'Not Started', messages: [], quizScores: [], repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: null },
    ]
    p.data.topics = starterTopics
    const updated = [...projects, p]
    persist(updated)
    switchProject(p.id)
    return p
  }

  function deleteProject(id) {
    const updated = projects.filter(p => p.id !== id)
    persist(updated)
    if (activeProjectId === id) {
      const next = updated[0]?.id || null
      setActiveProjectId(next)
      if (next) localStorage.setItem('js_active_project', next)
    }
  }

  function renameProject(id, name) {
    const updated = projects.map(p => p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)
    persist(updated)
  }

  function updateProjectData(key, value) {
    if (!activeProject) return
    const updated = projects.map(p => {
      if (p.id !== activeProjectId) return p
      return {
        ...p,
        updatedAt: new Date().toISOString(),
        data: { ...p.data, [key]: value }
      }
    })
    persist(updated)
  }

  function updateProjectDataMultiple(updates) {
    if (!activeProject) return
    const updated = projects.map(p => {
      if (p.id !== activeProjectId) return p
      return {
        ...p,
        updatedAt: new Date().toISOString(),
        data: { ...p.data, ...updates }
      }
    })
    persist(updated)
  }

  function getProjectData(key) {
    return activeProject?.data?.[key] ?? EMPTY_PROJECT_DATA[key]
  }

  function setActiveApplication(id) {
    updateProjectData('activeApplicationId', id || null)
  }

  function ingestCapturedApplication(capture) {
    if (!activeProject) return null

    const applications = activeProject.data.applications || []
    const normalizedUrl = normalizeApplicationUrl(capture?.url || capture?.jdUrl || '') || ''
    const jdText = (capture?.jdText || capture?.jd || '').trim()
    const company = (capture?.company || '').trim() || (capture?.pageTitle || 'Captured Application').trim()
    const role = (capture?.role || '').trim()
    const captureSource = (capture?.source || 'chrome-extension').trim()
    const capturedAt = capture?.capturedAt || new Date().toISOString()
    const preserveExistingFields = !!(capture?.jdOnly || capture?.preserveExistingFields)

    const existingApp = findExistingCapturedApplication(applications, { normalizedUrl, company, role })

    let targetApp
    let nextApplications

    if (existingApp) {
      targetApp = {
        ...existingApp,
        company: preserveExistingFields ? existingApp.company : (company || existingApp.company),
        role: preserveExistingFields ? existingApp.role : (role || existingApp.role),
        jdUrl: preserveExistingFields ? (existingApp.jdUrl || normalizedUrl) : (normalizedUrl || existingApp.jdUrl),
        jdText: jdText || existingApp.jdText || '',
        captureSource,
        capturedAt,
      }
      nextApplications = applications.map(app => app.id === existingApp.id ? targetApp : app)
    } else {
      targetApp = {
        ...makeTrackerApplication({
          company,
          role,
          stage: 'Researching',
          jdUrl: normalizedUrl,
          jdText,
        }),
        captureSource,
        capturedAt,
      }
      nextApplications = [...applications, targetApp]
    }

    const updates = {
      applications: nextApplications,
      activeApplicationId: targetApp.id,
      currentJD: targetApp.jdText || '',
    }

    const updated = projects.map(project => {
      if (project.id !== activeProjectId) return project
      return {
        ...project,
        updatedAt: new Date().toISOString(),
        data: {
          ...project.data,
          ...updates,
        },
      }
    })
    persist(updated)
    return targetApp
  }

  function ingestCapturedApplications(captures = []) {
    if (!activeProject || !Array.isArray(captures) || captures.length === 0) return []

    let nextApplications = [...(activeProject.data.applications || [])]
    const targets = []
    let latestJd = activeProject.data.currentJD || ''

    captures.forEach(capture => {
      const normalizedUrl = normalizeApplicationUrl(capture?.url || capture?.jdUrl || '') || ''
      const jdText = (capture?.jdText || capture?.jd || '').trim()
      const company = (capture?.company || '').trim() || (capture?.pageTitle || 'Captured Application').trim()
      const role = (capture?.role || '').trim()
      const captureSource = (capture?.source || 'chrome-extension').trim()
      const capturedAt = capture?.capturedAt || new Date().toISOString()
      const preserveExistingFields = !!(capture?.jdOnly || capture?.preserveExistingFields)

      if (!normalizedUrl && !jdText && !company && !role) return

      const existingApp = findExistingCapturedApplication(nextApplications, { normalizedUrl, company, role })

      let targetApp
      if (existingApp) {
        targetApp = {
          ...existingApp,
          company: preserveExistingFields ? existingApp.company : (company || existingApp.company),
          role: preserveExistingFields ? existingApp.role : (role || existingApp.role),
          jdUrl: preserveExistingFields ? (existingApp.jdUrl || normalizedUrl) : (normalizedUrl || existingApp.jdUrl),
          jdText: jdText || existingApp.jdText || '',
          captureSource,
          capturedAt,
        }
        nextApplications = nextApplications.map(app => app.id === existingApp.id ? targetApp : app)
      } else {
        targetApp = {
          ...makeTrackerApplication({
            company,
            role,
            stage: 'Researching',
            jdUrl: normalizedUrl,
            jdText,
          }),
          captureSource,
          capturedAt,
        }
        nextApplications.push(targetApp)
      }

      latestJd = targetApp.jdText || latestJd
      targets.push(targetApp)
    })

    if (targets.length === 0) return []

    const activeApplicationId = targets[targets.length - 1].id
    const updated = projects.map(project => {
      if (project.id !== activeProjectId) return project
      return {
        ...project,
        updatedAt: new Date().toISOString(),
        data: {
          ...project.data,
          applications: nextApplications,
          activeApplicationId,
          currentJD: latestJd,
        },
      }
    })
    persist(updated)
    return targets
  }

  // Export single project as JSON
  function exportProject(id) {
    const project = projects.find(p => p.id === id)
    if (!project) return
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobsensei-${project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export ALL projects
  function exportAll() {
    const blob = new Blob([JSON.stringify({ version: '1.1', projects }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobsensei-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import project(s) from JSON
  function importProjects(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result)
          let imported = []
          // Single project file
          if (parsed.id && parsed.data) {
            imported = [{ ...parsed, id: generateId(), name: parsed.name + ' (imported)' }]
          }
          // Full backup file
          else if (parsed.projects) {
            imported = parsed.projects.map(p => ({ ...p, id: generateId(), name: p.name + ' (imported)' }))
          }
          if (imported.length === 0) throw new Error('Invalid file format')
          const updated = [...projects, ...imported]
          persist(updated)
          switchProject(imported[0].id)
          resolve(imported.length)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsText(file)
    })
  }

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      activeProjectId,
      activeApplication,
      activeApplicationId,
      switchProject,
      createProject,
      deleteProject,
      renameProject,
      updateProjectData,
      updateProjectDataMultiple,
      getProjectData,
      setActiveApplication,
      ingestCapturedApplication,
      ingestCapturedApplications,
      exportProject,
      exportAll,
      importProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
