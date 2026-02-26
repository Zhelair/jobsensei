import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { Star, Plus, Wand2, Copy, Trash2, ArrowLeft, Tag } from 'lucide-react'

export default function STARBuilder() {
  const { drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const [stories, setStories] = useLocalStorage('js_star_stories', [])
  const [view, setView] = useState('bank') // bank | build
  const [situation, setSituation] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState('')

  async function buildStar() {
    if (!situation.trim()) return
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({
        systemPrompt: prompts.starBuilder(situation, drillMode),
        messages: [{ role: 'user', content: 'Build my STAR answer.' }],
        temperature: 0.7,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) setResult(parsed)
    } catch {}
    setLoading(false)
  }

  function saveStory() {
    if (!result) return
    const story = {
      id: generateId(),
      date: new Date().toISOString(),
      situation: situation.slice(0, 100),
      ...result,
    }
    setStories(prev => [...prev, story])
    setResult(null)
    setSituation('')
    setView('bank')
  }

  function deleteStory(id) {
    setStories(prev => prev.filter(s => s.id !== id))
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text)
  }

  const filtered = filter ? stories.filter(s =>
    s.title?.toLowerCase().includes(filter.toLowerCase()) ||
    s.suggestedTags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
  ) : stories

  if (view === 'build') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={() => setView('bank')} className="btn-ghost mb-4"><ArrowLeft size={16} /> Story Bank</button>
      <h2 className="section-title mb-1">STAR Answer Builder</h2>
      <p className="section-sub mb-5">Describe a situation loosely — I'll structure it into a polished STAR answer.</p>

      <div className="mb-4">
        <label className="text-sm text-slate-400 mb-1.5 block">Describe the situation (rough notes are fine)</label>
        <textarea
          className="textarea-field h-32"
          placeholder="e.g. There was a case where I noticed unusual transaction patterns across multiple merchants that turned out to be an organized fraud ring. I had to investigate, escalate, and coordinate with multiple teams..."
          value={situation}
          onChange={e => setSituation(e.target.value)}
        />
      </div>

      <button onClick={buildStar} disabled={loading || !isConnected || !situation.trim()} className="btn-primary mb-5">
        <Wand2 size={16} /> {loading ? 'Building...' : 'Build STAR Answer'}
      </button>

      {result && (
        <div className="space-y-4 animate-in">
          {/* Full answer */}
          <div className="card border-teal-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-white">Interview-Ready Answer</h3>
              <button onClick={() => copyToClipboard(result.fullAnswer)} className="btn-ghost text-xs">
                <Copy size={13} /> Copy
              </button>
            </div>
            <p className="text-slate-200 text-sm font-body leading-relaxed">{result.fullAnswer}</p>
          </div>

          {/* Breakdown */}
          <div className="grid sm:grid-cols-2 gap-3">
            {[['S', 'Situation', result.situation, 'teal'], ['T', 'Task', result.task, 'indigo'], ['A', 'Action', result.action, 'teal'], ['R', 'Result', result.result, 'indigo']].map(([letter, label, content, color]) => (
              <div key={label} className="card">
                <div className={`w-7 h-7 rounded-lg mb-2 flex items-center justify-center font-display font-bold text-sm ${color === 'teal' ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {letter}
                </div>
                <div className="text-slate-400 text-xs mb-1">{label}</div>
                <p className="text-slate-200 text-sm">{content}</p>
              </div>
            ))}
          </div>

          {/* Weaknesses */}
          {result.weaknesses?.length > 0 && (
            <div className="card border-yellow-500/20 bg-yellow-500/5">
              <div className="text-yellow-400 text-sm font-display font-semibold mb-2">⚠️ Areas to strengthen</div>
              <ul className="space-y-1">
                {result.weaknesses.map((w, i) => <li key={i} className="text-slate-400 text-xs">• {w}</li>)}
              </ul>
            </div>
          )}

          {/* Tags & questions */}
          <div className="card">
            <div className="flex flex-wrap gap-2 mb-2">
              {result.suggestedTags?.map((t, i) => <span key={i} className="badge-indigo"><Tag size={10} /> {t}</span>)}
            </div>
            <div className="text-slate-400 text-xs">Answers questions like:</div>
            <ul className="mt-1 space-y-1">
              {result.targetQuestions?.map((q, i) => <li key={i} className="text-slate-300 text-xs">• {q}</li>)}
            </ul>
          </div>

          <button onClick={saveStory} className="btn-primary w-full justify-center">
            <Star size={16} /> Save to Story Bank
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Story Bank</h2>
          <p className="section-sub">{stories.length} STAR stories saved</p>
        </div>
        <button onClick={() => setView('build')} className="btn-primary">
          <Plus size={16} /> New Story
        </button>
      </div>

      {stories.length > 0 && (
        <input className="input-field mb-4" placeholder="Filter by title or tag..." value={filter} onChange={e => setFilter(e.target.value)} />
      )}

      {stories.length === 0 ? (
        <div className="card text-center py-10">
          <Star size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No stories yet. Build your first STAR answer to add it here.</p>
          <button onClick={() => setView('build')} className="btn-primary mx-auto">Build First Story</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(story => (
            <div key={story.id} className="card-hover">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-white text-sm font-body font-medium">{story.situation || 'Untitled story'}</h3>
                  <div className="text-slate-500 text-xs mt-0.5">{new Date(story.date).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copyToClipboard(story.fullAnswer)} className="btn-ghost text-xs p-1.5"><Copy size={13} /></button>
                  <button onClick={() => deleteStory(story.id)} className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-300"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {story.suggestedTags?.map((t, i) => <span key={i} className="badge-indigo text-xs">{t}</span>)}
              </div>
              <p className="text-slate-400 text-xs line-clamp-2">{story.fullAnswer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
