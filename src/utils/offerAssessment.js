export function offerScore(data, fields, weights) {
  const total = fields.reduce((sum, field) => sum + weights[field.key], 0)
  if (!total || fields.some(field => !Number.isInteger(data[field.key]) || data[field.key] < 1 || data[field.key] > 5)) return null
  return Math.round(fields.reduce((sum, field) => sum + data[field.key] * 20 * weights[field.key], 0) / total)
}

export function incompleteOffers(apps, data, fields, weights) {
  return apps.filter(app => !String(data[app.id]?.baseSalary || '').trim() || offerScore(data[app.id] || {}, fields, weights) === null)
}

export function offerAdviceInput(apps, data, fields, weights) {
  return apps.map(app => {
    const entry = data[app.id] || {}
    return JSON.stringify({
      company: app.company, role: app.role, score: offerScore(entry, fields, weights),
      salary: entry.baseSalary || null, bonus: entry.bonus || null,
      ratings: Object.fromEntries(fields.map(field => [field.key, entry[field.key] ?? null])),
      weights,
    })
  }).join('\n')
}
