import React from 'react'
import { matchColor } from '../../utils/helpers'

export default function ScoreRing({ score, max = 100, size = 80, label, color }) {
  const pct = (score / max) * 100
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const strokeColor = color || matchColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-white" style={{ fontSize: size * 0.22 }}>
            {score}{max === 10 ? '' : '%'}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-400 font-body">{label}</span>}
    </div>
  )
}
