import React from 'react'
import { useApp } from '../../context/AppContext'
import { useProject } from '../../context/ProjectContext'
import { clearExtensionCapture, readExtensionCapture } from '../../utils/extensionBridge'

export default function ExtensionCaptureBridge() {
  const { openTrackerApplication } = useApp()
  const { ingestCapturedApplication } = useProject()
  const lastHandledRef = React.useRef(null)

  const consumePendingCapture = React.useCallback(() => {
    const capture = readExtensionCapture()
    if (!capture) return

    const dedupeKey = `${capture.capturedAt || ''}:${capture.url || ''}:${capture.company || ''}:${capture.role || ''}`
    if (lastHandledRef.current === dedupeKey) return

    const targetApp = ingestCapturedApplication(capture)
    clearExtensionCapture()
    lastHandledRef.current = dedupeKey

    if (targetApp?.id) {
      openTrackerApplication(targetApp.id)
    }
  }, [ingestCapturedApplication, openTrackerApplication])

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
