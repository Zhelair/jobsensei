import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { isDueToday } from '../../utils/spacedRepetition'
import { timeAgo } from '../../utils/helpers'
import {
  ArrowRight, BookOpen, Briefcase, ClipboardCheck,
  FolderOpen, Mail, Mic, Search, Sparkles, Target,
} from 'lucide-react'

const FOLLOWUP_DAYS = { Applied: 7, Screening: 5, Interviewing: 3, Awaiting: 5 }

function hasResearchData(noteData = {}) {
  return ['wowFacts', 'techStack', 'culture', 'openQ'].some(key => (noteData[key] || '').trim())
}

function hasPrepNotes(noteData = {}) {
  return ['prepNotes', 'people', 'theyMentioned'].some(key => (noteData[key] || '').trim())
}

function getOverdueApps(apps) {
  const now = new Date()
  return apps.filter(app => {
    const days = FOLLOWUP_DAYS[app.stage]
    if (!days) return false
    if (app.followupSnoozedUntil && new Date(app.followupSnoozedUntil) > now) return false
    const since = new Date(app.stageUpdatedAt || app.date)
    return (now - since) / (1000 * 60 * 60 * 24) >= days
  })
}

function applicationLabel(app) {
  return `${app.company}${app.role ? ` - ${app.role}` : ''}`
}

function ActionCard({ title, desc, cta, onClick, icon: Icon, tone = 'teal' }) {
  const toneClasses = tone === 'yellow'
    ? 'border-yellow-500/20 bg-yellow-500/5'
    : tone === 'indigo'
      ? 'border-indigo-500/20 bg-indigo-500/5'
      : 'border-teal-500/20 bg-teal-500/5'
  const iconClasses = tone === 'yellow'
    ? 'bg-yellow-500/15 text-yellow-300'
    : tone === 'indigo'
      ? 'bg-indigo-500/15 text-indigo-300'
      : 'bg-teal-500/15 text-teal-300'

  return (
    <div className={`card ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClasses}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white text-sm font-display font-semibold mb-1">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">{desc}</p>
          <button onClick={onClick} className="btn-ghost text-xs">
            {cta} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TodayPage() {
  const { profile, launchTool, openLearningTopic, openTrackerApplication, setActiveSection } = useApp()
  const { activeProject, activeApplication, getProjectData } = useProject()

  const applications = getProjectData('applications') || []
  const companyNotes = getProjectData('companyNotes') || {}
  const interviewSessions = getProjectData('interviewSessions') || []
  const toolsHistory = getProjectData('toolsHistory') || []
  const topics = getProjectData('topics') || []

  const activeNotes = activeApplication ? companyNotes[activeApplication.id] || {} : {}
  const hasJd = !!activeApplication?.jdText?.trim()
  const hasResearch = hasResearchData(activeNotes)
  const hasPrep = hasPrepNotes(activeNotes)
  const dueTopics = topics.filter(topic => isDueToday(topic.nextReview) && topic.status === 'In Progress')
  const overdueApps = getOverdueApps(applications)

  const recentItems = [
    ...interviewSessions.map(session => ({
      id: session.id,
      date: session.date,
      title: session.mode || 'Interview session',
      subtitle: session.score != null ? `${session.score}/10 score` : 'Mock interview saved',
    })),
    ...toolsHistory.map(item => ({
      id: item.id,
      date: item.date,
      title: item.toolLabel || 'Prep tool',
      subtitle: item.applicationLabel || 'Saved to this project',
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const heroTitle = activeApplication
    ? applicationLabel(activeApplication)
    : applications.length > 0
      ? 'Choose an application to continue'
      : 'Start your first application'

  let heroCopy = 'Keep your search moving with one clear next step.'
  if (!activeApplication && applications.length === 0) {
    heroCopy = 'Add a role, save the JD once, and JobSensei will turn it into a guided prep workspace.'
  } else if (!activeApplication) {
    heroCopy = 'Open Applications and set one role active so Today can guide the rest of your workflow.'
  } else if (!hasJd) {
    heroCopy = 'Capture the JD first. That unlocks better research, better question prediction, and better mock interviews.'
  } else if (!hasResearch) {
    heroCopy = 'Research is the next leverage point. Save company context once, then reuse it across the whole prep flow.'
  } else if (!hasPrep) {
    heroCopy = 'Your context is ready. Tailor your story next so your answers sound role-specific instead of generic.'
  } else {
    heroCopy = 'Your workspace is in good shape. Practice, predict likely questions, and ship the strongest follow-up.'
  }

  const primaryAction = !activeApplication
    ? {
        label: applications.length > 0 ? 'Open Applications' : 'Add Application',
        onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      }
    : {
        label: 'Open Workspace',
        onClick: () => openTrackerApplication(activeApplication.id, 'overview'),
      }

  const actionCards = []

  if (!activeApplication) {
    actionCards.push({
      title: applications.length > 0 ? 'Choose Your Focus' : 'Add Your First Application',
      desc: applications.length > 0
        ? 'Pick one role as the active application so Today can guide the next steps.'
        : 'Start in Applications, add a company and role, then save the JD once.',
      cta: 'Open Applications',
      onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      icon: Briefcase,
      tone: 'teal',
    })
  } else if (!hasJd) {
    actionCards.push({
      title: 'Capture Job Details',
      desc: 'Paste the job description once so the rest of the workflow can use the same context.',
      cta: 'Open Capture',
      onClick: () => openTrackerApplication(activeApplication.id, 'jd'),
      icon: ClipboardCheck,
      tone: 'yellow',
    })
  } else if (!hasResearch) {
    actionCards.push({
      title: 'Research Company',
      desc: 'Fill company context, wow facts, culture signals, and open questions before interview prep.',
      cta: 'Open Research',
      onClick: () => openTrackerApplication(activeApplication.id, 'research'),
      icon: Search,
      tone: 'indigo',
    })
  } else {
    actionCards.push({
      title: 'Tailor Your Story',
      desc: 'Use the active application to run gap analysis and shape stronger, role-specific stories.',
      cta: 'Open Gap Analysis',
      onClick: () => launchTool(SECTIONS.TOOLS, 'gap'),
      icon: Sparkles,
      tone: 'teal',
    })
  }

  if (activeApplication) {
    actionCards.push({
      title: 'Run A Mock Interview',
      desc: 'Practice with the active application context and save a scored session to your history.',
      cta: 'Start Mock Interview',
      onClick: () => launchTool(SECTIONS.INTERVIEW, 'interview'),
      icon: Mic,
      tone: 'teal',
    })
  }

  if (overdueApps.length > 0) {
    const nextFollowUp = overdueApps[0]
    actionCards.push({
      title: 'Follow-Up Due',
      desc: `${applicationLabel(nextFollowUp)} has been waiting ${timeAgo(nextFollowUp.stageUpdatedAt || nextFollowUp.date)}. Open the workspace and send the next message.`,
      cta: 'Open Due Application',
      onClick: () => openTrackerApplication(nextFollowUp.id, 'overview'),
      icon: Mail,
      tone: 'yellow',
    })
  } else if (dueTopics.length > 0) {
    actionCards.push({
      title: 'Reviews Due',
      desc: `${dueTopics.length} learning review${dueTopics.length === 1 ? '' : 's'} are due today. Keep your prep sharp while roles are in motion.`,
      cta: 'Open Review',
      onClick: () => openLearningTopic(dueTopics[0].id, 'quiz'),
      icon: BookOpen,
      tone: 'indigo',
    })
  } else if (activeApplication && hasJd) {
    actionCards.push({
      title: 'Predict Likely Questions',
      desc: 'Generate likely interview questions from the active role before your next practice run.',
      cta: 'Open Predictor',
      onClick: () => launchTool(SECTIONS.INTERVIEW, 'predictor'),
      icon: Target,
      tone: 'indigo',
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">{profile?.name ? `Today, ${profile.name}` : 'Today'}</h2>
          <p className="section-sub">One place to see what matters next in your search.</p>
        </div>
        {activeProject && (
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
            <FolderOpen size={14} className="text-teal-400" />
            <span className="text-teal-300 text-xs font-body font-medium">{activeProject.name}</span>
          </div>
        )}
      </div>

      <div className="card border-teal-500/20 bg-teal-500/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 max-w-3xl">
            <div className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wide mb-2">Active Focus</div>
            <h3 className="font-display font-semibold text-white text-xl mb-2">{heroTitle}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{heroCopy}</p>
            {activeApplication && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300">
                  {activeApplication.stage}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] border ${hasJd ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                  {hasJd ? 'JD ready' : 'Needs JD'}
                </span>
                {hasResearch && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Research
                  </span>
                )}
                {hasPrep && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                    Notes
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={primaryAction.onClick} className="btn-primary text-sm">
              {primaryAction.label}
            </button>
            <button onClick={() => setActiveSection(SECTIONS.APPLICATIONS)} className="btn-ghost text-sm">
              Applications
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {actionCards.map(card => (
          <ActionCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white text-base">Reviews Due</h3>
            {dueTopics.length > 0 && (
              <button onClick={() => openLearningTopic(dueTopics[0].id, 'quiz')} className="btn-ghost text-xs">
                Open Learn
              </button>
            )}
          </div>

          {dueTopics.length > 0 ? (
            <div className="space-y-2">
              {dueTopics.slice(0, 4).map(topic => (
                <button
                  key={topic.id}
                  onClick={() => openLearningTopic(topic.id, 'quiz')}
                  className="w-full rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-3 text-left hover:bg-yellow-500/10 transition-colors"
                >
                  <div className="text-yellow-300 text-xs font-display font-semibold mb-1">Due today</div>
                  <div className="text-white text-sm">{topic.title}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-navy-600 bg-navy-900/60 px-4 py-5">
              <p className="text-slate-400 text-sm">No learning reviews are due right now. Good time to keep momentum on your active application.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white text-base">Recent Activity</h3>
            {activeApplication && (
              <button onClick={() => openTrackerApplication(activeApplication.id, 'overview')} className="btn-ghost text-xs">
                Open Workspace
              </button>
            )}
          </div>

          {recentItems.length > 0 ? (
            <div className="space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="rounded-xl border border-navy-600 bg-navy-900/60 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-body font-medium truncate">{item.title}</div>
                      <div className="text-slate-400 text-xs truncate mt-1">{item.subtitle}</div>
                    </div>
                    <span className="text-slate-500 text-xs flex-shrink-0">{timeAgo(item.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-navy-600 bg-navy-900/60 px-4 py-5">
              <p className="text-slate-400 text-sm">No recent saved activity yet. Start with one application and the workspace will begin building your history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
