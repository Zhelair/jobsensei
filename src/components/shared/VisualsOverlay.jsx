import React, { useMemo } from 'react'
import { useVisuals } from '../../context/VisualsContext'

const PARTICLE_COLORS = ['#14B8A6', '#6366F1', '#FF006E', '#F59E0B', '#BF5AF2', '#00EEFF', '#F472B6']

// Stable particles — computed once, not re-rendered
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 5.5 + Math.sin(i * 1.3) * 15 + 50) % 100}%`,
  top: `${(i * 7.2 + Math.cos(i * 0.9) * 20 + 50) % 100}%`,
  size: i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  dur: `${5 + (i % 5) * 1.8}s`,
  delay: `${-(i * 1.1)}s`,
  driftX: `${(i % 2 === 0 ? 1 : -1) * (10 + i % 20)}px`,
}))

function ParticleLayer() {
  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="visuals-particle absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            '--px-dur': p.dur,
            '--px-delay': p.delay,
            '--px-drift': p.driftX,
          }}
        />
      ))}
    </div>
  )
}

export default function VisualsOverlay() {
  const { toasts, bigWin, enabled } = useVisuals()

  if (!enabled) return null

  return (
    <>
      <ParticleLayer />

      {/* Big win flash */}
      {bigWin && (
        <div key={bigWin + Date.now()} className="visuals-bigwin">
          {bigWin}
        </div>
      )}

      {/* Motivational toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="visuals-toast">
              {t.msg}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
