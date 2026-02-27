import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const COLORS = ['#14B8A6', '#6366F1', '#FF006E', '#F59E0B', '#10B981', '#BF5AF2', '#00EEFF', '#FB923C']

const MOTIVATION_MSGS = [
  "You're crushing it! 💪",
  "One step closer to your dream role! 🎯",
  "Keep showing up — it pays off! 🔥",
  "Your future self will thank you! ✨",
  "Every practice session counts! 🚀",
  "Hard work beats talent when talent doesn't work! 🏆",
  "Interviews are just conversations — you've got stories! 💬",
  "Today's effort = tomorrow's offer! 🎉",
  "The best preparation is consistent practice! 📈",
  "You've got this. Believe in the process! 🌟",
]

function spawnConfetti(count = 90) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.25,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * 4 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 9 + 5,
    rotation: Math.random() * Math.PI * 2,
    rotVel: (Math.random() - 0.5) * 0.3,
    isRect: Math.random() > 0.4,
  }))

  let frame = 0
  const total = 160

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12
      p.vx *= 0.99
      p.rotation += p.rotVel
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - frame / total)
      ctx.fillStyle = p.color
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      if (p.isRect) {
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
    frame++
    if (frame < total) requestAnimationFrame(draw)
    else canvas.remove()
  }

  requestAnimationFrame(draw)
}

const VisualsContext = createContext(null)

export function VisualsProvider({ children }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('js_visuals') === 'true')
  const [toasts, setToasts] = useState([])
  const msgIdxRef = useRef(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-visuals', enabled ? 'on' : 'off')
    localStorage.setItem('js_visuals', enabled)
  }, [enabled])

  const addToast = useCallback((msg) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-3), { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3700)
  }, [])

  const triggerConfetti = useCallback((count = 90) => {
    if (!enabled) return
    spawnConfetti(count)
  }, [enabled])

  const showToast = useCallback((msg) => {
    if (!enabled) return
    addToast(msg)
  }, [enabled, addToast])

  // Auto motivational toasts every 3 minutes
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      const idx = msgIdxRef.current % MOTIVATION_MSGS.length
      addToast(MOTIVATION_MSGS[idx])
      msgIdxRef.current++
    }, 3 * 60 * 1000)
    return () => clearInterval(id)
  }, [enabled, addToast])

  // Random confetti burst every 7 minutes
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => spawnConfetti(50), 7 * 60 * 1000)
    return () => clearInterval(id)
  }, [enabled])

  return (
    <VisualsContext.Provider value={{ enabled, setEnabled, triggerConfetti, showToast, toasts }}>
      {children}
    </VisualsContext.Provider>
  )
}

export function useVisuals() {
  return useContext(VisualsContext)
}
