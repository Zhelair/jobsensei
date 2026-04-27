import React from 'react'
import { useApp } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { clearExtensionCapture, readExtensionCapture } from '../../utils/extensionBridge'

export default function ExtensionCaptureBridge() {
  const { openTrackerApplication } = useApp()
  const { activeProject, ingestCapturedApplication, ingestCapturedApplications } = useProject()
  const lastHandledRef = React.useRef(null)

  const consumePendingCapture = React.useCallback(() => {
    if (!activeProject) return

    const capture = readExtensionCapture()
    if (!capture) return

    const captures = Array.isArray(capture.captures) ? capture.captures : [capture]
    const dedupeKey = captures
      .map(item => `${item.capturedAt || ''}:${item.url || ''}:${item.company || ''}:${item.role || ''}`)
      .join('|')
    if (lastHandledRef.current === dedupeKey) return

    const targetApps = captures.length > 1
      ? ingestCapturedApplications(captures)
      : [ingestCapturedApplication(captures[0])].filter(Boolean)

    if (targetApps.length === 0) return

    clearExtensionCapture()
    lastHandledRef.current = dedupeKey

    const targetApp = targetApps[targetApps.length - 1]
    if (targetApp?.id) {
      openTrackerApplication(targetApp.id)
    }
  }, [activeProject, ingestCapturedApplication, ingestCapturedApplications, openTrackerApplication])

  React.useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) consumePendingCapture()
    }

    consumePendingCapture()
    window.addEventListener('focus', consumePendingCapture)
    window.addEventListener('jobsensei-extension-capture', consumePendingCapture)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', consumePendingCapture)
      window.removeEventListener('jobsensei-extension-capture', consumePendingCapture)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [consumePendingCapture])

  return null
}
