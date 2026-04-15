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

function matchesApplicationEntry(app, entry) {
  if (!app || !entry) return false
  const appLabel = applicationLabel(app)

  if (entry.applicationId && entry.applicationId === app.id) return true
  if (entry.applicationLabel && entry.applicationLabel === appLabel) return true

  const entryJd = (entry.jdSnippet || entry.inputs?.jd || '').trim()
  const currentJd = (app.jdText || '').trim()
  if (entryJd && currentJd) {
    return currentJd.startsWith(entryJd) || entryJd.startsWith(currentJd.slice(0, Math.min(currentJd.length, entryJd.length)))
  }

  return false
}

function ActionCard({ title, desc, cta, onClick, icon: Icon, tone = 'teal', badge = null }) {
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
          {badge && (
            <div className="text-slate-400 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">
              {badge}
            </div>
          )}
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

function MetricCard({ label, value, hint, tone = 'slate' }) {
  const valueClass = tone === 'yellow'
    ? 'text-yellow-300'
    : tone === 'indigo'
      ? 'text-indigo-300'
      : tone === 'teal'
        ? 'text-teal-300'
        : 'text-white'

  return (
    <div className="rounded-2xl border border-navy-600 bg-navy-950/60 px-4 py-3">
      <div className="text-slate-500 text-[11px] font-display font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-display font-semibold ${valueClass}`}>{value}</div>
      <div className="text-slate-400 text-xs mt-1">{hint}</div>
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
  const gapResults = getProjectData('gapResults') || []
  const starStories = getProjectData('starStories') || []

  const suggestedFocus = !activeApplication && applications.length > 0
    ? [...applications].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null
  const focusApplication = activeApplication || suggestedFocus || null
  const focusNotes = focusApplication ? companyNotes[focusApplication.id] || {} : {}
  const focusHasJd = !!focusApplication?.jdText?.trim()
  const focusHasResearch = hasResearchData(focusNotes)
  const focusHasPrep = hasPrepNotes(focusNotes)
  const focusGapResults = focusApplication ? gapResults.filter(entry => matchesApplicationEntry(focusApplication, entry)) : []
  const focusStarStories = focusApplication ? starStories.filter(entry => matchesApplicationEntry(focusApplication, entry)) : []
  const focusInterviewSessions = focusApplication ? interviewSessions.filter(entry => matchesApplicationEntry(focusApplication, entry)) : []
  const focusPredictorRuns = focusApplication ? toolsHistory.filter(entry => entry.tool === 'predictor' && matchesApplicationEntry(focusApplication, entry)) : []
  const focusFollowupRuns = focusApplication ? toolsHistory.filter(entry => entry.tool === 'followup' && matchesApplicationEntry(focusApplication, entry)) : []
  const focusTailorRuns = focusApplication
    ? toolsHistory.filter(entry => ['coverletter', 'resumechecker', 'transferable'].includes(entry.tool) && matchesApplicationEntry(focusApplication, entry))
    : []
  const dueTopics = topics.filter(topic => isDueToday(topic.nextReview) && topic.status === 'In Progress')
  const overdueApps = getOverdueApps(applications)
  const focusOverdue = focusApplication ? overdueApps.find(app => app.id === focusApplication.id) : null

  const focusSteps = focusApplication ? [
    {
      id: 'capture',
      title: 'Capture Job',
      state: focusHasJd ? 'complete' : 'ready',
      desc: focusHasJd
        ? 'The JD is saved and powering the rest of the application workflow.'
        : 'Paste the JD once so research, prediction, and interviews stay aligned.',
      cta: focusHasJd ? 'Review Capture' : 'Add JD',
      onClick: () => openTrackerApplication(focusApplication.id, 'jd'),
      icon: ClipboardCheck,
      tone: focusHasJd ? 'teal' : 'yellow',
    },
    {
      id: 'research',
      title: 'Research Company',
      state: focusHasResearch ? 'complete' : 'ready',
      desc: focusHasResearch
        ? 'Company context is saved and ready to reuse across the workspace.'
        : 'Add wow facts, culture signals, and open questions before practicing.',
      cta: focusHasResearch ? 'Review Research' : 'Open Research',
      onClick: () => openTrackerApplication(focusApplication.id, 'research'),
      icon: Search,
      tone: focusHasResearch ? 'indigo' : 'indigo',
    },
    {
      id: 'tailor',
      title: 'Tailor Story',
      state: focusGapResults.length > 0 || focusStarStories.length > 0 || focusTailorRuns.length > 0
        ? 'complete'
        : focusHasPrep
          ? 'in-progress'
          : focusHasJd || focusHasResearch
            ? 'ready'
            : 'blocked',
      desc: focusGapResults.length > 0 || focusStarStories.length > 0 || focusTailorRuns.length > 0
        ? 'You already have saved tailoring work for this role.'
        : 'Use gap analysis and STAR stories to make your answers sound role-specific.',
      cta: 'Open Gap Analysis',
      onClick: () => launchTool(SECTIONS.TOOLS, 'gap'),
      icon: Sparkles,
      tone: 'teal',
    },
    {
      id: 'predict',
      title: 'Predict Questions',
      state: focusPredictorRuns.length > 0 ? 'complete' : focusHasJd ? 'ready' : 'blocked',
      desc: focusPredictorRuns.length > 0
        ? 'A question set is already saved for this role.'
        : 'Generate likely interview questions from the saved JD.',
      cta: focusHasJd ? 'Open Predictor' : 'Add JD First',
      onClick: () => focusHasJd ? launchTool(SECTIONS.INTERVIEW, 'predictor') : openTrackerApplication(focusApplication.id, 'jd'),
      icon: Target,
      tone: 'indigo',
    },
    {
      id: 'mock',
      title: 'Mock Interview',
      state: focusInterviewSessions.length > 0 ? 'complete' : focusHasJd ? 'ready' : 'blocked',
      desc: focusInterviewSessions.length > 0
        ? 'You already have a saved mock interview for this role.'
        : 'Run a role-specific practice interview and save the session.',
      cta: focusHasJd ? 'Start Mock Interview' : 'Add JD First',
      onClick: () => focusHasJd ? launchTool(SECTIONS.INTERVIEW, 'interview') : openTrackerApplication(focusApplication.id, 'jd'),
      icon: Mic,
      tone: 'teal',
    },
    {
      id: 'followup',
      title: 'Follow-up',
      state: focusFollowupRuns.length > 0 ? 'complete' : 'ready',
      desc: focusFollowupRuns.length > 0
        ? 'A follow-up draft is already saved for this application.'
        : 'Draft the follow-up while the interview context is still fresh.',
      cta: 'Draft Follow-up',
      onClick: () => launchTool(SECTIONS.INTERVIEW, 'followup'),
      icon: Mail,
      tone: 'yellow',
    },
  ] : []

  const completedFocusSteps = focusSteps.filter(step => step.state === 'complete').length
  const nextFocusStep = focusSteps.find(step => step.state !== 'complete') || null

  const recentItems = [
    ...interviewSessions.map(session => ({
      id: session.id,
      date: session.date,
      title: session.mode || 'Interview session',
      subtitle: `${session.applicationLabel || 'Saved in this project'}${session.score != null ? ` - ${session.score}/10` : ''}`,
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

  const heroTitle = focusApplication
    ? applicationLabel(focusApplication)
    : 'Start your first application'

  let heroCopy = 'Use Today to keep the right application moving without bouncing between tools.'
  if (!focusApplication) {
    heroCopy = 'Add a company and role first. JobSensei will turn it into one guided workspace with research, story prep, practice, and follow-up.'
  } else if (!activeApplication && suggestedFocus) {
    heroCopy = `No application is active right now, so Today is recommending ${applicationLabel(suggestedFocus)} as your next focus.`
  } else if (nextFocusStep) {
    heroCopy = `Next up: ${nextFocusStep.title}. ${nextFocusStep.desc}`
  } else {
    heroCopy = 'Your core workflow is complete for this application. Keep practicing, following up, or refining advanced tools.'
  }

  const primaryAction = focusApplication
    ? {
        label: nextFocusStep ? `Continue ${nextFocusStep.title}` : 'Open Workspace',
        onClick: nextFocusStep ? nextFocusStep.onClick : () => openTrackerApplication(focusApplication.id, 'overview'),
      }
    : {
        label: 'Open Applications',
        onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      }

  const actionCards = []

  if (!focusApplication) {
    actionCards.push({
      title: 'Add Your First Application',
      desc: 'Start in Applications, add a company and role, then create your first workspace.',
      cta: 'Open Applications',
      onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      icon: Briefcase,
      tone: 'teal',
      badge: 'Get started',
    })
  } else {
    actionCards.push({
      title: nextFocusStep ? `Next Step: ${nextFocusStep.title}` : 'Application Workflow Complete',
      desc: nextFocusStep
        ? nextFocusStep.desc
        : 'The core workflow is in place. Open the workspace to review, practice, or use advanced tools.',
      cta: nextFocusStep ? nextFocusStep.cta : 'Open Workspace',
      onClick: nextFocusStep ? nextFocusStep.onClick : () => openTrackerApplication(focusApplication.id, 'overview'),
      icon: nextFocusStep?.icon || Sparkles,
      tone: nextFocusStep?.tone || 'teal',
      badge: `${completedFocusSteps}/6 steps complete`,
    })

    if (focusOverdue) {
      actionCards.push({
        title: 'Follow-Up Due',
        desc: `${applicationLabel(focusOverdue)} has been waiting ${timeAgo(focusOverdue.stageUpdatedAt || focusOverdue.date)}. Draft the next message while the thread is still alive.`,
        cta: 'Draft Follow-Up',
        onClick: () => launchTool(SECTIONS.INTERVIEW, 'followup'),
        icon: Mail,
        tone: 'yellow',
        badge: focusOverdue.stage,
      })
    } else if (focusHasJd && focusInterviewSessions.length === 0) {
      actionCards.push({
        title: 'Run A Mock Interview',
        desc: 'Practice with the active application context and save your first scored session.',
        cta: 'Start Mock Interview',
        onClick: () => launchTool(SECTIONS.INTERVIEW, 'interview'),
        icon: Mic,
        tone: 'teal',
        badge: 'Practice',
      })
    } else if (focusHasJd && focusPredictorRuns.length === 0) {
      actionCards.push({
        title: 'Predict Likely Questions',
        desc: 'Generate likely interview questions from this role before your next practice run.',
        cta: 'Open Predictor',
        onClick: () => launchTool(SECTIONS.INTERVIEW, 'predictor'),
        icon: Target,
        tone: 'indigo',
        badge: 'Interview prep',
      })
    }
  }

  if (dueTopics.length > 0) {
    actionCards.push({
      title: 'Reviews Due',
      desc: `${dueTopics.length} learning review${dueTopics.length === 1 ? '' : 's'} are due today. Keep your prep sharp while applications are moving.`,
      cta: 'Open Review',
      onClick: () => openLearningTopic(dueTopics[0].id, 'quiz'),
      icon: BookOpen,
      tone: 'indigo',
      badge: 'Learning',
    })
  } else if (overdueApps.length > 0 && !focusOverdue) {
    const nextFollowUp = overdueApps[0]
    actionCards.push({
      title: 'Another Follow-Up Is Waiting',
      desc: `${applicationLabel(nextFollowUp)} needs attention ${timeAgo(nextFollowUp.stageUpdatedAt || nextFollowUp.date)} after the last stage change.`,
      cta: 'Open Application',
      onClick: () => openTrackerApplication(nextFollowUp.id, 'overview'),
      icon: Mail,
      tone: 'yellow',
      badge: 'Needs follow-up',
    })
  } else if (applications.length > 1) {
    actionCards.push({
      title: 'Review Your Pipeline',
      desc: `${applications.length} applications are in play. Use Applications to switch focus, update stages, or catch stalled roles.`,
      cta: 'Open Applications',
      onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      icon: Briefcase,
      tone: 'teal',
      badge: 'Pipeline',
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">{profile?.name ? `Today, ${profile.name}` : 'Today'}</h2>
          <p className="section-sub">One place to see the next real move in your job search.</p>
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
            {focusApplication && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300">
                  {focusApplication.stage}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                  {completedFocusSteps}/6 steps complete
                </span>
                {!activeApplication && suggestedFocus && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Suggested focus
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-[11px] border ${focusHasJd ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                  {focusHasJd ? 'JD ready' : 'Needs JD'}
                </span>
                {focusHasResearch && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Research
                  </span>
                )}
                {focusHasPrep && (
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

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          <MetricCard
            label="Workspace Progress"
            value={focusApplication ? `${completedFocusSteps}/6` : '0/6'}
            hint={focusApplication ? (nextFocusStep ? `Next: ${nextFocusStep.title}` : 'Core flow complete') : 'Pick an application to begin'}
            tone="teal"
          />
          <MetricCard
            label="Applications"
            value={applications.length}
            hint={applications.length === 1 ? 'One role in play' : 'Roles currently in play'}
            tone="indigo"
          />
          <MetricCard
            label="Follow-Ups"
            value={overdueApps.length}
            hint={overdueApps.length > 0 ? 'Applications waiting on a follow-up' : 'No follow-up pressure today'}
            tone={overdueApps.length > 0 ? 'yellow' : 'slate'}
          />
          <MetricCard
            label="Reviews Due"
            value={dueTopics.length}
            hint={dueTopics.length > 0 ? 'Learning reviews due today' : 'No reviews due right now'}
            tone={dueTopics.length > 0 ? 'indigo' : 'slate'}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="font-display font-semibold text-white text-base">Recommended Next Actions</h3>
            <p className="text-slate-400 text-sm">Shortcuts based on your active workflow, due reviews, and follow-up pressure.</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {actionCards.slice(0, 3).map(card => (
            <ActionCard key={`${card.title}-${card.badge || 'default'}`} {...card} />
          ))}
        </div>
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
              <p className="text-slate-400 text-sm">
                No learning reviews are due right now. {nextFocusStep ? `A good next move is ${nextFocusStep.title.toLowerCase()}.` : 'Use the extra time to keep your active applications moving.'}
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white text-base">Recent Activity</h3>
            {focusApplication && (
              <button onClick={() => openTrackerApplication(focusApplication.id, 'overview')} className="btn-ghost text-xs">
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
              <p className="text-slate-400 text-sm">No saved activity yet. Create one application and JobSensei will start building a visible prep trail here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
