import React, { useMemo, useState } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { sm2, getNextReviewDate, isDueToday } from '../../utils/spacedRepetition'
import ChatWindow from '../shared/ChatWindow'
import { BookOpen, Plus, Brain, Check, ArrowLeft, Edit3, Trash2, X, ChevronRight, History, FileText, Copy, Download, Printer, Save, StickyNote, Sparkles, Image } from 'lucide-react'
import VoiceChatBar from '../shared/VoiceChatBar'

const STARTER_TOPIC_BLUEPRINTS = [
  { key: 'b2bB2cFraud', category: 'FRAML', difficulty: 'Intermediate' },
  { key: 'merchantRisk', category: 'FRAML', difficulty: 'Intermediate' },
  { key: 'cardSchemeDisputes', category: 'Payments', difficulty: 'Intermediate' },
  { key: 'correspondentBanking', category: 'AML', difficulty: 'Advanced' },
  { key: 'tbml', category: 'AML', difficulty: 'Advanced' },
  { key: 'amlB2bPayments', category: 'AML', difficulty: 'Intermediate' },
  { key: 'fatfOverview', category: 'Regulatory', difficulty: 'Beginner' },
  { key: 'amldPsdEssentials', category: 'Regulatory', difficulty: 'Intermediate' },
  { key: 'positioningB2c', category: 'Career', difficulty: 'Beginner' },
]

const DIFF_COLORS = { Beginner: 'badge-green', Intermediate: 'badge-yellow', Advanced: 'badge-red' }
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const CATEGORIES = ['FRAML', 'AML', 'Payments', 'Regulatory', 'Career', 'Technical', 'Marketing', 'Sales', 'Finance', 'Engineering', 'Product', 'Design', 'Data', 'Legal', 'HR', 'Operations', 'Custom']
const STATUS_VALUES = ['All', 'In Progress', 'Not Started', 'Completed']

const DIFFICULTY_KEYS = {
  Beginner: 'learning.difficulty.beginner',
  Intermediate: 'learning.difficulty.intermediate',
  Advanced: 'learning.difficulty.advanced',
}

const STATUS_KEYS = {
  All: 'learning.filters.all',
  'In Progress': 'learning.status.inProgress',
  'Not Started': 'learning.status.notStarted',
  Completed: 'learning.status.completed',
}

const CATEGORY_KEYS = {
  FRAML: 'learning.category.framl',
  AML: 'learning.category.aml',
  Payments: 'learning.category.payments',
  Regulatory: 'learning.category.regulatory',
  Career: 'learning.category.career',
  Technical: 'learning.category.technical',
  Marketing: 'learning.category.marketing',
  Sales: 'learning.category.sales',
  Finance: 'learning.category.finance',
  Engineering: 'learning.category.engineering',
  Product: 'learning.category.product',
  Design: 'learning.category.design',
  Data: 'learning.category.data',
  Legal: 'learning.category.legal',
  HR: 'learning.category.hr',
  Operations: 'learning.category.operations',
  Custom: 'learning.category.custom',
}

const DEPTH_VALUES = ['new', 'basics', 'advanced']

function difficultyLabel(t, value) {
  return t(DIFFICULTY_KEYS[value] || 'learning.difficulty.unknown', { value })
}

function statusLabel(t, value) {
  return t(STATUS_KEYS[value] || 'learning.status.unknown', { value })
}

function categoryLabel(t, value) {
  return t(CATEGORY_KEYS[value] || 'learning.category.unknown', { value })
}

function starterTopicsForLanguage(t) {
  return STARTER_TOPIC_BLUEPRINTS.map(topic => ({
    title: t(`learning.starter.${topic.key}`),
    category: topic.category,
    difficulty: topic.difficulty,
  }))
}

export default function LearningSection() {
  const { drillMode, profile, pendingLearningRequest, clearPendingLearningRequest, pushAppHistory } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData } = useProject()
  const { language, t } = useLanguage()

  const starterTopics = useMemo(() => starterTopicsForLanguage(t), [t])
  const topics = getProjectData('topics')
  const quizHistory = getProjectData('quizHistory') || []
  const topicNotes = getProjectData('topicNotes') || []
  const historyState = window.history.state?.jobsensei || {}
  const historyTopic = historyState.topicId ? topics.find(topic => topic.id === historyState.topicId) || null : null

  const [view, setView] = useState(historyState.section === SECTIONS.LEARNING ? historyState.learningView || 'library' : 'library')
  const [selectedTopic, setSelectedTopic] = useState(historyTopic)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [newTopic, setNewTopic] = useState({ title: '', category: 'Custom', difficulty: 'Intermediate' })
  const [customCategory, setCustomCategory] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  React.useEffect(() => {
    if (!pendingLearningRequest) return
    const targetTopic = topics.find(topic => topic.id === pendingLearningRequest.topicId)
    if (!targetTopic) return
    setSelectedTopic(targetTopic)
    setView(pendingLearningRequest.view || 'tutor')
    clearPendingLearningRequest()
  }, [pendingLearningRequest, topics, clearPendingLearningRequest])

  React.useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state?.jobsensei
      if (state?.section !== SECTIONS.LEARNING) return
      const nextTopic = state.topicId ? topics.find(topic => topic.id === state.topicId) || null : null
      setSelectedTopic(nextTopic)
      setView(nextTopic ? state.learningView || 'tutor' : state.learningView || 'library')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [topics])

  function navigateLearningView(nextView, topic = null) {
    setSelectedTopic(topic)
    setView(nextView)
    pushAppHistory(
      SECTIONS.LEARNING,
      topic ? { learningView: nextView, topicId: topic.id } : (nextView === 'library' ? {} : { learningView: nextView }),
    )
  }

  function setTopics(updater) {
    const next = typeof updater === 'function' ? updater(topics) : updater
    updateProjectData('topics', next)
  }

  function addTopic() {
    if (!newTopic.title.trim()) return
    const resolvedCategory = newTopic.category === 'Custom' && customCategory.trim()
      ? customCategory.trim()
      : newTopic.category
    const topic = {
      id: generateId(),
      ...newTopic,
      category: resolvedCategory,
      status: 'Not Started',
      messages: [],
      quizScores: [],
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReview: null,
    }
    setTopics(prev => [...prev, topic])
    setNewTopic({ title: '', category: 'Custom', difficulty: 'Intermediate' })
    setCustomCategory('')
    setShowAdd(false)
  }

  function updateTopic(id, updates) {
    setTopics(prev => prev.map(topic => (topic.id === id ? { ...topic, ...updates } : topic)))
    if (selectedTopic?.id === id) setSelectedTopic(topic => ({ ...topic, ...updates }))
  }

  function saveQuizHistory(data) {
    const entry = { id: generateId(), date: new Date().toISOString(), ...data }
    updateProjectData('quizHistory', [entry, ...quizHistory].slice(0, 100))
  }

  function deleteTopic(id) {
    if (!confirm(t('learning.confirm.deleteTopic'))) return
    setTopics(prev => prev.filter(topic => topic.id !== id))
    if (selectedTopic?.id === id) navigateLearningView('library')
  }

  function saveEdit() {
    if (!editingTopic || !editingTopic.title.trim()) return
    updateTopic(editingTopic.id, {
      title: editingTopic.title,
      category: editingTopic.category,
      difficulty: editingTopic.difficulty,
    })
    setEditingTopic(null)
  }

  function addStarterTopics() {
    const existing = topics.map(topic => topic.title)
    const topicsToAdd = starterTopics.filter(topic => !existing.includes(topic.title))
    const newTopics = topicsToAdd.map(topic => ({
      ...topic,
      id: generateId(),
      status: 'Not Started',
      messages: [],
      quizScores: [],
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReview: null,
    }))
    setTopics(prev => [...prev, ...newTopics])
  }

  function saveNote(topicId, topicTitle, content) {
    const note = {
      id: generateId(),
      topicId,
      topicTitle,
      content,
      createdAt: new Date().toISOString(),
    }
    updateProjectData('topicNotes', [note, ...topicNotes].slice(0, 300))
  }

  const dueTopics = topics.filter(topic => isDueToday(topic.nextReview) && topic.status === 'In Progress')
  const categoryOptions = ['All', ...Array.from(new Set(topics.map(topic => topic.category))).sort()]
  const filteredTopics = topics.filter(topic =>
    (filterCategory === 'All' || topic.category === filterCategory)
    && (filterStatus === 'All' || topic.status === filterStatus),
  )

  if (view === 'tutor' && selectedTopic) {
    return (
      <TopicTutor
        topic={selectedTopic}
        onBack={() => navigateLearningView('library')}
        onUpdate={updateTopic}
        drillMode={drillMode}
        language={language}
        profile={profile}
        callAI={callAI}
        isConnected={isConnected}
        onSaveNote={(content) => saveNote(selectedTopic.id, selectedTopic.title, content)}
      />
    )
  }

  if (view === 'quiz' && selectedTopic) {
    return (
      <QuizMode
        topic={selectedTopic}
        onBack={() => navigateLearningView('library')}
        onUpdate={updateTopic}
        onQuizComplete={saveQuizHistory}
        callAI={callAI}
        isConnected={isConnected}
        language={language}
      />
    )
  }

  if (view === 'quizHistory') {
    return (
      <QuizHistory
        history={quizHistory}
        onBack={() => navigateLearningView('library')}
        onDeleteQuiz={(id) => updateProjectData('quizHistory', quizHistory.filter(quiz => quiz.id !== id))}
      />
    )
  }

  if (view === 'notes') {
    return (
      <NotesView
        topics={topics}
        topicNotes={topicNotes}
        onBack={() => navigateLearningView('library')}
        onSaveNote={saveNote}
        onDeleteNote={(id) => updateProjectData('topicNotes', topicNotes.filter(note => note.id !== id))}
        callAI={callAI}
        isConnected={isConnected}
        language={language}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">{t('learning.title')}</h2>
          <p className="section-sub">{t('learning.subtitle', { topics: topics.length, reviews: dueTopics.length })}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {quizHistory.length > 0 && (
            <button onClick={() => navigateLearningView('quizHistory')} className="btn-secondary text-xs">
              <History size={14} /> {t('learning.quizHistoryButton', { count: quizHistory.length })}
            </button>
          )}
          <button onClick={() => navigateLearningView('notes')} className="btn-secondary text-xs">
            <StickyNote size={14} /> {t('learning.notesButton', { count: topicNotes.length })}
          </button>
          <button data-guide="learning-add-topic" onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs">
            <Plus size={14} /> {t('learning.addTopic')}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">{t('learning.newTopic')}</h3>
          <div className="space-y-2 mb-3">
            <input
              className="input-field"
              placeholder={t('learning.topicTitlePlaceholder')}
              value={newTopic.title}
              onChange={event => setNewTopic(prev => ({ ...prev, title: event.target.value }))}
              onKeyDown={event => event.key === 'Enter' && addTopic()}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <select className="input-field" value={newTopic.category} onChange={event => setNewTopic(prev => ({ ...prev, category: event.target.value }))}>
                {CATEGORIES.map(category => <option key={category} value={category}>{categoryLabel(t, category)}</option>)}
              </select>
              <select className="input-field" value={newTopic.difficulty} onChange={event => setNewTopic(prev => ({ ...prev, difficulty: event.target.value }))}>
                {DIFFICULTIES.map(difficulty => <option key={difficulty} value={difficulty}>{difficultyLabel(t, difficulty)}</option>)}
              </select>
            </div>
            {newTopic.category === 'Custom' && (
              <input
                className="input-field"
                placeholder={t('learning.customCategoryPlaceholder')}
                value={customCategory}
                onChange={event => setCustomCategory(event.target.value)}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={addTopic} disabled={!newTopic.title.trim()} className="btn-primary">{t('learning.addTopic')}</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {editingTopic && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-navy-600 rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white">{t('learning.editTopic')}</h3>
              <button onClick={() => setEditingTopic(null)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <input className="input-field" value={editingTopic.title} onChange={event => setEditingTopic(topic => ({ ...topic, title: event.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input-field" value={editingTopic.category} onChange={event => setEditingTopic(topic => ({ ...topic, category: event.target.value }))}>
                  {CATEGORIES.map(category => <option key={category} value={category}>{categoryLabel(t, category)}</option>)}
                </select>
                <select className="input-field" value={editingTopic.difficulty} onChange={event => setEditingTopic(topic => ({ ...topic, difficulty: event.target.value }))}>
                  {DIFFICULTIES.map(difficulty => <option key={difficulty} value={difficulty}>{difficultyLabel(t, difficulty)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-primary flex-1 justify-center"><Check size={14} /> {t('common.save')}</button>
              <button onClick={() => setEditingTopic(null)} className="btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {dueTopics.length > 0 && (
        <div className="card mb-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="text-yellow-400 text-sm font-display font-semibold mb-3">
            {t('learning.reviewsDueToday', { count: dueTopics.length })}
          </div>
          <div className="space-y-2">
            {dueTopics.map(topic => (
              <div key={topic.id} className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-3 py-2 gap-2">
                <span className="text-yellow-200 text-sm font-body truncate flex-1">{topic.title}</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => navigateLearningView('tutor', topic)} className="btn-secondary text-xs py-1 px-2">
                    <BookOpen size={12} /> {t('learning.study')}
                  </button>
                  <button onClick={() => navigateLearningView('quiz', topic)} className="btn-primary text-xs py-1 px-2">
                    <Brain size={12} /> {t('learning.quiz')}
                  </button>
                  <button
                    onClick={() => updateTopic(topic.id, { nextReview: getNextReviewDate(1) })}
                    className="text-yellow-600 hover:text-yellow-400 transition-colors p-1"
                    title={t('learning.snoozeTomorrow')}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topics.length === 0 && (
        <div className="card mb-4 text-center py-8">
          <BookOpen size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">{t('learning.noTopics')}</p>
          <button onClick={addStarterTopics} className="btn-primary mx-auto">{t('learning.loadStarterTopics')}</button>
        </div>
      )}

      {topics.some(topic => topic.quizScores?.length > 0) && (
        <div className="card mb-4">
          <div className="text-white text-sm font-display font-semibold mb-4 flex items-center gap-2">
            <Brain size={14} className="text-teal-400" /> {t('learning.quizResults')}
          </div>
          <div className="space-y-3">
            {topics.filter(topic => topic.quizScores?.length > 0).map(topic => {
              const scores = topic.quizScores
              const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
              const best = Math.max(...scores)
              return (
                <div key={topic.id} className="flex items-center gap-4 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-300 text-sm truncate mb-1.5">{topic.title}</div>
                    <div className="flex gap-1 mt-1">
                      {scores.slice(-10).map((score, index) => (
                        <div
                          key={index}
                          className={`w-2.5 h-6 rounded-sm ${score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ opacity: 0.5 + (index / scores.length) * 0.5 }}
                          title={`${score}/10`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-display font-bold ${avg >= 8 ? 'text-green-400' : avg >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{avg}/10 {t('learning.averageShort')}</div>
                    <div className="text-slate-500 text-xs">{t('learning.bestScore', { score: best, count: scores.length })}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex gap-1 flex-wrap">
            {STATUS_VALUES.map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-body ${filterStatus === status ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-navy-800 border-navy-600 text-slate-400 hover:text-slate-200'}`}
              >
                {statusLabel(t, status)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {categoryOptions.map(category => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-body ${filterCategory === category ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-navy-800 border-navy-600 text-slate-400 hover:text-slate-200'}`}
              >
                {category === 'All' ? t('learning.filters.all') : categoryLabel(t, category)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTopics.map(topic => {
          const due = isDueToday(topic.nextReview) && topic.status === 'In Progress'
          const noteCount = topicNotes.filter(note => note.topicId === topic.id).length
          return (
            <div key={topic.id} data-guide="learning-topic-card" className="card flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-white text-sm font-body font-medium leading-snug flex-1">{topic.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {due && <span className="badge-yellow">{t('learning.due')}</span>}
                  <button onClick={() => setEditingTopic({ ...topic })} className="text-slate-500 hover:text-teal-400 p-0.5"><Edit3 size={13} /></button>
                  <button onClick={() => deleteTopic(topic.id)} className="text-slate-500 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                </div>
                {!due && (
                  <div className="opacity-100 group-hover:opacity-0 transition-opacity flex-shrink-0">
                    {topic.status === 'Completed' && <Check size={12} className="text-green-400" />}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-slate">{categoryLabel(t, topic.category)}</span>
                <span className={DIFF_COLORS[topic.difficulty] || 'badge-slate'}>{difficultyLabel(t, topic.difficulty)}</span>
                <span className={`badge ${topic.status === 'Completed' ? 'badge-green' : topic.status === 'In Progress' ? 'badge-teal' : 'badge-slate'}`}>{statusLabel(t, topic.status)}</span>
                {topic.quizScores?.length > 0 && (() => {
                  const last = topic.quizScores[topic.quizScores.length - 1]
                  return <span className={`badge ${last >= 8 ? 'badge-green' : last >= 6 ? 'badge-yellow' : 'badge-red'}`}>{t('learning.quizBadge', { score: Number.isInteger(last) ? last : last.toFixed(1) })}</span>
                })()}
                {noteCount > 0 && <span className="badge-slate">{t('learning.notesBadge', { count: noteCount })}</span>}
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => navigateLearningView('tutor', topic)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  <BookOpen size={13} /> {t('learning.study')}
                </button>
                <button onClick={() => navigateLearningView('quiz', topic)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  <Brain size={13} /> {t('learning.quiz')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopicTutor({ topic, onBack, onUpdate, drillMode, profile, callAI, isConnected, onSaveNote, language }) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState(topic.messages || [])
  const [loading, setLoading] = useState(false)
  const [depth, setDepth] = useState('basics')
  const [noteSaved, setNoteSaved] = useState(false)

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    try {
      let full = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.topicTutor(topic.title, depth, profile?.currentRole, drillMode, language),
        messages: newMessages,
        temperature: 0.7,
        onChunk: (_, acc) => {
          full = acc
          setMessages([...newMessages, { role: 'assistant', content: acc }])
        },
      })
      const finalMessages = [...newMessages, { role: 'assistant', content: full }]
      setMessages(finalMessages)
      onUpdate(topic.id, { messages: finalMessages, status: 'In Progress' })
    } catch {}
    setLoading(false)
  }

  const lastAiMsg = messages.filter(message => message.role === 'assistant' && message.content).at(-1)?.content || ''

  function handleSaveNote() {
    if (!lastAiMsg) return
    onSaveNote(lastAiMsg)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  return (
    <div className="flex flex-col h-full animate-in">
      <div className="px-4 py-3 border-b border-navy-700 bg-navy-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /></button>
          <div>
            <div className="text-white text-sm font-body font-medium">{topic.title}</div>
            <div className="flex gap-1.5 mt-0.5">
              {DEPTH_VALUES.map(value => (
                <button
                  key={value}
                  onClick={() => setDepth(value)}
                  className={`text-xs px-2 py-0.5 rounded transition-all ${depth === value ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t(`learning.tutor.depth.${value}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => onUpdate(topic.id, { status: 'Completed' })} className="btn-ghost text-xs">
          <Check size={14} /> {t('learning.tutor.done')}
        </button>
      </div>
      <ChatWindow messages={messages} isLoading={loading} emptyText={t('learning.tutor.emptyText')} />
      <div className="p-4 border-t border-navy-700 bg-navy-900 space-y-2">
        <VoiceChatBar
          onSend={sendMessage}
          isLoading={loading}
          lastAiMessage={lastAiMsg}
          placeholder={t('learning.tutor.placeholder', { title: topic.title })}
        />
        {lastAiMsg && (
          <button onClick={handleSaveNote} className={`save-note-cta ${noteSaved ? 'is-saved' : ''}`}>
            {noteSaved ? <><Check size={12} /> {t('learning.tutor.savedToNotes')}</> : <><Save size={12} /> {t('guide.learning.saveLastResponseLabel')}</>}
          </button>
        )}
      </div>
    </div>
  )
}

function QuizMode({ topic, onBack, onUpdate, onQuizComplete, callAI, isConnected, language }) {
  const { t } = useLanguage()
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(false)
  const [openAnswer, setOpenAnswer] = useState('')

  React.useEffect(() => { if (isConnected) loadQuiz() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQuiz() {
    setLoading(true)
    try {
      const raw = await callAI({
        systemPrompt: prompts.quizGenerator(topic.title, topic.difficulty, language),
        messages: [{ role: 'user', content: 'Generate.' }],
        temperature: 0.6,
      })
      const parsed = tryParseJSON(raw)
      if (parsed?.questions) {
        setQuestions(parsed.questions)
        setPhase('quiz')
      }
    } catch {}
    setLoading(false)
  }

  async function submitAnswer(question, answer) {
    setAnswers(prev => ({ ...prev, [question.id]: answer }))
    if (question.type === 'open_ended') {
      setLoading(true)
      try {
        const raw = await callAI({
          systemPrompt: prompts.quizEvaluator(question.question, question.sampleAnswer, answer, language),
          messages: [{ role: 'user', content: 'Evaluate.' }],
          temperature: 0.3,
        })
        const parsed = tryParseJSON(raw)
        if (parsed) setFeedback(prev => ({ ...prev, [question.id]: parsed }))
      } catch {}
      setLoading(false)
    } else {
      setFeedback(prev => ({ ...prev, [question.id]: { correct: answer === question.correct, explanation: question.explanation } }))
    }
  }

  function finishQuiz() {
    const scores = Object.entries(feedback).map(([id, item]) => {
      const question = questions.find(entry => String(entry.id) === String(id))
      return question?.type === 'open_ended' ? (item.score || 5) : (item.correct ? 10 : 0)
    })
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 5
    const quality = avg >= 8 ? 5 : avg >= 6 ? 3 : 1
    const { repetitions, easeFactor, interval } = sm2(quality, topic.repetitions || 0, topic.easeFactor || 2.5, topic.interval || 0)
    onUpdate(topic.id, {
      repetitions,
      easeFactor,
      interval,
      nextReview: getNextReviewDate(interval),
      status: 'In Progress',
      quizScores: [...(topic.quizScores || []), avg],
    })
    const correct = Object.values(feedback).filter(item => item.correct !== false && (item.score === undefined || item.score >= 6)).length
    onQuizComplete?.({
      topicId: topic.id,
      topicTitle: topic.title,
      score: avg,
      correct,
      total: Object.values(feedback).length,
      questions,
      feedback,
    })
    setPhase('results')
  }

  if (phase === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <Brain size={32} className="mx-auto mb-3 animate-pulse text-teal-400" />
          <p>{t('learning.quizGenerating')}</p>
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    const correct = Object.values(feedback).filter(item => item.correct !== false && (item.score === undefined || item.score >= 6)).length
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
        <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> {t('tour.back')}</button>
        <div className="card text-center py-8 mb-4">
          <Brain size={32} className="mx-auto mb-2 text-teal-400" />
          <div className="font-display font-bold text-white text-2xl mb-1">{t('learning.quizCorrect', { correct, total: Object.values(feedback).length })}</div>
          <div className="text-slate-400 text-sm">{t('learning.nextReviewScheduled')}</div>
        </div>
        <div className="space-y-3">
          {questions.map(question => {
            const item = feedback[question.id]
            const passed = item?.correct !== false && (item?.score === undefined || item?.score >= 6)
            return (
              <div key={question.id} className={`card border ${passed ? 'border-green-500/20' : 'border-red-500/20'}`}>
                <p className="text-white text-sm mb-2">{question.question}</p>
                {(item?.explanation || item?.feedback) && (
                  <p className={`text-xs ${passed ? 'text-green-300' : 'text-red-300'}`}>{item.explanation || item.feedback}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const question = questions[current]
  const answered = answers[question?.id] !== undefined
  const item = feedback[question?.id]

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /></button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{t('learning.questionCounter', { current: current + 1, total: questions.length })}</span>
            <span>{topic.title}</span>
          </div>
          <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>
      {question && (
        <div className="card animate-in">
          <p className="text-white font-body font-medium mb-4">{question.question}</p>
          {question.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === index
                const isCorrect = item && index === question.correct
                const isWrong = item && selected && index !== question.correct
                return (
                  <button
                    key={index}
                    onClick={() => !answered && submitAnswer(question, index)}
                    disabled={answered}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-300' : isWrong ? 'bg-red-500/15 border-red-500/40 text-red-300' : selected ? 'bg-teal-500/15 border-teal-500/40 text-white' : 'bg-navy-900 border-navy-700 text-slate-300 hover:border-slate-500'}`}
                  >
                    <span className="font-mono mr-2 text-slate-500">{String.fromCharCode(65 + index)}.</span>{option}
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <textarea
                className="textarea-field h-24 mb-3"
                placeholder={t('learning.typeYourAnswer')}
                value={openAnswer}
                onChange={event => setOpenAnswer(event.target.value)}
                disabled={answered}
              />
              {!answered && <button onClick={() => submitAnswer(question, openAnswer)} disabled={!openAnswer.trim() || loading} className="btn-primary">{t('learning.submit')}</button>}
            </div>
          )}
          {item && <div className={`mt-3 p-3 rounded-xl text-sm ${item.correct === false || (item.score !== undefined && item.score < 6) ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'}`}>{item.explanation || item.feedback}</div>}
          {answered && (
            <div className="mt-4 flex justify-end">
              {current < questions.length - 1
                ? <button onClick={() => { setCurrent(count => count + 1); setOpenAnswer('') }} className="btn-primary">{t('tour.next')} <ChevronRight size={16} /></button>
                : <button onClick={finishQuiz} className="btn-primary"><Check size={16} /> {t('tour.finish')}</button>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotesView({ topics, topicNotes, onBack, onSaveNote, onDeleteNote, callAI, isConnected, language }) {
  const { t } = useLanguage()
  const [selectedTopicId, setSelectedTopicId] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTopicId, setNewTopicId] = useState(topics[0]?.id || '')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode, setAiMode] = useState(null)

  const filteredNotes = selectedTopicId === 'all'
    ? topicNotes
    : topicNotes.filter(note => note.topicId === selectedTopicId)

  const currentTopic = topics.find(topic => topic.id === selectedTopicId)
  const notesForAI = filteredNotes.map(note => note.content).join('\n\n---\n\n')

  function addNote() {
    if (!newContent.trim() || !newTopicId) return
    const topic = topics.find(entry => entry.id === newTopicId)
    onSaveNote(newTopicId, topic?.title || t('learning.unknownTopic'), newContent.trim())
    setNewContent('')
    setShowAdd(false)
  }

  async function runAI(mode) {
    if (!notesForAI.trim()) return
    setAiLoading(true)
    setAiResult('')
    setAiMode(mode)
    const topicTitle = currentTopic?.title || t('learning.selectedTopics')
    try {
      let full = ''
      const systemPrompt = mode === 'summarize'
        ? prompts.summarizeNotes(topicTitle, notesForAI, language)
        : prompts.cheatCard(topicTitle, notesForAI, language)
      await callAI({
        systemPrompt,
        messages: [{ role: 'user', content: mode === 'summarize' ? 'Summarize my notes.' : 'Generate cheat card.' }],
        temperature: 0.5,
        onChunk: (_, acc) => {
          full = acc
          setAiResult(acc)
        },
      })
      setAiResult(full)
    } catch {}
    setAiLoading(false)
  }

  function downloadAsImage(title, content, filename) {
    const canvas = document.createElement('canvas')
    const width = 900
    const padding = 44
    const lineHeight = 22
    const ctx = canvas.getContext('2d')
    const lines = []

    content.split('\n').forEach(line => {
      if (line.startsWith('## ') || line.startsWith('# ') || (line.startsWith('**') && line.endsWith('**'))) {
        lines.push({ text: line.replace(/^#+\s*/, '').replace(/\*\*/g, ''), bold: true, size: 16, gap: 8 })
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        lines.push({ text: '- ' + line.slice(2), bold: false, size: 14, gap: 2 })
      } else if (line.trim() === '') {
        lines.push({ text: '', bold: false, size: 14, gap: 6 })
      } else {
        lines.push({ text: line, bold: false, size: 14, gap: 2 })
      }
    })

    const wrapped = []
    const maxWidth = width - padding * 2
    lines.forEach(line => {
      if (!line.text) {
        wrapped.push({ ...line })
        return
      }
      ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px system-ui,sans-serif`
      const words = line.text.split(' ')
      let current = ''
      words.forEach(word => {
        const test = current ? `${current} ${word}` : word
        if (ctx.measureText(test).width > maxWidth) {
          wrapped.push({ ...line, text: current })
          current = word
        } else {
          current = test
        }
      })
      if (current) wrapped.push({ ...line, text: current })
    })

    const headerHeight = 60
    const totalHeight = headerHeight + wrapped.reduce((sum, line) => sum + lineHeight + (line.gap || 0), 0) + padding * 2
    canvas.width = width
    canvas.height = Math.max(totalHeight, 200)

    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, width, canvas.height)
    ctx.fillStyle = '#14B8A6'
    ctx.fillRect(0, 0, width, headerHeight)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px system-ui,sans-serif'
    ctx.fillText(title, padding, 36)

    let y = headerHeight + padding
    wrapped.forEach(line => {
      if (line.text) {
        ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px system-ui,sans-serif`
        ctx.fillStyle = line.bold ? '#F1F5F9' : '#CBD5E1'
        ctx.fillText(line.text, padding, y)
      }
      y += lineHeight + (line.gap || 0)
    })

    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function downloadTxt(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function printCheatCard(topicTitle, content) {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>${t('learning.cheatCardTitle', { topic: topicTitle })}</title><style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#111;line-height:1.6}
      h1{font-size:1.4rem;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}
      h2{font-size:1.1rem;margin-top:20px;margin-bottom:6px}
      ul{padding-left:20px;margin:6px 0}
      li{margin-bottom:4px}
      strong{font-weight:700}
      @media print{body{margin:10px}@page{margin:1cm}}
    </style></head><body>
      <h1>${t('learning.cheatCardTitle', { topic: topicTitle })}</h1>
      <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.9rem">${content}</pre>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /> {t('nav.learning')}</button>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus size={14} /> {t('learning.addNote')}</button>
      </div>
      <h2 className="section-title mb-1">{t('notes.title')}</h2>
      <p className="section-sub mb-4">{t('learning.notesAcrossTopics', { count: topicNotes.length })}</p>

      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">{t('learning.newNote')}</h3>
          <div className="space-y-2 mb-3">
            <select className="input-field" value={newTopicId} onChange={event => setNewTopicId(event.target.value)}>
              {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
            </select>
            <textarea className="textarea-field h-28" placeholder={t('learning.noteContentPlaceholder')} value={newContent} onChange={event => setNewContent(event.target.value)} autoFocus />
          </div>
          <div className="flex gap-2">
            <button onClick={addNote} disabled={!newContent.trim() || !newTopicId} className="btn-primary">{t('learning.saveNote')}</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setSelectedTopicId('all')} className={`px-3 py-1 rounded-full text-xs font-body transition-all ${selectedTopicId === 'all' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:border-slate-500'}`}>
          {t('learning.filters.all')} ({topicNotes.length})
        </button>
        {topics.filter(topic => topicNotes.some(note => note.topicId === topic.id)).map(topic => {
          const count = topicNotes.filter(note => note.topicId === topic.id).length
          return (
            <button key={topic.id} onClick={() => setSelectedTopicId(topic.id)} className={`px-3 py-1 rounded-full text-xs font-body transition-all ${selectedTopicId === topic.id ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:border-slate-500'}`}>
              {(topic.title.length > 24 ? `${topic.title.slice(0, 22)}...` : topic.title)} ({count})
            </button>
          )
        })}
      </div>

      <div className="flex flex-col">
        {filteredNotes.length === 0 ? (
          <div className="card text-center py-10 text-slate-500">
            {topicNotes.length === 0 ? t('learning.noNotesYet') : t('learning.noNotesForTopic')}
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {filteredNotes.map(note => (
              <div key={note.id} className="card group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="badge-teal text-xs">{note.topicTitle}</span>
                    <span className="text-slate-500 text-xs ml-2">{new Date(note.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigator.clipboard?.writeText(note.content)} className="text-slate-500 hover:text-teal-400 p-0.5"><Copy size={13} /></button>
                    <button onClick={() => onDeleteNote(note.id)} className="text-slate-500 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {filteredNotes.length > 0 && (
          <div className="card order-first mb-6 border-teal-500/20 bg-teal-500/5">
            <h4 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-teal-400" /> {t('learning.aiActions')}
              <span className="text-slate-500 text-xs font-normal">
                - {selectedTopicId === 'all' ? t('learning.allNotes') : currentTopic?.title}
              </span>
            </h4>
            <div className="flex gap-2 mb-4">
              <button onClick={() => runAI('summarize')} disabled={aiLoading || !isConnected} className="btn-secondary flex-1 justify-center text-xs">
                <FileText size={13} /> {aiLoading && aiMode === 'summarize' ? t('learning.summarizing') : t('learning.summarizeNotes')}
              </button>
              <button onClick={() => runAI('cheatcard')} disabled={aiLoading || !isConnected} className="btn-primary flex-1 justify-center text-xs">
                <StickyNote size={13} /> {aiLoading && aiMode === 'cheatcard' ? t('learning.generating') : t('learning.generateCheatCard')}
              </button>
            </div>

            {aiResult && (
              <div className="animate-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wider">
                    {aiMode === 'cheatcard' ? t('learning.cheatCard') : t('learning.summary')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(aiResult)} className="btn-ghost text-xs">
                      <Copy size={12} /> {t('learning.copy')}
                    </button>
                    <button onClick={() => downloadTxt(aiResult, `${(currentTopic?.title || 'notes').replace(/\s+/g, '_')}_${aiMode}.txt`)} className="btn-ghost text-xs">
                      <Download size={12} /> .txt
                    </button>
                    <button onClick={() => printCheatCard(currentTopic?.title || t('notes.title'), aiResult)} className="btn-ghost text-xs">
                      <Printer size={12} /> PDF
                    </button>
                    <button
                      onClick={() => downloadAsImage(
                        `${aiMode === 'cheatcard' ? t('learning.cheatCard') : t('learning.summary')}: ${currentTopic?.title || t('notes.title')}`,
                        aiResult,
                        `${(currentTopic?.title || 'notes').replace(/\s+/g, '_')}_${aiMode}`,
                      )}
                      className="btn-secondary text-xs"
                    >
                      <Image size={12} /> {t('learning.downloadPng')}
                    </button>
                  </div>
                </div>
                <div className="bg-navy-900 rounded-xl p-4">
                  {aiResult.split('\n').map((line, index) => {
                    if (line.startsWith('## ')) return <h3 key={index} className="font-display font-semibold text-white text-sm mt-3 mb-1">{line.slice(3)}</h3>
                    if (line.startsWith('# ')) return <h2 key={index} className="font-display font-bold text-white mb-2">{line.slice(2)}</h2>
                    if (line.startsWith('**') && line.endsWith('**')) return <p key={index} className="text-white font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</p>
                    if (line.startsWith('- ') || line.startsWith('* ')) return <p key={index} className="text-slate-300 text-sm ml-3 mb-1">- {line.slice(2)}</p>
                    if (line.trim() === '') return <div key={index} className="h-2" />
                    return <p key={index} className="text-slate-300 text-sm mb-1">{line}</p>
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function QuizHistory({ history, onBack, onDeleteQuiz }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(null)

  if (selected) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
        <button onClick={() => setSelected(null)} className="btn-ghost mb-4"><ArrowLeft size={16} /> {t('learning.history')}</button>
        <div className="card text-center py-6 mb-4">
          <Brain size={28} className="mx-auto mb-2 text-teal-400" />
          <div className="font-display font-bold text-white text-xl mb-1">{t('learning.quizCorrect', { correct: selected.correct, total: selected.total })}</div>
          <div className="text-teal-400 text-sm font-display font-semibold">{selected.topicTitle}</div>
          <div className="text-slate-500 text-xs mt-1">{new Date(selected.date).toLocaleDateString(undefined, { dateStyle: 'medium' })} - {t('learning.scoreLabel', { score: selected.score })}</div>
        </div>
        <div className="space-y-3">
          {selected.questions.map(question => {
            const item = selected.feedback[question.id]
            const passed = item?.correct !== false && (item?.score === undefined || item?.score >= 6)
            return (
              <div key={question.id} className={`card border ${passed ? 'border-green-500/20' : 'border-red-500/20'}`}>
                <p className="text-white text-sm mb-2">{question.question}</p>
                {(item?.explanation || item?.feedback) && (
                  <p className={`text-xs ${passed ? 'text-green-300' : 'text-red-300'}`}>{item.explanation || item.feedback}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> {t('nav.learning')}</button>
      <h2 className="section-title mb-1">{t('learning.quizHistoryTitle')}</h2>
      <p className="section-sub mb-4">{t('learning.quizAttempts', { count: history.length })}</p>
      {history.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">{t('learning.noQuizzes')}</div>
      ) : (
        <div className="space-y-2">
          {history.map(entry => (
            <div key={entry.id} className="card-hover flex items-center gap-2">
              <button onClick={() => setSelected(entry)} className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-body font-medium text-sm">{entry.topicTitle}</span>
                  <span className={`font-display font-semibold text-sm ${entry.score >= 8 ? 'text-green-400' : entry.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {t('learning.quizCorrect', { correct: entry.correct, total: entry.total })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  <span className={`badge ${entry.score >= 8 ? 'badge-green' : entry.score >= 6 ? 'badge-yellow' : 'badge-red'}`}>{entry.score}/10</span>
                </div>
              </button>
              {onDeleteQuiz && (
                <button
                  onClick={() => {
                    if (confirm(t('learning.confirm.deleteQuiz'))) {
                      onDeleteQuiz(entry.id)
                      if (selected?.id === entry.id) setSelected(null)
                    }
                  }}
                  className="text-slate-600 hover:text-red-400 p-1.5 flex-shrink-0 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
