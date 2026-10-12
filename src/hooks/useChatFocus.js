import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function useChatFocus(active = true) {
  const { setChatFocus } = useApp()
  useEffect(() => {
    setChatFocus(active)
    const viewport = window.visualViewport
    const resize = () => document.documentElement.style.setProperty('--chat-height', `${viewport?.height || window.innerHeight}px`)
    if (active) { resize(); viewport?.addEventListener('resize', resize) }
    return () => { setChatFocus(false); viewport?.removeEventListener('resize', resize); document.documentElement.style.removeProperty('--chat-height') }
  }, [active, setChatFocus])
}
