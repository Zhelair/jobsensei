import React from 'react'
import { useVisuals } from '../../context/VisualsContext'

export default function VisualsOverlay() {
  const { toasts } = useVisuals()
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="visuals-toast">
          {t.msg}
        </div>
      ))}
    </div>
  )
}
