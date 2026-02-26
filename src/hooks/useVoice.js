import { useState, useRef, useCallback, useEffect } from 'react'

function getBestVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const preferred = [
    'Google UK English Female', 'Google US English',
    'Samantha', 'Karen', 'Daniel', 'Moira', 'Google UK English Male',
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
  // continuous mode: accumulate all final segments, only call onResult on stop
  const accumulatedRef = useRef('')
  const onResultCallbackRef = useRef(null)
  const lastTextRef = useRef('')   // for replay
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
    accumulatedRef.current = ''
    onResultCallbackRef.current = onResult

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true          // KEY: keep listening through pauses
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          accumulatedRef.current += e.results[i][0].transcript + ' '
        } else {
          interim += e.results[i][0].transcript
        }
      }
      const display = (accumulatedRef.current + interim).trim()
      setTranscript(display)
      onInterim && onInterim(display)
    }

    // onend fires when stopListening() is called → deliver accumulated result
    recognition.onend = () => {
      setIsListening(false)
      const final = accumulatedRef.current.trim()
      if (final) onResultCallbackRef.current && onResultCallbackRef.current(final)
    }

    recognition.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setError('Microphone access denied. Please allow microphone in your browser settings.')
      } else if (e.error === 'no-speech') {
        setError(null)
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

  // calling stop() triggers onend, which delivers the accumulated transcript
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    lastTextRef.current = text  // store for replay

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

  // Replay the last spoken text
  const replayLast = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current)
  }, [speak])

  const clearError = useCallback(() => setError(null), [])

  return {
    isListening, transcript, isSpeaking, supported, error,
    startListening, stopListening, speak, stopSpeaking, clearError, replayLast,
  }
}
