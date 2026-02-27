import React, { createContext, useContext, useState, useEffect } from 'react'
import { generateId } from '../utils/helpers'

const ProjectContext = createContext(null)

const EMPTY_PROJECT_DATA = {
  gapResults: [],           // saved gap analyses
  interviewSessions: [],    // interview history
  negotiationSessions: [],  // negotiation history
  toolsHistory: [],         // tools usage history
  quizHistory: [],          // full quiz result snapshots
  starStories: [],          // STAR bank
  applications: [],         // job tracker
  companyNotes: {},         // company notes
  topics: [],               // learning topics
  resume: '',               // resume text
  notes: '',                // free notes
  currentJD: '',            // persistent JD field across gap/interview
  interviewMode: 'hr',      // last interview mode used
  negotiationOffer: '',     // last negotiation offer text
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

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)

  // Load on mount
  useEffect(() => {
    const saved = localStorage.getItem('js_projects')
    const activeId = localStorage.getItem('js_active_project')

    if (saved) {
      const parsed = JSON.parse(saved)
      setProjects(parsed)
      // Migrate old data into default project if no projects exist yet
      if (parsed.length === 0) {
        initDefaultProject()
      } else {
        setActiveProjectId(activeId || parsed[0].id)
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
    defaultProject.data.interviewSessions = oldSessions ? JSON.parse(oldSessions) : []
    defaultProject.data.topics = oldTopics ? JSON.parse(oldTopics) : []
    defaultProject.data.applications = oldApps ? JSON.parse(oldApps) : []
    defaultProject.data.starStories = oldStars ? JSON.parse(oldStars) : []
    defaultProject.data.companyNotes = oldNotes ? JSON.parse(oldNotes) : {}

    const initial = [defaultProject]
    setProjects(initial)
    setActiveProjectId(defaultProject.id)
    localStorage.setItem('js_projects', JSON.stringify(initial))
    localStorage.setItem('js_active_project', defaultProject.id)
  }

  function persist(updatedProjects) {
    setProjects(updatedProjects)
    localStorage.setItem('js_projects', JSON.stringify(updatedProjects))
  }

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null

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

  function getProjectData(key) {
    return activeProject?.data?.[key] ?? EMPTY_PROJECT_DATA[key]
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
      switchProject,
      createProject,
      deleteProject,
      renameProject,
      updateProjectData,
      getProjectData,
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
