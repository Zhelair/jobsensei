import { expect, it } from 'vitest'
import { jobIdentity, shortlist, discoveryDraft, discoveryQuery, discoveryDate } from './jobDiscovery'

it('deduplicates LinkedIn country and tracking URLs without accepting lookalikes or search pages', () => {
  expect(jobIdentity('https://bg.linkedin.com/jobs/view/risk-analyst-123456?trackingId=x')).toBe('linkedin:123456')
  expect(jobIdentity('https://www.linkedin.com/jobs/view/123456')).toBe('linkedin:123456')
  expect(jobIdentity('https://linkedin.com.evil.test/jobs/view/123456')).toBeNull()
  expect(jobIdentity('https://linkedin.com/jobs/search/')).toBeNull()
  expect(jobIdentity('javascript:alert(1)')).toBeNull()
})
it('prefills reviewable company/role hints without mistaking snippets for a full JD', () => {
  const draft = discoveryDraft({ title: 'Risk and Fraud Specialist - INSTASOFT', url: 'https://linkedin.com/jobs/view/123', snippet: 'Hybrid in Sofia' })
  expect(draft.company).toBe('INSTASOFT')
  expect(draft.role).toBe('Risk and Fraud Specialist')
  expect(draft.jdText).toBe('')
  expect(draft.notes).toContain('not the full job description')
  expect(discoveryDraft({ title: 'Financial Crime Analyst', url: '', snippet: '' }).company).toBe('')
})
it('treats comma-separated roles as alternatives and does not invent posting dates', () => {
  expect(discoveryQuery('Fraud analyst, Compliance, AML,', 'Sofia', 'linkedin')).toContain('("Fraud analyst" OR "Compliance" OR "AML")')
  expect(discoveryDate({ sourceDate: '2026-10-01' })).toContain('LinkedIn posting date unconfirmed')
  expect(discoveryDate({ sourceDate: 'invalid' })).toBe('Posting date unavailable')
})
it('hides saved/applied and dismissed roles and ranks remaining excerpts by keyword overlap', () => {
  const jobs = [
    { id: 'linkedin:1', title: 'Risk analyst', snippet: '' },
    { id: 'linkedin:2', title: 'Risk analyst SQL', snippet: '' },
    { id: 'linkedin:3', title: 'Risk', snippet: '' },
    { id: 'linkedin:4', title: 'Risk SQL', snippet: '' },
  ]
  const applications = [{ stage: 'Applied', jdUrl: 'https://linkedin.com/jobs/view/1' }]
  expect(shortlist(jobs, applications, { 'linkedin:3': { dismissed: 'date' } }, 'Risk SQL').map(job => job.id)).toEqual(['linkedin:2', 'linkedin:4'])
  expect(shortlist(jobs, applications, { 'linkedin:2': { viewed: 'date' } }, 'Risk', true).some(job => job.id === 'linkedin:2')).toBe(false)
})
