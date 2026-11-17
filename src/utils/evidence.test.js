import { expect, it } from 'vitest'
import { reconcileKeywords, verifyRequirementCoverage, groundResumeRewrites } from './evidence'
import { quizAverage } from './quizScoring'
import { offerScore, offerAdviceInput, incompleteOffers } from './offerAssessment'

it('keeps zero open-answer grades in a mixed quiz', () => {
  const questions = [{ id: 1, type: 'multiple_choice' }, { id: 2, type: 'open_ended' }]
  expect(quizAverage(questions, { 1: { correct: true }, 2: { score: 0 } })).toBe(5)
  expect(quizAverage(questions, { 1: { correct: true }, 2: { score: null } })).toBe(8)
})

it('reconciles contradictions against the CV and excludes invented JD terms', () => {
  const result = reconcileKeywords({ keywordMatches: ['SQL', 'Sion'], missingKeywords: ['SQL', 'Power BI', 'alerts', 'IML'] },
    'SQL, PowerBI dashboards and onboarding alerts.', 'SQL and Power BI; Sion preferred; alerts required.')
  expect(result.keywordMatches).toEqual(['SQL', 'Power BI', 'alerts'])
  expect(result.missingKeywords).toEqual(['Sion'])
})

it('does not equate NoSQL with SQL or label invented evidence as supported', () => {
  expect(reconcileKeywords({ missingKeywords: ['SQL'] }, 'NoSQL', 'SQL required').missingKeywords).toEqual(['SQL'])
  const result = verifyRequirementCoverage([{ requirement: 'SQL', evidence: 'Advanced SQL', priority: 'required' }], 'SQL (basic)', 'SQL required')
  expect(result[0]).toMatchObject({ evidence: '', status: 'needs_confirmation' })
})

it('does not make a default score from missing ratings and normalizes user weights', () => {
  const fields = [{ key: 'salary' }, { key: 'growth' }], weights = { salary: 30, growth: 30 }
  expect(offerScore({}, fields, weights)).toBeNull()
  expect(incompleteOffers([{ id: 'a' }], {}, fields, weights)).toHaveLength(1)
  expect(offerScore({ salary: 3, growth: 5 }, fields, weights)).toBe(80)
  expect(JSON.parse(offerAdviceInput([{ id: 'a', company: 'Example' }], {}, fields, weights))).toMatchObject({ score: null, salary: null, ratings: { salary: null, growth: null } })
})

it('withholds invented numerical achievements and rejects fabricated source quotes', () => {
  const checked = groundResumeRewrites({ redFlags: [
    { original: 'Reviewed alerts', fix: 'Reviewed 200 alerts with 98% accuracy' },
    { original: 'Mentored analysts', fix: 'Led the team' },
  ] }, 'Reviewed alerts using SQL.')
  expect(checked.redFlags).toEqual([{ original: 'Reviewed alerts', fix: '', requiresConfirmation: true }])
})
