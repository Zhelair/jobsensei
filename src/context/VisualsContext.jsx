import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const COLORS = ['#14B8A6', '#6366F1', '#FF006E', '#F59E0B', '#10B981', '#BF5AF2', '#00EEFF', '#FB923C', '#F472B6']

const MOTIVATION_MSGS = [
  "You're crushing it! 💪",
  "🎰 JACKPOT! Another session complete!",
  "One step closer to your dream role! 🎯",
  "🎲 Roll again — you're on a streak!",
  "Keep showing up — it pays off! 🔥",
  "💎 Diamond-tier preparation!",
  "Your future self will thank you! ✨",
  "⚡ POWER UP! Interview XP gained!",
  "🃏 Your next interview? Already won.",
  "Every practice session counts! 🚀",
  "🏆 Champion mindset activated!",
  "Today's effort = tomorrow's offer! 🎉",
  "🌟 Star performer in the making!",
  "Hard work beats talent when talent doesn't work! 💪",
]

const WIN_MSGS = [
  '🎰 JACKPOT!', '💎 LEVEL UP!', '🎯 BULLSEYE!',
  '🔥 ON FIRE!', '⚡ LET\'S GO!', '🏆 WINNER!',
  '💰 MONEY MOVE!', '🚀 LAUNCHED!',
]

const EMOJI_SETS = [
  ['💰', '💰', '🤑'],
  ['🎯', '⭐', '🎯'],
  ['🔥', '💪', '🔥'],
  ['💎', '✨', '💎'],
  ['🚀', '⚡', '🌟'],
  ['🎰', '🎲', '🃏'],
]

function spawnConfetti(count = 120) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    vx: (Math.random() - 0.5) * 10,
    vy: Math.random() * 5 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 11 + 5,
    rotation: Math.random() * Math.PI * 2,
    rotVel: (Math.random() - 0.5) * 0.35,
    isRect: Math.random() > 0.35,
    isStar: Math.random() > 0.8,
  }))

  let frame = 0
  const total = 180

  function drawStar(ctx, r) {
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
      const ia = a + (2 * Math.PI) / 5
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      ctx.lineTo(Math.cos(ia) * (r * 0.4), Math.sin(ia) * (r * 0.4))
    }
    ctx.closePath()
    ctx.fill()
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.1
      p.vx *= 0.99
      p.rotation += p.rotVel
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - frame / total)
      ctx.fillStyle = p.color
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      if (p.isStar) {
        drawStar(ctx, p.size / 2)
      } else if (p.isRect) {
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

function spawnEmojiFloat() {
  const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)]
  set.forEach((emoji, i) => {
    const el = document.createElement('div')
    el.textContent = emoji
    el.style.cssText = `
      position:fixed;
      left:${15 + Math.random() * 70}%;
      bottom:20%;
      font-size:${22 + Math.random() * 18}px;
      pointer-events:none;
      z-index:9997;
      animation:emojiFloat ${1.6 + Math.random() * 0.6}s ease forwards;
      animation-delay:${i * 0.18}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2800)
  })
}

const VisualsContext = createContext(null)

export function VisualsProvider({ children }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('js_visuals') === 'true')
  const [toasts, setToasts] = useState([])
  const [bigWin, setBigWin] = useState(null)
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

  const triggerConfetti = useCallback((count = 120) => {
    if (!enabled) return
    spawnConfetti(count)
    spawnEmojiFloat()
    // 40% chance of big win flash
    if (Math.random() > 0.6) {
      const msg = WIN_MSGS[Math.floor(Math.random() * WIN_MSGS.length)]
      setBigWin(msg)
      setTimeout(() => setBigWin(null), 2000)
    }
  }, [enabled])

  const showToast = useCallback((msg) => {
    if (!enabled) return
    addToast(msg)
  }, [enabled, addToast])

  // Auto toasts every 2.5 minutes
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      const idx = msgIdxRef.current % MOTIVATION_MSGS.length
      addToast(MOTIVATION_MSGS[idx])
      msgIdxRef.current++
    }, 2.5 * 60 * 1000)
    return () => clearInterval(id)
  }, [enabled, addToast])

  // Random confetti + emoji burst every 6 minutes
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      spawnConfetti(60)
      spawnEmojiFloat()
    }, 6 * 60 * 1000)
    return () => clearInterval(id)
  }, [enabled])

  return (
    <VisualsContext.Provider value={{ enabled, setEnabled, triggerConfetti, showToast, toasts, bigWin }}>
      {children}
    </VisualsContext.Provider>
  )
}

export function useVisuals() {
  return useContext(VisualsContext)
}
