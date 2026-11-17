export function quizAverage(questions, feedback) {
  const scores = Object.entries(feedback).map(([id, item]) => {
    const question = questions.find(entry => String(entry.id) === String(id))
    if (question?.type !== 'open_ended') return item.correct ? 10 : 0
    return typeof item.score === 'number' && Number.isFinite(item.score)
      ? Math.max(0, Math.min(10, item.score)) : 5
  })
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 5
}
