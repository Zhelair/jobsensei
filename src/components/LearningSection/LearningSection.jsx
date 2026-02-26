import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { sm2, getNextReviewDate, isDueToday } from '../../utils/spacedRepetition'
import ChatWindow from '../shared/ChatWindow'
import { BookOpen, Plus, Brain, Zap, Check, X, ChevronRight, ArrowLeft } from 'lucide-react'

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

export default function LearningSection() {
  const { drillMode, profile } = useApp()
  const { callAI, isConnected } = useAI()
  const [topics, setTopics] = useLocalStorage('js_topics', [])
  const [view, setView] = useState('library') // library | tutor | quiz | transferable
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function addTopic(title, category = 'Custom', difficulty = 'Intermediate') {
    const topic = {
      id: generateId(), title, category, difficulty,
      status: 'Not Started', messages: [],
      quizScores: [], repetitions: 0, easeFactor: 2.5, interval: 0,
      nextReview: null,
    }
    setTopics(prev => [...prev, topic])
    setNewTopicTitle('')
    setShowAdd(false)
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

  function updateTopic(id, updates) {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const dueTopics = topics.filter(t => isDueToday(t.nextReview) && t.status === 'In Progress')

  if (view === 'tutor' && selectedTopic) return (
    <TopicTutor
      topic={selectedTopic}
      onBack={() => { setView('library'); setSelectedTopic(null) }}
      onUpdate={updateTopic}
      drillMode={drillMode}
      profile={profile}
      callAI={callAI}
      isConnected={isConnected}
    />
  )

  if (view === 'quiz' && selectedTopic) return (
    <QuizMode
      topic={selectedTopic}
      onBack={() => { setView('library'); setSelectedTopic(null) }}
      onUpdate={updateTopic}
      callAI={callAI}
      isConnected={isConnected}
    />
  )

  if (view === 'transferable') return (
    <TransferableSkills
      onBack={() => setView('library')}
      drillMode={drillMode}
      profile={profile}
      callAI={callAI}
      isConnected={isConnected}
    />
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Learning</h2>
          <p className="section-sub">{topics.length} topics · {dueTopics.length} review{dueTopics.length !== 1 ? 's' : ''} due</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('transferable')} className="btn-secondary text-xs">
            <Zap size={14} /> Transferable Skills
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs">
            <Plus size={14} /> Add Topic
          </button>
        </div>
      </div>

      {/* Add topic */}
      {showAdd && (
        <div className="card mb-4 flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Topic title..."
            value={newTopicTitle}
            onChange={e => setNewTopicTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newTopicTitle.trim() && addTopic(newTopicTitle.trim())}
          />
          <button onClick={() => addTopic(newTopicTitle.trim())} disabled={!newTopicTitle.trim()} className="btn-primary">Add</button>
        </div>
      )}

      {/* Due reviews */}
      {dueTopics.length > 0 && (
        <div className="card mb-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="text-yellow-400 text-sm font-display font-semibold mb-2">📚 {dueTopics.length} review{dueTopics.length !== 1 ? 's' : ''} due today</div>
          <div className="flex flex-wrap gap-2">
            {dueTopics.map(t => (
              <button key={t.id} onClick={() => { setSelectedTopic(t); setView('quiz') }}
                className="badge-yellow cursor-pointer hover:opacity-80">
                {t.title} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Starter topics prompt */}
      {topics.length === 0 && (
        <div className="card mb-4 text-center py-8">
          <BookOpen size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No topics yet. Load pre-built topics for Financial Crime professionals?</p>
          <button onClick={addStarterTopics} className="btn-primary mx-auto">Load Starter Topics</button>
        </div>
      )}

      {/* Topics grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topics.map(topic => {
          const due = isDueToday(topic.nextReview) && topic.status === 'In Progress'
          return (
            <div key={topic.id} className="card-hover flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-white text-sm font-body font-medium leading-snug">{topic.title}</h3>
                {due && <span className="badge-yellow flex-shrink-0">Due</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-slate">{topic.category}</span>
                <span className={DIFF_COLORS[topic.difficulty] || 'badge-slate'}>{topic.difficulty}</span>
                <span className={`badge ${topic.status === 'Completed' ? 'badge-green' : topic.status === 'In Progress' ? 'badge-teal' : 'badge-slate'}`}>
                  {topic.status}
                </span>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => { setSelectedTopic(topic); setView('tutor') }}
                  className="btn-secondary flex-1 justify-center text-xs py-1.5"
                >
                  <BookOpen size={13} /> Study
                </button>
                <button
                  onClick={() => { setSelectedTopic(topic); setView('quiz') }}
                  className="btn-secondary flex-1 justify-center text-xs py-1.5"
                >
                  <Brain size={13} /> Quiz
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopicTutor({ topic, onBack, onUpdate, drillMode, profile, callAI, isConnected }) {
  const [messages, setMessages] = useState(topic.messages || [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [depth, setDepth] = useState('Have basics')

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      let full = ''
      setMessages([...newMsgs, { role: 'assistant', content: '' }])
      await callAI({
        systemPrompt: prompts.topicTutor(topic.title, depth, profile?.currentRole, drillMode),
        messages: newMsgs,
        temperature: 0.7,
        onChunk: (_, acc) => { full = acc; setMessages([...newMsgs, { role: 'assistant', content: acc }]) },
      })
      const finalMsgs = [...newMsgs, { role: 'assistant', content: full }]
      setMessages(finalMsgs)
      onUpdate(topic.id, { messages: finalMsgs, status: 'In Progress' })
    } catch {}
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full animate-in">
      <div className="px-4 py-3 border-b border-navy-700 bg-navy-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /></button>
          <div>
            <div className="text-white text-sm font-body font-medium">{topic.title}</div>
            <div className="flex gap-1.5 mt-0.5">
              {['New to this', 'Have basics', 'Go advanced'].map(d => (
                <button key={d} onClick={() => setDepth(d)}
                  className={`text-xs px-2 py-0.5 rounded transition-all ${depth === d ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => onUpdate(topic.id, { status: 'Completed' })} className="btn-ghost text-xs">
          <Check size={14} /> Mark Done
        </button>
      </div>

      <ChatWindow
        messages={messages.length === 0 ? [] : messages}
        isLoading={loading}
        emptyText="Ask me anything about this topic, or say 'Teach me' to start!"
      />

      <div className="p-4 border-t border-navy-700 bg-navy-900 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder={`Ask about ${topic.title}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(input) } }}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || !isConnected}
          className="w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center flex-shrink-0">
          <ChevronRight size={16} className="text-navy-900" />
        </button>
      </div>
    </div>
  )
}

function QuizMode({ topic, onBack, onUpdate, callAI, isConnected }) {
  const [phase, setPhase] = useState('loading') // loading | quiz | results
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(false)
  const [openAnswer, setOpenAnswer] = useState('')

  async function loadQuiz() {
    setLoading(true)
    try {
      const raw = await callAI({
        systemPrompt: prompts.quizGenerator(topic.title, topic.difficulty),
        messages: [{ role: 'user', content: 'Generate the quiz.' }],
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

  React.useEffect(() => { if (isConnected) loadQuiz() }, [])

  async function submitAnswer(q, answer) {
    setAnswers(prev => ({ ...prev, [q.id]: answer }))
    if (q.type === 'open_ended') {
      setLoading(true)
      try {
        const raw = await callAI({
          systemPrompt: prompts.quizEvaluator(q.question, q.sampleAnswer, answer),
          messages: [{ role: 'user', content: 'Evaluate.' }],
          temperature: 0.3,
        })
        const parsed = tryParseJSON(raw)
        if (parsed) setFeedback(prev => ({ ...prev, [q.id]: parsed }))
      } catch {}
      setLoading(false)
    } else {
      // MC: check correct
      setFeedback(prev => ({ ...prev, [q.id]: { correct: answer === q.correct, explanation: q.explanation } }))
    }
  }

  function finishQuiz() {
    const scores = Object.entries(feedback).map(([id, f]) => {
      const q = questions.find(q => String(q.id) === String(id))
      return q?.type === 'open_ended' ? (f.score || 5) : (f.correct ? 10 : 0)
    })
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 5

    // Update spaced repetition
    const quality = avg >= 8 ? 5 : avg >= 6 ? 3 : 1
    const { repetitions, easeFactor, interval } = sm2(quality, topic.repetitions || 0, topic.easeFactor || 2.5, topic.interval || 0)
    const nextReview = getNextReviewDate(interval)
    onUpdate(topic.id, { repetitions, easeFactor, interval, nextReview, status: 'In Progress', quizScores: [...(topic.quizScores || []), avg] })
    setPhase('results')
  }

  if (phase === 'loading' || loading) return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <div className="text-center">
        <Brain size={32} className="mx-auto mb-3 animate-pulse text-teal-400" />
        <p>Generating quiz...</p>
      </div>
    </div>
  )

  if (phase === 'results') {
    const scores = Object.values(feedback)
    const correct = scores.filter(f => f.correct !== false && (f.score === undefined || f.score >= 6)).length
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">
        <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Back</button>
        <div className="card text-center py-8 mb-4">
          <div className="text-4xl mb-2">🎓</div>
          <div className="font-display font-bold text-white text-2xl mb-1">{correct}/{scores.length} Correct</div>
          <div className="text-slate-400 text-sm">Next review scheduled based on your performance</div>
        </div>
        <div className="space-y-3">
          {questions.map(q => {
            const fb = feedback[q.id]
            return (
              <div key={q.id} className={`card border ${fb?.correct === false || (fb?.score !== undefined && fb.score < 6) ? 'border-red-500/20' : 'border-green-500/20'}`}>
                <p className="text-white text-sm font-body mb-2">{q.question}</p>
                {fb?.explanation && <p className="text-slate-400 text-xs">{fb.explanation}</p>}
                {fb?.feedback && <p className="text-slate-400 text-xs">{fb.feedback}</p>}
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
        <button onClick={onBack} className="btn-ghost"><ArrowLeft size={16} /></button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Question {current + 1}/{questions.length}</span>
            <span>{topic.title}</span>
          </div>
          <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {q && (
        <div className="card animate-in">
          <p className="text-white font-body font-medium mb-4">{q.question}</p>

          {q.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i
                const isCorrect = fb && i === q.correct
                const isWrong = fb && selected && i !== q.correct
                return (
                  <button
                    key={i}
                    onClick={() => !answered && submitAnswer(q, i)}
                    disabled={answered}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-body transition-all ${
                      isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-300'
                      : isWrong ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : selected ? 'bg-teal-500/15 border-teal-500/40 text-white'
                      : 'bg-navy-900 border-navy-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-mono mr-2 text-slate-500">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <textarea
                className="textarea-field h-24 mb-3"
                placeholder="Type your answer..."
                value={openAnswer}
                onChange={e => setOpenAnswer(e.target.value)}
                disabled={answered}
              />
              {!answered && (
                <button onClick={() => submitAnswer(q, openAnswer)} disabled={!openAnswer.trim() || loading} className="btn-primary">
                  Submit Answer
                </button>
              )}
            </div>
          )}

          {fb && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${fb.correct === false || (fb.score !== undefined && fb.score < 6) ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'}`}>
              {fb.explanation || fb.feedback}
            </div>
          )}

          {answered && (
            <div className="mt-4 flex justify-end">
              {current < questions.length - 1
                ? <button onClick={() => { setCurrent(c => c + 1); setOpenAnswer('') }} className="btn-primary">Next <ChevronRight size={16} /></button>
                : <button onClick={finishQuiz} className="btn-primary"><Check size={16} /> Finish Quiz</button>
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TransferableSkills({ onBack, drillMode, profile, callAI, isConnected }) {
  const [experience, setExperience] = useState(profile?.currentRole ? `I worked as ${profile.currentRole} for ${profile.experience} in ${profile.industry}.` : '')
  const [targetRole, setTargetRole] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function analyze() {
    setLoading(true); setResult('')
    try {
      let full = ''
      await callAI({
        systemPrompt: prompts.transferableSkills(experience, targetRole, drillMode),
        messages: [{ role: 'user', content: 'Analyze my transferable skills.' }],
        temperature: 0.7,
        onChunk: (_, acc) => { full = acc; setResult(acc) },
      })
    } catch {}
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> Back</button>
      <h2 className="section-title mb-1">Transferable Skills Coach</h2>
      <p className="section-sub mb-5">Reframe your experience in the language of your target role.</p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Your current experience</label>
          <textarea className="textarea-field h-24" placeholder="Describe what you've done..." value={experience} onChange={e => setExperience(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Target role / context</label>
          <input className="input-field" placeholder="e.g. B2B Compliance Manager at a bank" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
        </div>
      </div>

      <button onClick={analyze} disabled={loading || !isConnected || !experience.trim() || !targetRole.trim()} className="btn-primary mb-5">
        <Zap size={16} /> {loading ? 'Analyzing...' : 'Analyze Transferable Skills'}
      </button>

      {result && (
        <div className="card animate-in">
          {result.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) return <h3 key={i} className="font-display font-semibold text-white mt-4 mb-2">{line.slice(2, -2)}</h3>
            if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1.5">• {line.slice(2)}</p>
            if (line.trim() === '') return <div key={i} className="h-1" />
            return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
          })}
        </div>
      )}
    </div>
  )
}
