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
  // isPaused = recognition auto-stopped (mobile), popup stays open so user can resume or send
  const [isPaused, setIsPaused] = useState(false)
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
  // Tracks whether the user explicitly pressed Done/Discard (vs auto-stop on mobile)
  const userStoppedRef = useRef(false)
  // The last text segment we finalized — used to detect mobile re-delivery on restart
  const lastAppendedRef = useRef('')
  // Generation counter for TTS — prevents the Chrome cancel→onend→restart bug
  const speakGenRef = useRef(0)
  const [voicesLoaded, setVoicesLoaded] = useState(false)

  useEffect(() => {
    if (!window.speechSynthesis) return
    const load = () => setVoicesLoaded(true)
    window.speechSynthesis.onvoiceschanged = load
    if (window.speechSynthesis.getVoices().length > 0) setVoicesLoaded(true)
  }, [])

  // Internal: create and start a SpeechRecognition session.
  // resetAccumulated=true on fresh start, false when resuming after a mobile auto-pause.
  // Stored in a ref so startListening / resumeListening always call the latest version.
  const beginRecognitionRef = useRef(null)
  beginRecognitionRef.current = (resetAccumulated) => {
    if (!supported) return
    if (resetAccumulated) {
      accumulatedRef.current = ''
      lastAppendedRef.current = ''
    }
    userStoppedRef.current = false

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    // Per-session highest finalized index — prevents reprocessing same index twice.
    let maxFinalizedIndex = -1

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal && i > maxFinalizedIndex) {
          maxFinalizedIndex = i
          const newText = e.results[i][0].transcript.trim()
          if (!newText) continue

          // Mobile Chrome delivers cumulative final results:
          //   index 0 → "I", index 1 → "I think", index 2 → "I think this", …
          // If we blindly concatenate we get "I I think I think this…" (the echo bug).
          // Fix: when the new result is an extension of what we last appended,
          // only add the new suffix instead of the full repeated phrase.
          // This also covers session-restart re-delivery (newText === lastAppended → toAppend = "").
          const prev = lastAppendedRef.current
          let toAppend = newText
          if (prev && newText.startsWith(prev)) {
            toAppend = newText.slice(prev.length).trim()
          }

          if (toAppend) {
            lastAppendedRef.current = newText // store full cumulative phrase for next comparison
            accumulatedRef.current += toAppend + ' '
          }
        }
      }
      setTranscript(accumulatedRef.current.trim())
    }

    recognition.onend = () => {
      if (!userStoppedRef.current) {
        // Mobile browsers auto-stop continuous recognition after each utterance.
        // We restart with a new SR instance. The 300ms delay lets mobile Chrome
        // flush its audio buffer — without it, the last audio chunk leaks into
        // the new session and gets transcribed again (the "I think I think" bug).
        setTimeout(() => {
          if (!userStoppedRef.current) beginRecognitionRef.current(false)
        }, 300)
        return
      }
      // User explicitly stopped — cleanup handled by stopListening / discardRecording.
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        userStoppedRef.current = true
        setIsListening(false)
        setIsPaused(false)
        setError('Microphone access denied. Please allow microphone in your browser settings.')
      } else if (e.error === 'no-speech') {
        setError(null)
      } else if (e.error === 'audio-capture') {
        userStoppedRef.current = true
        setIsListening(false)
        setIsPaused(false)
        setError('No microphone found. Please connect a microphone and try again.')
      } else if (e.error !== 'aborted') {
        setError(`Voice error: ${e.error}. Try refreshing the page.`)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  // Start a fresh recording session
  const startListening = useCallback((onResult) => {
    if (!supported) return
    setError(null)
    setIsListening(true)
    setIsPaused(false)
    setTranscript('')
    onResultCallbackRef.current = onResult
    beginRecognitionRef.current(true)
  }, [supported])

  // Resume after a mobile auto-pause (keeps previously spoken text)
  const resumeListening = useCallback(() => {
    if (!supported) return
    setIsPaused(false)
    beginRecognitionRef.current(false)
  }, [supported])

  // User pressed "Done — Send": deliver accumulated text immediately.
  // Also calls recognition.stop() in case it's still running (desktop).
  const stopListening = useCallback(() => {
    userStoppedRef.current = true
    const final = accumulatedRef.current.trim()
    accumulatedRef.current = ''
    setIsListening(false)
    setIsPaused(false)
    setTranscript('')
    try { recognitionRef.current?.stop() } catch {}
    if (final) onResultCallbackRef.current?.(final)
  }, [])

  // User pressed "Discard": stop without sending anything
  const discardRecording = useCallback(() => {
    userStoppedRef.current = true
    accumulatedRef.current = ''
    setTranscript('')
    setIsListening(false)
    setIsPaused(false)
    try { recognitionRef.current?.stop() } catch {}
  }, [])

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return

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
        if (gen !== speakGenRef.current) return
        setIsSpeaking(false)
        onEnd && onEnd()
      }
      window.speechSynthesis.speak(utt)
    }

    speakNext()
  }, [voicesLoaded])

  const stopSpeaking = useCallback(() => {
    speakGenRef.current++
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const replayLast = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current)
  }, [speak])

  const clearError = useCallback(() => setError(null), [])

  return {
    isListening, isPaused, transcript, isSpeaking, supported, error,
    startListening, resumeListening, stopListening, discardRecording,
    speak, stopSpeaking, clearError, replayLast,
  }
}
