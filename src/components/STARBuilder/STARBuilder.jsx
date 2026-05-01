import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import { prompts } from '../../utils/prompts'
import { tryParseJSON, generateId } from '../../utils/helpers'
import { Star, Plus, Wand2, Copy, Trash2, ArrowLeft, Tag, Edit3, Check, Eye } from 'lucide-react'

export default function STARBuilder({ onBack, backLabel }) {
  const { drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const { getProjectData, updateProjectData, activeApplication } = useProject()
  const { language, t } = useLanguage()

  const stories = getProjectData('starStories')
  function setStories(updater) {
    const next = typeof updater === 'function' ? updater(stories) : updater
    updateProjectData('starStories', next)
  }

  const [view, setView] = useState('bank')
  const [situation, setSituation] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [viewingStory, setViewingStory] = useState(null)

  async function buildStar() {
    if (!situation.trim()) return
    setLoading(true); setResult(null)
    try {
      const raw = await callAI({ systemPrompt: prompts.starBuilder(situation, drillMode, language), messages: [{ role: 'user', content: 'Build STAR.' }], temperature: 0.7 })
      const parsed = tryParseJSON(raw)
      if (parsed) setResult(parsed)
    } catch {}
    setLoading(false)
  }

  function saveStory() {
    if (!result) return
    setStories(prev => [...prev, {
      id: generateId(),
      date: new Date().toISOString(),
      situation: situation.slice(0, 100),
      applicationId: activeApplication?.id || null,
      applicationLabel: activeApplication
        ? `${activeApplication.company}${activeApplication.role ? ` - ${activeApplication.role}` : ''}`
        : null,
      ...result,
    }])
    setResult(null); setSituation(''); setView('bank')
  }

  function deleteStory(id) { setStories(prev => prev.filter(s => s.id !== id)) }

  function startEdit(story) {
    setEditingId(story.id)
    setEditContent(story.fullAnswer)
  }

  function saveEdit(id) {
    setStories(prev => prev.map(s => s.id === id ? { ...s, fullAnswer: editContent } : s))
    setEditingId(null)
  }

  function copyText(text) { navigator.clipboard?.writeText(text) }

  const filtered = filter
    ? stories.filter(story => story.situation?.toLowerCase().includes(filter.toLowerCase()) || story.suggestedTags?.some(tag => tag.toLowerCase().includes(filter.toLowerCase())))
    : stories

  const starSections = [
    ['S', t('starBuilder.situation'), 'situation', 'teal'],
    ['T', t('starBuilder.task'), 'task', 'indigo'],
    ['A', t('starBuilder.action'), 'action', 'teal'],
    ['R', t('starBuilder.result'), 'result', 'indigo'],
  ]

  if (view === 'detail' && viewingStory) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={() => { setView('bank'); setViewingStory(null) }} className="btn-ghost mb-4"><ArrowLeft size={16} /> {t('starBuilder.storyBank')}</button>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="section-title mb-0.5">{viewingStory.situation || t('starBuilder.storyFallback')}</h2>
          <p className="section-sub">{new Date(viewingStory.date).toLocaleDateString()}</p>
        </div>
        <button onClick={() => copyText(viewingStory.fullAnswer)} className="btn-ghost text-xs flex-shrink-0"><Copy size={13} /> {t('starBuilder.copy')}</button>
      </div>

      <div className="space-y-4">
        <div className="card border-teal-500/20">
          <h3 className="font-display font-semibold text-white text-sm mb-3">{t('starBuilder.interviewReadyAnswer')}</h3>
          <p className="text-slate-200 text-sm font-body leading-relaxed">{viewingStory.fullAnswer}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {starSections.map(([letter, label, field, color]) => (
            <div key={label} className="card">
              <div className={`w-7 h-7 rounded-lg mb-2 flex items-center justify-center font-display font-bold text-sm ${color === 'teal' ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{letter}</div>
              <div className="text-slate-400 text-xs mb-1">{label}</div>
              <p className="text-slate-200 text-sm">{viewingStory[field]}</p>
            </div>
          ))}
        </div>

        {viewingStory.weaknesses?.length > 0 && (
          <div className="card border-yellow-500/20 bg-yellow-500/5">
            <div className="text-yellow-400 text-sm font-display font-semibold mb-2">{t('starBuilder.areasToStrengthen')}</div>
            {viewingStory.weaknesses.map((weakness, index) => <p key={index} className="text-slate-400 text-xs">- {weakness}</p>)}
          </div>
        )}

        {(viewingStory.suggestedTags?.length > 0 || viewingStory.targetQuestions?.length > 0) && (
          <div className="card">
            {viewingStory.suggestedTags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">{viewingStory.suggestedTags.map((tag, index) => <span key={index} className="badge-indigo"><Tag size={10}/> {tag}</span>)}</div>
            )}
            {viewingStory.targetQuestions?.length > 0 && (
              <>
                <div className="text-slate-400 text-xs mb-1">{t('starBuilder.answersQuestionsLike')}</div>
                {viewingStory.targetQuestions.map((question, index) => <p key={index} className="text-slate-300 text-xs">- {question}</p>)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (view === 'build') return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={() => setView('bank')} className="btn-ghost mb-4"><ArrowLeft size={16} /> {t('starBuilder.storyBank')}</button>
      <h2 className="section-title mb-1">{t('starBuilder.builderTitle')}</h2>
      <p className="section-sub mb-5">{t('starBuilder.builderSubtitle')}</p>

      <div className="mb-4">
        <label className="text-sm text-slate-400 mb-1.5 block">{t('starBuilder.describeSituationLabel')}</label>
        <textarea
          className="textarea-field h-32"
          placeholder={t('starBuilder.describeSituationPlaceholder')}
          value={situation}
          onChange={event => setSituation(event.target.value)}
        />
      </div>

      <button onClick={buildStar} disabled={loading || !isConnected || !situation.trim()} className="btn-primary mb-5">
        <Wand2 size={16} /> {loading ? t('starBuilder.building') : t('starBuilder.buildStarAnswer')}
      </button>

      {result && (
        <div className="space-y-4 animate-in">
          <div className="card border-teal-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-white">{t('starBuilder.interviewReadyAnswer')}</h3>
              <button onClick={() => copyText(result.fullAnswer)} className="btn-ghost text-xs"><Copy size={13} /> {t('starBuilder.copy')}</button>
            </div>
            <p className="text-slate-200 text-sm font-body leading-relaxed">{result.fullAnswer}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {starSections.map(([letter, label, field, color]) => (
              <div key={label} className="card">
                <div className={`w-7 h-7 rounded-lg mb-2 flex items-center justify-center font-display font-bold text-sm ${color === 'teal' ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{letter}</div>
                <div className="text-slate-400 text-xs mb-1">{label}</div>
                <p className="text-slate-200 text-sm">{result[field]}</p>
              </div>
            ))}
          </div>

          {result.weaknesses?.length > 0 && (
            <div className="card border-yellow-500/20 bg-yellow-500/5">
              <div className="text-yellow-400 text-sm font-display font-semibold mb-2">{t('starBuilder.areasToStrengthen')}</div>
              {result.weaknesses.map((weakness, index) => <p key={index} className="text-slate-400 text-xs">- {weakness}</p>)}
            </div>
          )}

          <div className="card">
            <div className="flex flex-wrap gap-2 mb-2">{result.suggestedTags?.map((tag, index) => <span key={index} className="badge-indigo"><Tag size={10}/> {tag}</span>)}</div>
            <div className="text-slate-400 text-xs mb-1">{t('starBuilder.answersQuestionsLike')}</div>
            {result.targetQuestions?.map((question, index) => <p key={index} className="text-slate-300 text-xs">- {question}</p>)}
          </div>

          <button onClick={saveStory} className="btn-primary w-full justify-center"><Star size={16}/> {t('starBuilder.saveToStoryBank')}</button>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      {onBack && (
        <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16} /> {backLabel || t('starBuilder.back')}</button>
      )}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">{t('starBuilder.storyBank')}</h2>
          <p className="section-sub">{t('starBuilder.storiesInProject', { count: stories.length })}</p>
        </div>
        <button onClick={() => setView('build')} className="btn-primary"><Plus size={16}/> {t('starBuilder.newStory')}</button>
      </div>

      {stories.length > 0 && (
        <input className="input-field mb-4" placeholder={t('starBuilder.filterPlaceholder')} value={filter} onChange={event => setFilter(event.target.value)} />
      )}

      {stories.length === 0 ? (
        <div className="card text-center py-10">
          <Star size={32} className="text-slate-600 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm mb-4">{t('starBuilder.noStoriesYet')}</p>
          <button onClick={() => setView('build')} className="btn-primary mx-auto">{t('starBuilder.buildFirstStory')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(story => (
            <div key={story.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h3 className="text-white text-sm font-body font-medium">{story.situation || t('starBuilder.storyFallback')}</h3>
                  <div className="text-slate-500 text-xs mt-0.5">{new Date(story.date).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setViewingStory(story); setView('detail') }} className="btn-ghost text-xs p-1.5" title={t('starBuilder.viewFullAnalysis')}><Eye size={13}/></button>
                  <button onClick={() => startEdit(story)} className="btn-ghost text-xs p-1.5" title={t('starBuilder.editAnswer')}><Edit3 size={13}/></button>
                  <button onClick={() => copyText(story.fullAnswer)} className="btn-ghost text-xs p-1.5" title={t('starBuilder.copyToClipboard')}><Copy size={13}/></button>
                  <button onClick={() => deleteStory(story.id)} className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-300" title={t('starBuilder.delete')}><Trash2 size={13}/></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">{story.suggestedTags?.map((tag, index) => <span key={index} className="badge-indigo text-xs">{tag}</span>)}</div>
              {editingId === story.id ? (
                <div>
                  <textarea className="textarea-field h-32 mb-2 text-xs" value={editContent} onChange={event => setEditContent(event.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(story.id)} className="btn-primary text-xs py-1"><Check size={13}/> {t('common.save')}</button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost text-xs py-1">{t('common.cancel')}</button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-xs line-clamp-2">{story.fullAnswer}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
