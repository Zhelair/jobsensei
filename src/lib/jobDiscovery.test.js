import { expect, it } from 'vitest'
import { jobIdentity, shortlist } from './jobDiscovery'

it('deduplicates LinkedIn country and tracking URLs without accepting lookalikes or search pages', () => {
  expect(jobIdentity('https://bg.linkedin.com/jobs/view/risk-analyst-123456?trackingId=x')).toBe('linkedin:123456')
  expect(jobIdentity('https://www.linkedin.com/jobs/view/123456')).toBe('linkedin:123456')
  expect(jobIdentity('https://linkedin.com.evil.test/jobs/view/123456')).toBeNull()
  expect(jobIdentity('https://linkedin.com/jobs/search/')).toBeNull()
  expect(jobIdentity('javascript:alert(1)')).toBeNull()
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
