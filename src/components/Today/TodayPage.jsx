import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { isDueToday } from '../../utils/spacedRepetition'
import { timeAgo } from '../../utils/helpers'
import {
  ArrowRight, BookOpen, Briefcase, ClipboardCheck,
  FolderOpen, Mail, Mic, Search, Sparkles, Target,
} from 'lucide-react'

function hasResearchData(noteData = {}) {
  return ['wowFacts', 'techStack', 'culture', 'openQ'].some(key => (noteData[key] || '').trim())
}

function hasPrepNotes(noteData = {}) {
  return ['prepNotes', 'people', 'theyMentioned'].some(key => (noteData[key] || '').trim())
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
  const { profile, launchTool, openTrackerApplication, setActiveSection } = useApp()
  const { activeProject, activeApplication, getProjectData, updateProjectDataMultiple } = useProject()

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

  function changeFocusApplication(nextId) {
    const nextApp = applications.find(app => app.id === nextId)
    updateProjectDataMultiple({
      activeApplicationId: nextId || null,
      currentJD: nextApp?.jdText || '',
    })
  }

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

  const actionCards = [
    {
      title: 'Interview Prep',
      desc: 'Practice interviews, predict likely questions, shape STAR stories, polish your tone, draft follow-ups, and prepare your elevator pitch.',
      cta: 'Open Interview Prep',
      onClick: () => setActiveSection(SECTIONS.INTERVIEW),
      icon: Mic,
      tone: 'teal',
      badge: 'Prepare',
    },
    {
      title: 'Prep Tools',
      desc: 'Run gap analysis, check your resume, improve cover letters, audit LinkedIn, review visual design, and reframe transferable skills.',
      cta: 'Open Prep Tools',
      onClick: () => setActiveSection(SECTIONS.TOOLS),
      icon: Sparkles,
      tone: 'yellow',
      badge: 'Documents',
    },
  ]

  if (dueTopics.length > 0) {
    actionCards.push({
      title: 'Reviews Due',
      desc: `${dueTopics.length} learning review${dueTopics.length === 1 ? '' : 's'} are due today. Keep your prep sharp while applications are moving.`,
      cta: 'Open Learning',
      onClick: () => setActiveSection(SECTIONS.LEARNING),
      icon: BookOpen,
      tone: 'indigo',
      badge: 'Learning',
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

  const lastUsedTools = [
    ...toolsHistory.map(item => ({
      id: `tool-${item.id}`,
      title: item.toolLabel || 'Prep Tool',
      subtitle: item.applicationLabel || 'Saved to this project',
      date: item.date,
    })),
    ...interviewSessions.map(session => ({
      id: `interview-${session.id}`,
      title: 'Interview Simulator',
      subtitle: session.applicationLabel || session.mode || 'Saved mock interview',
      date: session.date,
    })),
    ...gapResults.map(result => ({
      id: `gap-${result.id}`,
      title: 'Gap Analysis',
      subtitle: result.applicationLabel || result.tab || 'Saved result',
      date: result.date,
    })),
    ...starStories.map(story => ({
      id: `star-${story.id}`,
      title: 'STAR Builder',
      subtitle: story.applicationLabel || story.situation || 'Saved story',
      date: story.date,
    })),
  ]
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)

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
            {applications.length > 0 && (
              <select
                className="input-field h-10 min-w-[220px] text-xs"
                value={focusApplication?.id || ''}
                onChange={e => changeFocusApplication(e.target.value)}
                aria-label="Change active application"
              >
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {applicationLabel(app)}
                  </option>
                ))}
              </select>
            )}
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
            label="Mock Interviews"
            value={focusApplication ? focusInterviewSessions.length : interviewSessions.length}
            hint={focusApplication ? 'Saved for this application' : 'Saved in this project'}
            tone="slate"
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
            <h3 className="font-display font-semibold text-white text-base">Prep Hubs</h3>
            <p className="text-slate-400 text-sm">Two clear places to continue: interview practice or document/profile prep.</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {actionCards.map(card => (
            <ActionCard key={`${card.title}-${card.badge || 'default'}`} {...card} />
          ))}
        </div>
      </div>

      {lastUsedTools.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="font-display font-semibold text-white text-base">Last Used</h3>
              <p className="text-slate-400 text-sm">Your three most recent tools, kept compact.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {lastUsedTools.map(item => (
              <div key={item.id} className="card-hover">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h4 className="text-white text-sm font-display font-semibold">{item.title}</h4>
                  <span className="text-slate-500 text-xs flex-shrink-0">{timeAgo(item.date)}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
