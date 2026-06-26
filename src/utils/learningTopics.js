export function normalizeLearningTopicText(value = '') {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/^[-*•]\s*/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalizeFirst(value = '') {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function deriveLearningTopicTitle(value = '') {
  const source = normalizeLearningTopicText(value)
  if (!source) return ''

  let title = source
    .replace(/\s+[—–-]\s+.*$/, '')
    .replace(/[:;]\s+.*$/, '')
    .replace(/\.\s+.*$/, '')
    .replace(/^the job asks for\s+/i, '')
    .replace(/^specific knowledge of\s+/i, '')
    .replace(/^knowledge of\s+/i, '')
    .replace(/^understanding of\s+/i, '')
    .replace(/^familiarity with\s+/i, '')
    .replace(/^hands-on knowledge of\s+/i, '')
    .replace(/^hands-on experience with\s+/i, '')
    .replace(/^experience with\s+/i, '')
    .replace(/^direct experience with\s+/i, '')
    .replace(/^no direct experience with\s+/i, '')
    .replace(/^lack of experience with\s+/i, '')
    .replace(/^review\s+/i, '')
    .replace(/^learn\s+/i, '')
    .trim()

  if (title.length > 72) {
    const words = title.split(' ')
    title = words.slice(0, 8).join(' ')
    if (words.length > 8) title += '...'
  }

  return capitalizeFirst(title.replace(/[.:;,\s-]+$/, '').trim())
}

export function getLearningTopicSubject(topic = {}) {
  return normalizeLearningTopicText(topic.subject || topic.topic || topic.title || '')
}

export function getLearningTopicTitle(topic = {}) {
  const subject = getLearningTopicSubject(topic)
  return normalizeLearningTopicText(topic.title || deriveLearningTopicTitle(subject) || subject)
}

export function getLearningTopicPreview(topic = {}) {
  const title = getLearningTopicTitle(topic)
  const subject = getLearningTopicSubject(topic)

  if (!subject) return ''
  if (title.toLowerCase() === subject.toLowerCase()) return ''
  return subject
}

export function createLearningTopic(fields = {}) {
  const subject = getLearningTopicSubject(fields)
  const title = normalizeLearningTopicText(fields.title || '') || deriveLearningTopicTitle(subject) || subject

  return {
    ...fields,
    title,
    subject,
  }
}
