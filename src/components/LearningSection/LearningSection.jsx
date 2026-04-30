import React, { useState } from 'react'
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

const STARTER_TOPICS = [
  { title: 'B2B vs B2C Fraud: Key Differences', category: 'FRAML', difficulty: 'Intermediate' },
  { title: 'Merchant Risk Assessment & Onboarding', category: 'FRAML', difficulty: 'Intermediate' },
  { title: 'Card Scheme Dispute Flows (Visa & Mastercard)', category: 'Payments', difficulty: 'Intermediate' },
  { title: 'Correspondent Banking & De-risking', category: 'AML', difficulty: 'Advanced' },
  { title: 'Trade-Based Money Laundering (TBML)', category: 'AML', difficulty: 'Advanced' },
  { title: 'AML in B2B Payments Context', category: 'AML', difficulty: 'Intermediate' },
  { title: 'FATF Recommendations Overview', category: 'Regulatory', difficulty: 'Beginner' },
  { title: '6AMLD / BSA / PSD2 Essentials', category: 'Regulatory', difficulty: 'Intermediate' },
  { title: 'Positioning B2C Experience for B2B Roles', category: 'Career', difficulty: 'Beginner' },
]
const DIFF_COLORS = { Beginner: 'badge-green', Intermediate: 'badge-yellow', Advanced: 'badge-red' }
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const CATEGORIES = ['FRAML', 'AML', 'Payments', 'Regulatory', 'Career', 'Technical', 'Marketing', 'Sales', 'Finance', 'Engineering', 'Product', 'Design', 'Data', 'Legal', 'HR', 'Operations', 'Custom']

// ─── Main Learning Section ─────────────────────────────────────────────────────

export default function LearningSection() {
  const { drillMode, profile, pendingLearningRequest, clearPendingLearningRequest, pushAppHistory } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData } = useProject()
  const { language } = useLanguage()

  const topics = getProjectData('topics')
  const quizHistory = getProjectData('quizHistory') || []
  const topicNotes = getProjectData('topicNotes') || []
  const historyState = window.history.state?.jobsensei || {}
  const historyTopic = historyState.topicId ? topics.find(topic => topic.id === historyState.topicId) || null : null

  const [view, setView] = useState(historyState.section === SECTIONS.LEARNING ? historyState.learningView || 'library' : 'library') // 'library' | 'tutor' | 'quiz' | 'quizHistory' | 'notes'
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
    pushAppHistory(SECTIONS.LEARNING, topic ? { learningView: nextView, topicId: topic.id } : (nextView === 'library' ? {} : { learningView: nextView }))
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
      id: generateId(), ...newTopic, category: resolvedCategory,
      status: 'Not Started', messages: [],
      quizScores: [], repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: null,
    }
    setTopics(prev => [...prev, topic])
    setNewTopic({ title: '', category: 'Custom', difficulty: 'Intermediate' })
    setCustomCategory('')
    setShowAdd(false)
  }

  function updateTopic(id, updates) {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    if (selectedTopic?.id === id) setSelectedTopic(t => ({...t, ...updates}))
  }

  function saveQuizHistory(data) {
    const entry = { id: generateId(), date: new Date().toISOString(), ...data }
    updateProjectData('quizHistory', [entry, ...quizHistory].slice(0, 100))
  }

  function deleteTopic(id) {
    if (!confirm('Delete this topic?')) return
    setTopics(prev => prev.filter(t => t.id !== id))
    if (selectedTopic?.id === id) navigateLearningView('library')
  }

  function saveEdit() {
    if (!editingTopic || !editingTopic.title.trim()) return
    updateTopic(editingTopic.id, { title: editingTopic.title, category: editingTopic.category, difficulty: editingTopic.difficulty })
    setEditingTopic(null)
  }

  function addStarterTopics() {
    const existing = topics.map(t => t.title)
    const toAdd = STARTER_TOPICS.filter(t => !existing.includes(t.title))
    const newTopics = toAdd.map(t => ({
      ...t, id: generateId(), status: 'Not Started', messages: [],
      quizScores: [], repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: null,
    }))
    setTopics(prev => [...prev, ...newTopics])
  }

  function saveNote(topicId, topicTitle, content) {
    const note = {
      id: generateId(), topicId, topicTitle,
      content, createdAt: new Date().toISOString(),
    }
    updateProjectData('topicNotes', [note, ...topicNotes].slice(0, 300))
  }

  const dueTopics = topics.filter(t => isDueToday(t.nextReview) && t.status === 'In Progress')
  const categoryOptions = ['All', ...Array.from(new Set(topics.map(t => t.category))).sort()]
  const filteredTopics = topics.filter(t =>
    (filterCategory === 'All' || t.category === filterCategory) &&
    (filterStatus === 'All' || t.status === filterStatus)
  )

  if (view === 'tutor' && selectedTopic) return (
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
  if (view === 'quiz' && selectedTopic) return (
    <QuizMode topic={selectedTopic} onBack={() => navigateLearningView('library')} onUpdate={updateTopic} onQuizComplete={saveQuizHistory} callAI={callAI} isConnected={isConnected} language={language} />
  )
  if (view === 'quizHistory') return (
    <QuizHistory
      history={quizHistory}
      onBack={() => navigateLearningView('library')}
      onDeleteQuiz={(id) => updateProjectData('quizHistory', quizHistory.filter(q => q.id !== id))}
    />
  )
  if (view === 'notes') return (
    <NotesView
      topics={topics}
      topicNotes={topicNotes}
      onBack={() => navigateLearningView('library')}
      onSaveNote={saveNote}
      onDeleteNote={(id) => updateProjectData('topicNotes', topicNotes.filter(n => n.id !== id))}
      callAI={callAI}
      isConnected={isConnected}
      language={language}
    />
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Learning</h2>
          <p className="section-sub">{topics.length} topics · {dueTopics.length} review{dueTopics.length !== 1 ? 's' : ''} due</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {quizHistory.length > 0 && (
            <button onClick={() => navigateLearningView('quizHistory')} className="btn-secondary text-xs">
              <History size={14}/> Quiz History ({quizHistory.length})
            </button>
          )}
          <button onClick={() => navigateLearningView('notes')} className="btn-secondary text-xs">
            <StickyNote size={14}/> Notes {topicNotes.length > 0 ? `(${topicNotes.length})` : ''}
          </button>
          <button data-guide="learning-add-topic" onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus size={14}/> Add Topic</button>
        </div>
      </div>

      {/* Add topic form */}
      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">New Topic</h3>
          <div className="space-y-2 mb-3">
            <input className="input-field" placeholder="Topic title *" value={newTopic.title} onChange={e => setNewTopic(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTopic()} autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <select className="input-field" value={newTopic.category} onChange={e => setNewTopic(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="input-field" value={newTopic.difficulty} onChange={e => setNewTopic(p => ({ ...p, difficulty: e.target.value }))}>
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {newTopic.category === 'Custom' && (
              <input className="input-field" placeholder="Custom category name…" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={addTopic} disabled={!newTopic.title.trim()} className="btn-primary">Add Topic</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Edit topic modal */}
      {editingTopic && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-navy-600 rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white">Edit Topic</h3>
              <button onClick={() => setEditingTopic(null)}><X size={16} className="text-slate-400"/></button>
            </div>
            <div className="space-y-3 mb-4">
              <input className="input-field" value={editingTopic.title} onChange={e => setEditingTopic(t => ({ ...t, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input-field" value={editingTopic.category} onChange={e => setEditingTopic(t => ({ ...t, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="input-field" value={editingTopic.difficulty} onChange={e => setEditingTopic(t => ({ ...t, difficulty: e.target.value }))}>
                  {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-primary flex-1 justify-center"><Check size={14}/> Save</button>
              <button onClick={() => setEditingTopic(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Due reviews — with Study + Quiz buttons */}
      {dueTopics.length > 0 && (
        <div className="card mb-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="text-yellow-400 text-sm font-display font-semibold mb-3">
            📚 {dueTopics.length} review{dueTopics.length !== 1 ? 's' : ''} due today
          </div>
          <div className="space-y-2">
            {dueTopics.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-3 py-2 gap-2">
                <span className="text-yellow-200 text-sm font-body truncate flex-1">{t.title}</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => navigateLearningView('tutor', t)} className="btn-secondary text-xs py-1 px-2">
                    <BookOpen size={12}/> Study
                  </button>
                  <button onClick={() => navigateLearningView('quiz', t)} className="btn-primary text-xs py-1 px-2">
                    <Brain size={12}/> Quiz
                  </button>
                  <button onClick={() => updateTopic(t.id, { nextReview: getNextReviewDate(1) })} className="text-yellow-600 hover:text-yellow-400 transition-colors p-1" title="Snooze to tomorrow">
                    <X size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topics.length === 0 && (
        <div className="card mb-4 text-center py-8">
          <BookOpen size={32} className="text-slate-600 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm mb-4">No topics yet. Load pre-built FRAML topics or add your own.</p>
          <button onClick={addStarterTopics} className="btn-primary mx-auto">Load Starter Topics</button>
        </div>
      )}

      {/* Quiz results — enlarged */}
      {topics.some(t => t.quizScores?.length > 0) && (
        <div className="card mb-4">
          <div className="text-white text-sm font-display font-semibold mb-4 flex items-center gap-2">
            <Brain size={14} className="text-teal-400"/> Quiz Results
          </div>
          <div className="space-y-3">
            {topics.filter(t => t.quizScores?.length > 0).map(t => {
              const scores = t.quizScores
              const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
              const best = Math.max(...scores)
              return (
                <div key={t.id} className="flex items-center gap-4 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-300 text-sm truncate mb-1.5">{t.title}</div>
                    <div className="flex gap-1 mt-1">
                      {scores.slice(-10).map((s, i) => (
                        <div key={i} className={`w-2.5 h-6 rounded-sm ${s >= 8 ? 'bg-green-500' : s >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ opacity: 0.5 + (i / scores.length) * 0.5 }} title={`${s}/10`}/>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-display font-bold ${avg >= 8 ? 'text-green-400' : avg >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{avg}/10 avg</div>
                    <div className="text-slate-500 text-xs">best {best}/10 · {scores.length} quiz{scores.length !== 1 ? 'zes' : ''}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex gap-1 flex-wrap">
            {['All', 'In Progress', 'Not Started', 'Completed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-body ${filterStatus === s ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-navy-800 border-navy-600 text-slate-400 hover:text-slate-200'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {categoryOptions.map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-body ${filterCategory === c ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-navy-800 border-navy-600 text-slate-400 hover:text-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTopics.map(topic => {
          const due = isDueToday(topic.nextReview) && topic.status === 'In Progress'
          const noteCount = topicNotes.filter(n => n.topicId === topic.id).length
          return (
            <div key={topic.id} data-guide="learning-topic-card" className="card flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-white text-sm font-body font-medium leading-snug flex-1">{topic.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {due && <span className="badge-yellow">Due</span>}
                  <button onClick={() => setEditingTopic({...topic})} className="text-slate-500 hover:text-teal-400 p-0.5"><Edit3 size={13}/></button>
                  <button onClick={() => deleteTopic(topic.id)} className="text-slate-500 hover:text-red-400 p-0.5"><Trash2 size={13}/></button>
                </div>
                {!due && <div className="opacity-100 group-hover:opacity-0 transition-opacity flex-shrink-0">
                  {topic.status === 'Completed' && <span className="text-green-400 text-xs">✓</span>}
                </div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-slate">{topic.category}</span>
                <span className={DIFF_COLORS[topic.difficulty] || 'badge-slate'}>{topic.difficulty}</span>
                <span className={`badge ${topic.status === 'Completed' ? 'badge-green' : topic.status === 'In Progress' ? 'badge-teal' : 'badge-slate'}`}>{topic.status}</span>
                {topic.quizScores?.length > 0 && (() => {
                  const last = topic.quizScores[topic.quizScores.length - 1]
                  return <span className={`badge ${last >= 8 ? 'badge-green' : last >= 6 ? 'badge-yellow' : 'badge-red'}`}>Quiz: {Number.isInteger(last) ? last : last.toFixed(1)}/10</span>
                })()}
                {noteCount > 0 && <span className="badge-slate">{noteCount} note{noteCount !== 1 ? 's' : ''}</span>}
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => navigateLearningView('tutor', topic)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  <BookOpen size={13}/> Study
                </button>
                <button onClick={() => navigateLearningView('quiz', topic)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  <Brain size={13}/> Quiz
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Topic Tutor (chat) ────────────────────────────────────────────────────────

function TopicTutor({ topic, onBack, onUpdate, drillMode, profile, callAI, isConnected, onSaveNote, language }) {
  const [messages, setMessages] = useState(topic.messages || [])
  const [loading, setLoading] = useState(false)
  const [depth, setDepth] = useState('Have basics')
  const [noteSaved, setNoteSaved] = useState(false)

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setLoading(true)
    try {
      let full = ''
      setMessages([...newMsgs, { role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.topicTutor(topic.title, depth, profile?.currentRole, drillMode, language),
        messages: newMsgs, temperature: 0.7,
        onChunk: (_, acc) => { full = acc; setMessages([...newMsgs, { role: 'assistant', content: acc }]) },
      })
      const finalMsgs = [...newMsgs, { role: 'assistant', content: full }]
      setMessages(finalMsgs)
      onUpdate(topic.id, { messages: finalMsgs, status: 'In Progress' })
    } catch {}
    setLoading(false)
  }

  const lastAiMsg = messages.filter(m => m.role === 'assistant' && m.content).at(-1)?.content || ''

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
          <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16}/></button>
          <div>
            <div className="text-white text-sm font-body font-medium">{topic.title}</div>
            <div className="flex gap-1.5 mt-0.5">
              {['New to this', 'Have basics', 'Go advanced'].map(d => (
                <button key={d} onClick={() => setDepth(d)}
                  className={`text-xs px-2 py-0.5 rounded transition-all ${depth === d ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>{d}</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => onUpdate(topic.id, { status: 'Completed' })} className="btn-ghost text-xs">
          <Check size={14}/> Done
        </button>
      </div>
      <ChatWindow messages={messages} isLoading={loading} emptyText="Ask anything about this topic, or say 'Teach me' to start!" />
      <div className="p-4 border-t border-navy-700 bg-navy-900 space-y-2">
        <VoiceChatBar
          onSend={sendMessage}
          isLoading={loading}
          lastAiMessage={lastAiMsg}
          placeholder={`Ask about ${topic.title}…`}
        />
        {lastAiMsg && (
          <button
            onClick={handleSaveNote}
            className={`save-note-cta ${noteSaved ? 'is-saved' : ''}`}
          >
            {noteSaved ? <><Check size={12}/> Saved to Notes!</> : <><Save size={12}/> Save last response to Notes</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Quiz Mode ─────────────────────────────────────────────────────────────────

function QuizMode({ topic, onBack, onUpdate, onQuizComplete, callAI, isConnected, language }) {
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(false)
  const [openAnswer, setOpenAnswer] = useState('')

  React.useEffect(() => { if (isConnected) loadQuiz() }, [])

  async function loadQuiz() {
    setLoading(true)
    try {
      const raw = await callAI({ systemPrompt: prompts.quizGenerator(topic.title, topic.difficulty, language), messages: [{ role: 'user', content: 'Generate.' }], temperature: 0.6 })
      const parsed = tryParseJSON(raw)
      if (parsed?.questions) { setQuestions(parsed.questions); setPhase('quiz') }
    } catch {}
    setLoading(false)
  }

  async function submitAnswer(q, answer) {
    setAnswers(prev => ({ ...prev, [q.id]: answer }))
    if (q.type === 'open_ended') {
      setLoading(true)
      try {
        const raw = await callAI({ systemPrompt: prompts.quizEvaluator(q.question, q.sampleAnswer, answer, language), messages: [{ role: 'user', content: 'Evaluate.' }], temperature: 0.3 })
        const parsed = tryParseJSON(raw)
        if (parsed) setFeedback(prev => ({ ...prev, [q.id]: parsed }))
      } catch {}
      setLoading(false)
    } else {
      setFeedback(prev => ({ ...prev, [q.id]: { correct: answer === q.correct, explanation: q.explanation } }))
    }
  }

  function finishQuiz() {
    const scores = Object.entries(feedback).map(([id, f]) => {
      const q = questions.find(q => String(q.id) === String(id))
      return q?.type === 'open_ended' ? (f.score || 5) : (f.correct ? 10 : 0)
    })
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 5
    const quality = avg >= 8 ? 5 : avg >= 6 ? 3 : 1
    const { repetitions, easeFactor, interval } = sm2(quality, topic.repetitions || 0, topic.easeFactor || 2.5, topic.interval || 0)
    onUpdate(topic.id, { repetitions, easeFactor, interval, nextReview: getNextReviewDate(interval), status: 'In Progress', quizScores: [...(topic.quizScores || []), avg] })
    const correct = Object.values(feedback).filter(f => f.correct !== false && (f.score === undefined || f.score >= 6)).length
    onQuizComplete && onQuizComplete({ topicId: topic.id, topicTitle: topic.title, score: avg, correct, total: Object.values(feedback).length, questions, feedback })
    setPhase('results')
  }

  if (phase === 'loading' || loading) return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <div className="text-center"><Brain size={32} className="mx-auto mb-3 animate-pulse text-teal-400"/><p>Generating quiz...</p></div>
    </div>
  )

  if (phase === 'results') {
    const correct = Object.values(feedback).filter(f => f.correct !== false && (f.score === undefined || f.score >= 6)).length
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
        <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16}/> Back</button>
        <div className="card text-center py-8 mb-4">
          <div className="text-4xl mb-2">🎓</div>
          <div className="font-display font-bold text-white text-2xl mb-1">{correct}/{Object.values(feedback).length} Correct</div>
          <div className="text-slate-400 text-sm">Next review scheduled</div>
        </div>
        <div className="space-y-3">
          {questions.map(q => {
            const fb = feedback[q.id]
            const passed = fb?.correct !== false && (fb?.score === undefined || fb?.score >= 6)
            return (
              <div key={q.id} className={`card border ${passed ? 'border-green-500/20' : 'border-red-500/20'}`}>
                <p className="text-white text-sm mb-2">{q.question}</p>
                {(fb?.explanation || fb?.feedback) && (
                  <p className={`text-xs ${passed ? 'text-green-300' : 'text-red-300'}`}>{fb.explanation || fb.feedback}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const q = questions[current]
  const answered = answers[q?.id] !== undefined
  const fb = feedback[q?.id]

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16}/></button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Question {current + 1}/{questions.length}</span><span>{topic.title}</span></div>
          <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }}/>
          </div>
        </div>
      </div>
      {q && (
        <div className="card animate-in">
          <p className="text-white font-body font-medium mb-4">{q.question}</p>
          {q.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i, isCorrect = fb && i === q.correct, isWrong = fb && selected && i !== q.correct
                return (
                  <button key={i} onClick={() => !answered && submitAnswer(q, i)} disabled={answered}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-300' : isWrong ? 'bg-red-500/15 border-red-500/40 text-red-300' : selected ? 'bg-teal-500/15 border-teal-500/40 text-white' : 'bg-navy-900 border-navy-700 text-slate-300 hover:border-slate-500'}`}>
                    <span className="font-mono mr-2 text-slate-500">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <textarea className="textarea-field h-24 mb-3" placeholder="Type your answer..." value={openAnswer} onChange={e => setOpenAnswer(e.target.value)} disabled={answered}/>
              {!answered && <button onClick={() => submitAnswer(q, openAnswer)} disabled={!openAnswer.trim() || loading} className="btn-primary">Submit</button>}
            </div>
          )}
          {fb && <div className={`mt-3 p-3 rounded-xl text-sm ${fb.correct === false || (fb.score !== undefined && fb.score < 6) ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'}`}>{fb.explanation || fb.feedback}</div>}
          {answered && (
            <div className="mt-4 flex justify-end">
              {current < questions.length - 1
                ? <button onClick={() => { setCurrent(c => c + 1); setOpenAnswer('') }} className="btn-primary">Next <ChevronRight size={16}/></button>
                : <button onClick={finishQuiz} className="btn-primary"><Check size={16}/> Finish</button>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Notes View ────────────────────────────────────────────────────────────────

function NotesView({ topics, topicNotes, onBack, onSaveNote, onDeleteNote, callAI, isConnected, language }) {
  const [selectedTopicId, setSelectedTopicId] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTopicId, setNewTopicId] = useState(topics[0]?.id || '')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode, setAiMode] = useState(null) // 'summarize' | 'cheatcard'
  const [cheatCard, setCheatCard] = useState('')

  const filteredNotes = selectedTopicId === 'all'
    ? topicNotes
    : topicNotes.filter(n => n.topicId === selectedTopicId)

  const currentTopic = topics.find(t => t.id === selectedTopicId)
  const notesForAI = filteredNotes.map(n => n.content).join('\n\n---\n\n')

  function addNote() {
    if (!newContent.trim() || !newTopicId) return
    const topic = topics.find(t => t.id === newTopicId)
    onSaveNote(newTopicId, topic?.title || 'Unknown', newContent.trim())
    setNewContent(''); setShowAdd(false)
  }

  async function runAI(mode) {
    if (!notesForAI.trim()) return
    setAiLoading(true); setAiResult(''); setAiMode(mode); setCheatCard('')
    const topicTitle = currentTopic?.title || 'Selected Topics'
    try {
      let full = ''
      const systemPrompt = mode === 'summarize'
        ? prompts.summarizeNotes(topicTitle, notesForAI, language)
        : prompts.cheatCard(topicTitle, notesForAI, language)
      await callAI({
        systemPrompt,
        messages: [{ role: 'user', content: mode === 'summarize' ? 'Summarize my notes.' : 'Generate cheat card.' }],
        temperature: 0.5,
        onChunk: (_, acc) => { full = acc; setAiResult(acc) },
      })
      if (mode === 'cheatcard') setCheatCard(full)
    } catch {}
    setAiLoading(false)
  }

  function downloadAsImage(title, content, filename) {
    const canvas = document.createElement('canvas')
    const width = 900
    const padding = 44
    const lineH = 22
    const ctx = canvas.getContext('2d')
    // Measure lines
    const lines = []
    content.split('\n').forEach(line => {
      if (line.startsWith('## ') || line.startsWith('# ') || (line.startsWith('**') && line.endsWith('**'))) {
        lines.push({ text: line.replace(/^#+\s*/, '').replace(/\*\*/g, ''), bold: true, size: 16, gap: 8 })
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        lines.push({ text: '• ' + line.slice(2), bold: false, size: 14, gap: 2 })
      } else if (line.trim() === '') {
        lines.push({ text: '', bold: false, size: 14, gap: 6 })
      } else {
        lines.push({ text: line, bold: false, size: 14, gap: 2 })
      }
    })
    // Word-wrap all lines
    const wrapped = []
    const maxW = width - padding * 2
    lines.forEach(l => {
      if (!l.text) { wrapped.push({ ...l }); return }
      ctx.font = `${l.bold ? 'bold ' : ''}${l.size}px system-ui,sans-serif`
      const words = l.text.split(' ')
      let cur = ''
      words.forEach(w => {
        const test = cur ? cur + ' ' + w : w
        if (ctx.measureText(test).width > maxW) { wrapped.push({ ...l, text: cur }); cur = w }
        else cur = test
      })
      if (cur) wrapped.push({ ...l, text: cur })
    })
    const headerH = 60
    const totalH = headerH + wrapped.reduce((acc, l) => acc + lineH + (l.gap || 0), 0) + padding * 2
    canvas.width = width; canvas.height = Math.max(totalH, 200)
    // Background
    ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, width, canvas.height)
    // Header bar
    ctx.fillStyle = '#14B8A6'; ctx.fillRect(0, 0, width, headerH)
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px system-ui,sans-serif'
    ctx.fillText(title, padding, 36)
    // Content
    let y = headerH + padding
    wrapped.forEach(l => {
      if (l.text) {
        ctx.font = `${l.bold ? 'bold ' : ''}${l.size}px system-ui,sans-serif`
        ctx.fillStyle = l.bold ? '#F1F5F9' : '#CBD5E1'
        ctx.fillText(l.text, padding, y)
      }
      y += lineH + (l.gap || 0)
    })
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function downloadTxt(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function printCheatCard(topicTitle, content) {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Cheat Card – ${topicTitle}</title><style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#111;line-height:1.6}
      h1{font-size:1.4rem;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}
      h2{font-size:1.1rem;margin-top:20px;margin-bottom:6px}
      ul{padding-left:20px;margin:6px 0}
      li{margin-bottom:4px}
      strong{font-weight:700}
      @media print{body{margin:10px}@page{margin:1cm}}
    </style></head><body>
      <h1>📋 Cheat Card: ${topicTitle}</h1>
      <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.9rem">${content}</pre>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16}/> Learning</button>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus size={14}/> Add Note</button>
      </div>
      <h2 className="section-title mb-1">Notes</h2>
      <p className="section-sub mb-4">{topicNotes.length} note{topicNotes.length !== 1 ? 's' : ''} across all topics</p>

      {/* Add note form */}
      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">New Note</h3>
          <div className="space-y-2 mb-3">
            <select className="input-field" value={newTopicId} onChange={e => setNewTopicId(e.target.value)}>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <textarea className="textarea-field h-28" placeholder="Note content..." value={newContent} onChange={e => setNewContent(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2">
            <button onClick={addNote} disabled={!newContent.trim() || !newTopicId} className="btn-primary">Save Note</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Topic filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setSelectedTopicId('all')} className={`px-3 py-1 rounded-full text-xs font-body transition-all ${selectedTopicId === 'all' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:border-slate-500'}`}>
          All ({topicNotes.length})
        </button>
        {topics.filter(t => topicNotes.some(n => n.topicId === t.id)).map(t => {
          const count = topicNotes.filter(n => n.topicId === t.id).length
          return (
            <button key={t.id} onClick={() => setSelectedTopicId(t.id)} className={`px-3 py-1 rounded-full text-xs font-body transition-all ${selectedTopicId === t.id ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:border-slate-500'}`}>
              {t.title.length > 24 ? t.title.slice(0, 22) + '…' : t.title} ({count})
            </button>
          )
        })}
      </div>

      <div className="flex flex-col">
      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          {topicNotes.length === 0 ? 'No notes yet. Study a topic and save AI responses, or add a note manually.' : 'No notes for this topic.'}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {filteredNotes.map(n => (
            <div key={n.id} className="card group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="badge-teal text-xs">{n.topicTitle}</span>
                  <span className="text-slate-500 text-xs ml-2">{new Date(n.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => navigator.clipboard?.writeText(n.content)} className="text-slate-500 hover:text-teal-400 p-0.5"><Copy size={13}/></button>
                  <button onClick={() => onDeleteNote(n.id)} className="text-slate-500 hover:text-red-400 p-0.5"><Trash2 size={13}/></button>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Actions */}
      {filteredNotes.length > 0 && (
        <div className="card order-first mb-6 border-teal-500/20 bg-teal-500/5">
          <h4 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-teal-400"/> AI Actions
            <span className="text-slate-500 text-xs font-normal">
              — {selectedTopicId === 'all' ? 'all notes' : currentTopic?.title}
            </span>
          </h4>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => runAI('summarize')}
              disabled={aiLoading || !isConnected}
              className="btn-secondary flex-1 justify-center text-xs"
            >
              <FileText size={13}/> {aiLoading && aiMode === 'summarize' ? 'Summarizing...' : 'Summarize Notes'}
            </button>
            <button
              onClick={() => runAI('cheatcard')}
              disabled={aiLoading || !isConnected}
              className="btn-primary flex-1 justify-center text-xs"
            >
              <StickyNote size={13}/> {aiLoading && aiMode === 'cheatcard' ? 'Generating...' : 'Generate Cheat Card'}
            </button>
          </div>

          {aiResult && (
            <div className="animate-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wider">
                  {aiMode === 'cheatcard' ? '📋 Cheat Card' : '📝 Summary'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(aiResult)} className="btn-ghost text-xs">
                    <Copy size={12}/> Copy
                  </button>
                  <button
                    onClick={() => downloadTxt(aiResult, `${(currentTopic?.title || 'notes').replace(/\s+/g, '_')}_${aiMode}.txt`)}
                    className="btn-ghost text-xs"
                  >
                    <Download size={12}/> .txt
                  </button>
                  <button
                    onClick={() => printCheatCard(currentTopic?.title || 'Notes', aiResult)}
                    className="btn-ghost text-xs"
                  >
                    <Printer size={12}/> PDF
                  </button>
                  <button
                    onClick={() => downloadAsImage(
                      `${aiMode === 'cheatcard' ? '📋 Cheat Card' : '📝 Summary'}: ${currentTopic?.title || 'Notes'}`,
                      aiResult,
                      `${(currentTopic?.title || 'notes').replace(/\s+/g, '_')}_${aiMode}`
                    )}
                    className="btn-secondary text-xs"
                  >
                    <Image size={12}/> Download .png
                  </button>
                </div>
              </div>
              <div className="bg-navy-900 rounded-xl p-4">
                {aiResult.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) return <h3 key={i} className="font-display font-semibold text-white text-sm mt-3 mb-1">{line.slice(3)}</h3>
                  if (line.startsWith('# ')) return <h2 key={i} className="font-display font-bold text-white mb-2">{line.slice(2)}</h2>
                  if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-white font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</p>
                  if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1">• {line.slice(2)}</p>
                  if (line.trim() === '') return <div key={i} className="h-2"/>
                  return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
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

// ─── Quiz History ──────────────────────────────────────────────────────────────

function QuizHistory({ history, onBack, onDeleteQuiz }) {
  const [selected, setSelected] = useState(null)

  if (selected) return (
    <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
      <button onClick={() => setSelected(null)} className="btn-ghost mb-4"><ArrowLeft size={16}/> History</button>
      <div className="card text-center py-6 mb-4">
        <div className="text-3xl mb-2">🎓</div>
        <div className="font-display font-bold text-white text-xl mb-1">{selected.correct}/{selected.total} Correct</div>
        <div className="text-teal-400 text-sm font-display font-semibold">{selected.topicTitle}</div>
        <div className="text-slate-500 text-xs mt-1">{new Date(selected.date).toLocaleDateString(undefined, { dateStyle: 'medium' })} · Score {selected.score}/10</div>
      </div>
      <div className="space-y-3">
        {selected.questions.map(q => {
          const fb = selected.feedback[q.id]
          const passed = fb?.correct !== false && (fb?.score === undefined || fb?.score >= 6)
          return (
            <div key={q.id} className={`card border ${passed ? 'border-green-500/20' : 'border-red-500/20'}`}>
              <p className="text-white text-sm mb-2">{q.question}</p>
              {(fb?.explanation || fb?.feedback) && (
                <p className={`text-xs ${passed ? 'text-green-300' : 'text-red-300'}`}>{fb.explanation || fb.feedback}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16}/> Learning</button>
      <h2 className="section-title mb-1">Quiz History</h2>
      <p className="section-sub mb-4">{history.length} quiz attempt{history.length !== 1 ? 's' : ''}</p>
      {history.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">No quizzes taken yet.</div>
      ) : (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="card-hover flex items-center gap-2">
              <button onClick={() => setSelected(h)} className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-body font-medium text-sm">{h.topicTitle}</span>
                  <span className={`font-display font-semibold text-sm ${h.score >= 8 ? 'text-green-400' : h.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {h.correct}/{h.total} correct
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{new Date(h.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  <span className={`badge ${h.score >= 8 ? 'badge-green' : h.score >= 6 ? 'badge-yellow' : 'badge-red'}`}>{h.score}/10</span>
                </div>
              </button>
              {onDeleteQuiz && (
                <button
                  onClick={() => { if (confirm('Delete this quiz result?')) { onDeleteQuiz(h.id); if (selected?.id === h.id) setSelected(null) } }}
                  className="text-slate-600 hover:text-red-400 p-1.5 flex-shrink-0 transition-colors"
                ><Trash2 size={14}/></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
