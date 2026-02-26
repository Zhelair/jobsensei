import { useState, useRef, useCallback, useEffect } from 'react'

// Pick the best available English TTS voice
function getBestVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const preferred = [
    'Google UK English Female',
    'Google US English',
    'Samantha',
    'Karen',
    'Daniel',
    'Moira',
    'Google UK English Male',
  ]
  for (const name of preferred) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  return voices.find(v => v.lang?.startsWith('en')) || voices[0] || null
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [supported] = useState(
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const recognitionRef = useRef(null)
  const [voicesLoaded, setVoicesLoaded] = useState(false)

  useEffect(() => {
    if (!window.speechSynthesis) return
    const load = () => setVoicesLoaded(true)
    window.speechSynthesis.onvoiceschanged = load
    if (window.speechSynthesis.getVoices().length > 0) setVoicesLoaded(true)
  }, [])

  const startListening = useCallback((onResult, onInterim) => {
    if (!supported) return
    setError(null)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      const interim = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(interim)
      onInterim && onInterim(interim)
      if (e.results[e.results.length - 1].isFinal) {
        onResult && onResult(interim)
      }
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setError('Microphone access denied. Please allow microphone in your browser settings and try again.')
      } else if (e.error === 'no-speech') {
        setError(null) // silence is not an error
      } else if (e.error === 'audio-capture') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else if (e.error !== 'aborted') {
        setError(`Voice error: ${e.error}. Try refreshing the page.`)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setTranscript('')
  }, [supported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    // Strip markdown
    const clean = text
      .replace(/#+\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .slice(0, 800)

    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = 'en-US'
    utt.rate = 0.92
    utt.pitch = 1.05
    utt.volume = 1

    const voice = getBestVoice()
    if (voice) utt.voice = voice

    utt.onstart = () => setIsSpeaking(true)
    utt.onend = () => { setIsSpeaking(false); onEnd && onEnd() }
    utt.onerror = () => { setIsSpeaking(false); onEnd && onEnd() }

    window.speechSynthesis.speak(utt)
  }, [voicesLoaded])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    isListening, transcript, isSpeaking, supported, error,
    startListening, stopListening, speak, stopSpeaking, clearError
  }
}
