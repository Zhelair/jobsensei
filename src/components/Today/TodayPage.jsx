import React from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import { isDueToday } from '../../utils/spacedRepetition'
import {
  ArrowRight, BookOpen, Briefcase, ClipboardCheck,
  FolderOpen, Mail, Mic, Plus, Search, Sparkles, Target,
} from 'lucide-react'

const STAGE_LABEL_KEYS = {
  Researching: 'applications.stage.researching',
  Applied: 'applications.stage.applied',
  Screening: 'applications.stage.screening',
  Interviewing: 'applications.stage.interviewing',
  Awaiting: 'applications.stage.awaiting',
  Offer: 'applications.stage.offer',
  Rejected: 'applications.stage.rejected',
}

function hasResearchData(noteData = {}) {
  return ['wowFacts', 'techStack', 'culture', 'openQ'].some(key => (noteData[key] || '').trim())
}

function hasPrepNotes(noteData = {}) {
  return ['prepNotes', 'people', 'theyMentioned'].some(key => (noteData[key] || '').trim())
}

function applicationLabel(app) {
  return `${app.company}${app.role ? ` - ${app.role}` : ''}`
}

const INTERVIEW_TOOL_IDS = new Set(['interview', 'predictor', 'star', 'tone', 'followup', 'pitch'])

function sectionForTool(toolId) {
  return INTERVIEW_TOOL_IDS.has(toolId) ? SECTIONS.INTERVIEW : SECTIONS.TOOLS
}

function matchesApplicationEntry(app, entry) {
  if (!app || !entry) return false
  const appLabel = applicationLabel(app)

  if (entry.applicationId) return entry.applicationId === app.id
  if (entry.applicationLabel) return entry.applicationLabel === appLabel

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

function FirstApplicationPrompt({ onAddApplication }) {
  const { t } = useLanguage()

  return (
    <div className="card border-teal-500/25 bg-teal-500/5" data-guide="today-first-application">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-teal-300 text-[11px] font-display font-semibold uppercase tracking-wide mb-2">
            {t('today.firstStep')}
          </div>
          <h3 className="font-display font-semibold text-white text-lg mb-2">{t('today.firstStepTitle')}</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {t('today.firstStepCopy')}
          </p>
        </div>
        <button onClick={onAddApplication} className="btn-primary self-start lg:self-center">
          <Plus size={16} /> {t('gate.add')}
        </button>
      </div>
    </div>
  )
}

export default function TodayPage() {
  const { profile, launchTool, openTrackerApplication, setActiveSection, drillMode } = useApp()
  const { activeProject, activeApplication, getProjectData, updateProjectDataMultiple } = useProject()
  const { t } = useLanguage()
  const stageLabel = (stage) => t(STAGE_LABEL_KEYS[stage] || 'applications.stage.unknown', { stage })

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
  const contextFocusId = activeApplication?.id || suggestedFocus?.id || ''
  const [selectedFocusId, setSelectedFocusId] = React.useState(contextFocusId)

  React.useEffect(() => {
    setSelectedFocusId(contextFocusId)
  }, [contextFocusId])

  const focusApplication = applications.find(app => app.id === (selectedFocusId || contextFocusId)) || activeApplication || suggestedFocus || null
  const focusNotes = focusApplication ? companyNotes[focusApplication.id] || {} : {}
  const focusHasJd = !!focusApplication?.jdText?.trim()
  const focusHasResearch = hasResearchData(focusNotes)
  const focusHasPrep = hasPrepNotes(focusNotes)
  const focusGapResults = focusApplication ? gapResults.filter(entry => matchesApplicationEntry(focusApplication, entry)) : []
  const focusInterviewSessions = focusApplication ? interviewSessions.filter(entry => matchesApplicationEntry(focusApplication, entry)) : []
  const focusPredictorRuns = focusApplication ? toolsHistory.filter(entry => entry.tool === 'predictor' && matchesApplicationEntry(focusApplication, entry)) : []
  const focusFollowupRuns = focusApplication ? toolsHistory.filter(entry => entry.tool === 'followup' && matchesApplicationEntry(focusApplication, entry)) : []
  const focusTailorRuns = focusApplication
    ? toolsHistory.filter(entry => ['coverletter', 'resumechecker', 'transferable'].includes(entry.tool) && matchesApplicationEntry(focusApplication, entry))
    : []
  const allRecentPrepEntries = [
    ...toolsHistory.map(entry => ({
      ...entry,
      toolLabel: entry.toolLabel || t(`tools.toolLabels.${entry.tool}`),
    })),
    ...gapResults.map(entry => ({ ...entry, tool: 'gap', toolLabel: t('tools.toolLabels.gap') })),
    ...starStories.map(entry => ({ ...entry, tool: 'star', toolLabel: t('tools.toolLabels.star') })),
    ...interviewSessions.map(entry => ({ ...entry, tool: 'interview', toolLabel: t('tools.toolLabels.interview') })),
  ]
  const focusedRecentPrepEntries = focusApplication
    ? allRecentPrepEntries.filter(entry => matchesApplicationEntry(focusApplication, entry))
    : []
  const recentPrepEntries = (focusedRecentPrepEntries.length > 0 ? focusedRecentPrepEntries : allRecentPrepEntries)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
  const showingFocusedRecentPrep = focusedRecentPrepEntries.length > 0
  const dueTopics = topics.filter(topic => isDueToday(topic.nextReview) && topic.status === 'In Progress')
  const focusHasGap = focusGapResults.length > 0
  const focusHasTailorFollowOn = focusTailorRuns.length > 0
  const focusTailorComplete = focusHasGap && focusHasTailorFollowOn
  const focusTailorNeedsFollowOn = focusHasGap && !focusHasTailorFollowOn

  function openRecentPrepEntry(entry) {
    if (!entry?.tool) return
    launchTool(sectionForTool(entry.tool), entry.tool)
  }

  function changeFocusApplication(nextId) {
    const nextApp = applications.find(app => app.id === nextId)
    setSelectedFocusId(nextId)
    updateProjectDataMultiple({
      activeApplicationId: nextId || null,
      currentJD: nextApp?.jdText || '',
    })
  }

  const focusSteps = focusApplication ? [
    {
      id: 'capture',
      title: t('today.steps.capture.title'),
      state: focusHasJd ? 'complete' : 'ready',
      desc: focusHasJd
        ? t('today.steps.capture.done')
        : t('today.steps.capture.todo'),
      cta: focusHasJd ? t('today.steps.capture.review') : t('today.steps.capture.addJd'),
      onClick: () => openTrackerApplication(focusApplication.id, 'jd'),
      icon: ClipboardCheck,
      tone: focusHasJd ? 'teal' : 'yellow',
    },
    {
      id: 'research',
      title: t('today.steps.research.title'),
      state: focusHasResearch ? 'complete' : 'ready',
      desc: focusHasResearch
        ? t('today.steps.research.done')
        : t('today.steps.research.todo'),
      cta: focusHasResearch ? t('today.steps.research.review') : t('today.steps.research.open'),
      onClick: () => openTrackerApplication(focusApplication.id, 'research'),
      icon: Search,
      tone: focusHasResearch ? 'indigo' : 'indigo',
    },
    {
      id: 'tailor',
      title: t('today.steps.tailor.title'),
      state: focusTailorComplete
        ? 'complete'
        : focusTailorNeedsFollowOn || focusHasPrep
          ? 'in-progress'
          : focusHasJd || focusHasResearch
            ? 'ready'
            : 'blocked',
      desc: focusTailorComplete
        ? t('today.steps.tailor.done')
        : focusTailorNeedsFollowOn
          ? t('today.steps.tailor.todoAfterGap')
        : t('today.steps.tailor.todo'),
      cta: focusTailorNeedsFollowOn ? t('tools.toolLabels.resumechecker') : t('today.steps.tailor.openGap'),
      onClick: () => launchTool(SECTIONS.TOOLS, focusTailorNeedsFollowOn ? 'resumechecker' : 'gap'),
      icon: Sparkles,
      tone: 'teal',
    },
    {
      id: 'predict',
      title: t('today.steps.predict.title'),
      state: focusPredictorRuns.length > 0 ? 'complete' : focusHasJd ? 'ready' : 'blocked',
      desc: focusPredictorRuns.length > 0
        ? t('today.steps.predict.done')
        : t('today.steps.predict.todo'),
      cta: focusHasJd ? t('today.steps.predict.open') : t('today.steps.addJdFirst'),
      onClick: () => focusHasJd ? launchTool(SECTIONS.INTERVIEW, 'predictor') : openTrackerApplication(focusApplication.id, 'jd'),
      icon: Target,
      tone: 'indigo',
    },
    {
      id: 'mock',
      title: t('today.steps.mock.title'),
      state: focusInterviewSessions.length > 0 ? 'complete' : focusHasJd ? 'ready' : 'blocked',
      desc: focusInterviewSessions.length > 0
        ? t('today.steps.mock.done')
        : t('today.steps.mock.todo'),
      cta: focusHasJd ? t('today.steps.mock.start') : t('today.steps.addJdFirst'),
      onClick: () => focusHasJd ? launchTool(SECTIONS.INTERVIEW, 'interview') : openTrackerApplication(focusApplication.id, 'jd'),
      icon: Mic,
      tone: 'teal',
    },
    {
      id: 'followup',
      title: t('today.steps.followup.title'),
      state: focusFollowupRuns.length > 0 ? 'complete' : 'ready',
      desc: focusFollowupRuns.length > 0
        ? t('today.steps.followup.done')
        : t('today.steps.followup.todo'),
      cta: t('today.steps.followup.draft'),
      onClick: () => launchTool(SECTIONS.INTERVIEW, 'followup'),
      icon: Mail,
      tone: 'yellow',
    },
  ] : []

  const completedFocusSteps = focusSteps.filter(step => step.state === 'complete').length
  const nextFocusStep = focusSteps.find(step => step.state !== 'complete') || null

  const heroTitle = focusApplication
    ? applicationLabel(focusApplication)
    : t('today.startFirst')

  let heroCopy = t('today.hero.default')
  if (!focusApplication) {
    heroCopy = t('today.startCopy')
  } else if (!activeApplication && suggestedFocus) {
    heroCopy = t('today.hero.suggested', { application: applicationLabel(suggestedFocus) })
  } else if (nextFocusStep) {
    heroCopy = t('today.hero.next', { title: nextFocusStep.title, desc: nextFocusStep.desc })
  } else {
    heroCopy = t('today.hero.complete')
  }

  const primaryAction = focusApplication
    ? {
        label: nextFocusStep
          ? nextFocusStep.id === 'tailor' && focusTailorNeedsFollowOn
            ? t('tools.toolLabels.resumechecker')
            : t('today.continueStep', { title: nextFocusStep.title })
          : t('today.openWorkspace'),
        onClick: nextFocusStep ? nextFocusStep.onClick : () => openTrackerApplication(focusApplication.id, 'overview'),
      }
    : {
        label: t('today.openApplications'),
        onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      }

  const actionCards = [
    {
      id: 'interview',
      title: t('today.cards.interview.title'),
      desc: t('today.cards.interview.desc'),
      cta: t('today.cards.interview.cta'),
      onClick: () => setActiveSection(SECTIONS.INTERVIEW),
      icon: Mic,
      tone: 'teal',
      badge: t('today.cards.interview.badge'),
    },
    {
      id: 'tools',
      title: t('today.cards.tools.title'),
      desc: t('today.cards.tools.desc'),
      cta: t('today.cards.tools.cta'),
      onClick: () => setActiveSection(SECTIONS.TOOLS),
      icon: Sparkles,
      tone: 'yellow',
      badge: t('today.cards.tools.badge'),
    },
  ]

  if (dueTopics.length > 0) {
    actionCards.push({
      id: 'reviews',
      title: t('today.cards.reviews.title'),
      desc: t('today.cards.reviews.desc', { count: dueTopics.length }),
      cta: t('today.cards.reviews.cta'),
      onClick: () => setActiveSection(SECTIONS.LEARNING),
      icon: BookOpen,
      tone: 'indigo',
      badge: t('today.cards.reviews.badge'),
    })
  } else if (applications.length > 1) {
    actionCards.push({
      id: 'pipeline',
      title: t('today.cards.pipeline.title'),
      desc: t('today.cards.pipeline.desc', { count: applications.length }),
      cta: t('today.cards.pipeline.cta'),
      onClick: () => setActiveSection(SECTIONS.APPLICATIONS),
      icon: Briefcase,
      tone: 'teal',
      badge: t('today.cards.pipeline.badge'),
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className={`section-title dashboard-greeting ${drillMode ? 'drill' : 'sensei'}`}>
            {t('today.hello', { name: profile?.name || t('today.helloFallbackName') })} <span className="dashboard-greeting-hand" aria-hidden="true">🤝</span>
          </h2>
          <p className="section-sub">{t('today.subtitle')}</p>
        </div>
        {activeProject && (
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
            <FolderOpen size={14} className="text-teal-400" />
            <span className="text-teal-300 text-xs font-body font-medium">{activeProject.name}</span>
          </div>
        )}
      </div>

      <div className="card border-teal-500/20 bg-teal-500/5" data-guide="today-active-focus">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 max-w-3xl">
            <div className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wide mb-2">{t('today.activeFocus')}</div>
            <h3 className="font-display font-semibold text-white text-xl mb-2">{heroTitle}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{heroCopy}</p>
            <div className="mt-4">
              <button
                onClick={primaryAction.onClick}
                className="btn-primary text-sm md:text-base px-5 py-3 min-h-[48px] md:min-h-[52px] shadow-lg shadow-teal-500/20"
              >
                {primaryAction.label}
              </button>
            </div>
            {focusApplication && (
              <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                {t('today.prepHubsNote')}
              </p>
            )}
            {focusApplication && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-navy-600 bg-navy-900 text-slate-300">
                  {stageLabel(focusApplication.stage)}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/30 bg-teal-500/10 text-teal-300">
                  {t('today.progress.stepsComplete', { count: completedFocusSteps, total: 6 })}
                </span>
                {!activeApplication && suggestedFocus && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    {t('today.suggestedFocus')}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-[11px] border ${focusHasJd ? 'border-teal-500/30 bg-teal-500/10 text-teal-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                  {focusHasJd ? t('today.jdReady') : t('today.needsJd')}
                </span>
                {focusHasResearch && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    {t('applications.badges.research')}
                  </span>
                )}
                {focusHasPrep && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300">
                    {t('applications.badges.notes')}
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
                aria-label={t('today.changeActiveApplication')}
              >
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {applicationLabel(app)}
                  </option>
                ))}
              </select>
            )}
            {focusApplication ? (
              <button onClick={() => openTrackerApplication(focusApplication.id, 'overview')} className="btn-primary text-sm">
                {t('today.workspace')}
              </button>
            ) : (
              <button onClick={() => setActiveSection(SECTIONS.APPLICATIONS)} className="btn-primary text-sm">
                {t('today.applications')}
              </button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          <MetricCard
            label={t('today.workspaceProgress')}
            value={focusApplication ? `${completedFocusSteps}/6` : '0/6'}
            hint={focusApplication ? (nextFocusStep ? t('today.metric.next', { title: nextFocusStep.title }) : t('today.metric.coreComplete')) : t('today.pickApplication')}
            tone="teal"
          />
          <MetricCard
            label={t('today.applications')}
            value={applications.length}
            hint={applications.length === 1 ? t('today.oneRoleInPlay') : t('today.rolesInPlay')}
            tone="indigo"
          />
          <MetricCard
            label={t('today.mockInterviews')}
            value={focusApplication ? focusInterviewSessions.length : interviewSessions.length}
            hint={focusApplication ? t('today.savedForApplication') : t('today.savedProject')}
            tone="slate"
          />
          <MetricCard
            label={t('today.reviewsDue')}
            value={dueTopics.length}
            hint={dueTopics.length > 0 ? t('today.learningReviewsDue') : t('today.noReviews')}
            tone={dueTopics.length > 0 ? 'indigo' : 'slate'}
          />
        </div>
      </div>

      {applications.length === 0 ? (
        <FirstApplicationPrompt onAddApplication={() => setActiveSection(SECTIONS.APPLICATIONS)} />
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="font-display font-semibold text-white text-base">{t('today.prepHubs')}</h3>
              <p className="text-slate-400 text-sm">{t('today.prepHubsCopy')}</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            {actionCards.map(card => (
              <div
                key={`${card.title}-${card.badge || 'default'}`}
                data-guide={
                  card.id === 'interview'
                    ? 'today-interview-prep'
                    : card.id === 'tools'
                      ? 'today-prep-tools'
                      : card.id === 'reviews' ? 'today-learning-card' : undefined
                }
              >
                <ActionCard {...card} />
              </div>
            ))}
          </div>

          {recentPrepEntries.length > 0 && (
            <div className="card mt-4">
              <h3 className="font-display font-semibold text-white text-base mb-1">{t('today.recentPrepTitle')}</h3>
              <p className="text-slate-400 text-sm mb-3">
                {showingFocusedRecentPrep ? t('today.recentPrepCopyActive') : t('today.recentPrepCopyProject')}
              </p>

              <div className="space-y-2">
                {recentPrepEntries.map(entry => (
                  <button
                    key={`${entry.tool}-${entry.id}`}
                    onClick={() => openRecentPrepEntry(entry)}
                    className="w-full rounded-2xl border border-navy-600 bg-navy-950/60 px-4 py-3 text-left hover:border-teal-500/30 hover:bg-navy-900/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-display font-semibold">
                          {entry.toolLabel || t(`tools.toolLabels.${entry.tool}`)}
                        </div>
                        {!showingFocusedRecentPrep && entry.applicationLabel && (
                          <div className="text-teal-300 text-xs mt-1">{entry.applicationLabel}</div>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs flex-shrink-0">
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
