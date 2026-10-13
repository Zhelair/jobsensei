import { expect, it } from 'vitest'
import { findVoiceForLanguage, LANGUAGE_OPTIONS } from './LanguageContext'
const bulgarian = LANGUAGE_OPTIONS.find(option => option.code === 'bg')
const russian = { name:'Google русский',lang:'ru-RU' }
const english = { name:'Google US English',lang:'en-US' }
const borislav = { name:'Microsoft Borislav',lang:'bg-BG' }
it('does not substitute Russian or English for Bulgarian even when previously selected', () => {
  expect(findVoiceForLanguage(bulgarian,[russian,english],russian.name)).toBeNull()
})
it('selects Bulgarian when it becomes available after browser voices load', () => {
  expect(findVoiceForLanguage(bulgarian,[russian,english,borislav],russian.name)).toBe(borislav)
})
