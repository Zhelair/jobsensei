// SM-2 Spaced Repetition Algorithm
// Returns next review interval in days

export function sm2(quality, repetitions, easeFactor, interval) {
  // quality: 0-5 (0-2 = fail, 3-5 = pass)
  let newRep = repetitions
  let newEF = easeFactor
  let newInterval = interval

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1
    else if (repetitions === 1) newInterval = 6
    else newInterval = Math.round(interval * easeFactor)
    newRep = repetitions + 1
  } else {
    newRep = 0
    newInterval = 1
  }

  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (newEF < 1.3) newEF = 1.3

  return { repetitions: newRep, easeFactor: newEF, interval: newInterval }
}

export function getNextReviewDate(interval) {
  const d = new Date()
  d.setDate(d.getDate() + interval)
  return d.toISOString()
}

export function isDueToday(nextReview) {
  if (!nextReview) return true
  return new Date(nextReview) <= new Date()
}
