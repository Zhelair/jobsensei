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
  const accumulatedRef = useRef('')
  const onResultCallbackRef = useRef(null)
  const lastTextRef = useRef('')
  // Generation counter — incremented on each speak() or stopSpeaking() call.
  // speakNext() bails out if the generation has moved on, preventing the
  // Chrome bug where cancel() fires onend and re-triggers the chain.
  const speakGenRef = useRef(0)
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
    recognition.continuous = true        // keep alive through pauses
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          accumulatedRef.current += e.results[i][0].transcript + ' '
        }
      }
      // Show only finalized text — interim results are often noisy on mobile
      // and cause garbled display (duplicate characters, corrupted words).
      setTranscript(accumulatedRef.current.trim())
    }

    recognition.onend = () => {
      setIsListening(false)
      setTranscript('')
      const final = accumulatedRef.current.trim()
      if (final) onResultCallbackRef.current && onResultCallbackRef.current(final)
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setIsListening(false)
        setError('Microphone access denied. Please allow microphone in your browser settings.')
      } else if (e.error === 'no-speech') {
        setError(null)
      } else if (e.error === 'audio-capture') {
        setIsListening(false)
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

  // Stop listening and send whatever was recorded
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  // Stop listening and throw away the recording — nothing is sent
  const discardRecording = useCallback(() => {
    accumulatedRef.current = ''   // clear so onend delivers nothing
    setTranscript('')
    recognitionRef.current?.stop()
  }, [])

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return

    // Bump generation so any in-flight speakNext() from a previous call exits
    speakGenRef.current++
    const gen = speakGenRef.current
    window.speechSynthesis.cancel()
    lastTextRef.current = text

    const clean = text
      .replace(/#+\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')

    // Split into ≤220-char chunks to avoid Chrome's ~15 s TTS cutoff bug
    const rawSentences = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*/g) || [clean]
    const chunks = []
    let current = ''
    for (const sentence of rawSentences) {
      if (current.length + sentence.length > 220) {
        if (current.trim()) chunks.push(current.trim())
        current = sentence
      } else {
        current += sentence
      }
    }
    if (current.trim()) chunks.push(current.trim())
    if (chunks.length === 0) return

    setIsSpeaking(true)
    let index = 0
    const voice = getBestVoice()

    function speakNext() {
      // Bail out if cancelled or a newer speak() call started
      if (gen !== speakGenRef.current) return

      if (index >= chunks.length) {
        setIsSpeaking(false)
        onEnd && onEnd()
        return
      }
      const utt = new SpeechSynthesisUtterance(chunks[index++])
      utt.lang = 'en-US'
      utt.rate = 0.92
      utt.pitch = 1.05
      utt.volume = 1
      if (voice) utt.voice = voice
      utt.onend = speakNext
      utt.onerror = () => {
        if (gen !== speakGenRef.current) return   // stale — ignore
        setIsSpeaking(false)
        onEnd && onEnd()
      }
      window.speechSynthesis.speak(utt)
    }

    speakNext()
  }, [voicesLoaded])

  const stopSpeaking = useCallback(() => {
    speakGenRef.current++   // invalidates the active speakNext() chain
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const replayLast = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current)
  }, [speak])

  const clearError = useCallback(() => setError(null), [])

  return {
    isListening, transcript, isSpeaking, supported, error,
    startListening, stopListening, discardRecording, speak, stopSpeaking, clearError, replayLast,
  }
}
