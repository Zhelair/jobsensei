import React from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
vi.mock('../../context/AIContext', () => ({ useAI: () => ({ callAI: vi.fn(), isConnected: true }) }))
vi.mock('../../context/ProjectContext', () => ({ useProject: () => ({ getProjectData: () => [] }) }))
vi.mock('../../context/AppContext', () => ({ useApp: () => ({}), SECTIONS: {} }))
vi.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: key => key }) }))
import { ApplicationWorkspaceView } from './JobTracker'
import { countCompanyNotes, normalizeCompanyNotes } from '../../lib/companyNotes'

it('renders completed AI research metadata without crashing the Research view', () => {
  const notes = { wowFacts: 'Company background', techStack: ['SQL', 'Power BI'], _research: { fallback: true, reason: 'ai_only', sources: [], checkedAt: '2026-10-02' } }
  expect(() => renderToString(<ApplicationWorkspaceView app={{ id: 'fixture', company: 'Example', role: 'Analyst', jdText: 'Description' }} initialTab="research" notes={notes} />)).not.toThrow()
  expect(countCompanyNotes(notes)).toBe(2)
  expect(normalizeCompanyNotes(notes).techStack).toBe('SQL\nPower BI')
})
it('counts only note text, including older saved research metadata', () => {
  expect(countCompanyNotes({ _research: { sources: [] }, _liveData: true, wowFacts: '', prepNotes: 'Saved prep' })).toBe(1)
})
