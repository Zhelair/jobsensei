import React, { useEffect, useState } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { prompts } from '../../utils/prompts'
import { Mic, Search, BookOpen, Plus, TrendingUp, Award, Target, Flame, Sparkles } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { isDueToday } from '../../utils/spacedRepetition'

export default function Dashboard() {
  const { setActiveSection, profile, stats, drillMode } = useApp()
  const { callAI, isConnected } = useAI()
  const [tip, setTip] = useState('')
  const [loadingTip, setLoadingTip] = useState(false)
  const [sessions] = useLocalStorage('js_interview_sessions', [])
  const [topics] = useLocalStorage('js_topics', [])
  const [applications] = useLocalStorage('js_applications', [])

  const dueTopics = topics.filter(t => isDueToday(t.nextReview) && t.status === 'In Progress').length
  const completedTopics = topics.filter(t => t.status === 'Completed').length
  const activeApps = applications.filter(a => !['Offer', 'Rejected'].includes(a.stage)).length

  useEffect(() => {
    if (isConnected && !tip) fetchTip()
  }, [isConnected])

  async function fetchTip() {
    setLoadingTip(true)
    try {
      const t = await callAI({
        systemPrompt: prompts.senseiTip(profile, stats),
        messages: [{ role: 'user', content: 'Give me my daily tip.' }],
        temperature: 0.8,
      })
      setTip(t)
    } catch {}
    setLoadingTip(false)
  }

  const statCards = [
    { label: 'Mock Interviews', value: sessions.length, icon: Mic, color: 'teal' },
    { label: 'Avg Score', value: sessions.length ? (sessions.reduce((a, s) => a + (s.score || 0), 0) / sessions.length).toFixed(1) + '/10' : '—', icon: TrendingUp, color: 'indigo' },
    { label: 'Topics Mastered', value: completedTopics, icon: Award, color: 'teal' },
    { label: 'Active Applications', value: activeApps, icon: Target, color: 'indigo' },
  ]

  const quickActions = [
    { label: 'Start Mock Interview', icon: Mic, section: SECTIONS.INTERVIEW, color: 'teal' },
    { label: 'Analyze a JD', icon: Search, section: SECTIONS.GAP, color: 'indigo' },
    { label: 'Study a Topic', icon: BookOpen, section: SECTIONS.LEARNING, color: 'teal' },
    { label: 'Add Application', icon: Plus, section: SECTIONS.TRACKER, color: 'indigo' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in">
      {/* Welcome */}
      <div>
        <h2 className="section-title">
          {profile?.name ? `Hey, ${profile.name} 👋` : 'Welcome back 👋'}
        </h2>
        <p className="section-sub">Here's your job hunt at a glance.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`w-9 h-9 rounded-xl mb-3 flex items-center justify-center ${color === 'teal' ? 'bg-teal-500/15' : 'bg-indigo-500/15'}`}>
              <Icon size={18} className={color === 'teal' ? 'text-teal-400' : 'text-indigo-400'} />
            </div>
            <div className="font-display font-bold text-2xl text-white">{value}</div>
            <div className="text-slate-400 text-xs mt-0.5 font-body">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, section, color }) => (
              <button
                key={label}
                onClick={() => setActiveSection(section)}
                className={`flex flex-col items-start gap-2 p-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] text-left ${
                  color === 'teal'
                    ? 'bg-teal-500/5 border-teal-500/20 hover:bg-teal-500/10'
                    : 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10'
                }`}
              >
                <Icon size={18} className={color === 'teal' ? 'text-teal-400' : 'text-indigo-400'} />
                <span className="text-white text-xs font-body font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sensei Tip */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-teal-400" />
              Sensei Tip
            </h3>
            <button onClick={fetchTip} disabled={loadingTip} className="text-xs text-slate-400 hover:text-teal-400 transition-colors">
              {loadingTip ? '...' : 'New tip'}
            </button>
          </div>
          {loadingTip ? (
            <div className="space-y-2">
              <div className="h-3 bg-navy-700 rounded animate-pulse" />
              <div className="h-3 bg-navy-700 rounded animate-pulse w-3/4" />
            </div>
          ) : tip ? (
            <p className="text-slate-300 text-sm font-body leading-relaxed">{tip}</p>
          ) : (
            <p className="text-slate-500 text-sm italic">
              {isConnected ? 'Loading your daily tip...' : 'Connect your AI in Settings to get personalized tips.'}
            </p>
          )}
        </div>
      </div>

      {/* Due Today */}
      {(dueTopics > 0 || sessions.length > 0) && (
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
            <Flame size={16} className="text-orange-400" />
            Due Today
          </h3>
          <div className="flex flex-wrap gap-2">
            {dueTopics > 0 && (
              <button
                onClick={() => setActiveSection(SECTIONS.LEARNING)}
                className="badge-yellow cursor-pointer hover:opacity-80 transition-opacity"
              >
                📚 {dueTopics} review{dueTopics > 1 ? 's' : ''} due
              </button>
            )}
            {sessions.length > 0 && (
              <button
                onClick={() => setActiveSection(SECTIONS.INTERVIEW)}
                className="badge-teal cursor-pointer hover:opacity-80 transition-opacity"
              >
                🎤 Keep practicing interviews
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-3">Recent Mock Interviews</h3>
          <div className="space-y-2">
            {sessions.slice(-3).reverse().map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-navy-700 last:border-0">
                <div>
                  <span className="text-white text-sm font-body">{s.mode} Interview</span>
                  <span className="text-slate-500 text-xs ml-2">{new Date(s.date).toLocaleDateString()}</span>
                </div>
                <span className={`font-display font-bold text-sm ${s.score >= 8 ? 'text-green-400' : s.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {s.score ? `${s.score}/10` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
