import { useState, useRef, useCallback, useEffect } from 'react'
import { subscribeToVoicesChanged, useLanguage } from '../context/LanguageContext'

function normalizeVoiceLang(lang = '') {
  return String(lang || '').replace(/_/g, '-').toLowerCase()
}

function getVoiceSupportLevel(voice, speechLang) {
  if (!voice) return 0

  const normalizedSpeechLang = normalizeVoiceLang(speechLang)
  const baseSpeechLang = normalizedSpeechLang.split('-')[0]
  const voiceLang = normalizeVoiceLang(voice.lang)

  if (voiceLang === normalizedSpeechLang) return 3
  if (voiceLang === baseSpeechLang || voiceLang.startsWith(`${baseSpeechLang}-`)) return 2
  if (voiceLang.startsWith('en')) return 1
  return 0
}

function getBestVoice(preferredVoice, speechLang) {
  const voices = window.speechSynthesis?.getVoices() || []
  const livePreferredVoice = preferredVoice
    ? voices.find((voice) => (
      voice.name === preferredVoice.name
      && normalizeVoiceLang(voice.lang) === normalizeVoiceLang(preferredVoice.lang)
    )) || voices.find(voice => voice.name === preferredVoice.name) || preferredVoice
    : null

  if (livePreferredVoice && getVoiceSupportLevel(livePreferredVoice, speechLang) >= 2) {
    return livePreferredVoice
  }

  const exactMatch = voices.find(voice => getVoiceSupportLevel(voice, speechLang) === 3)
  if (exactMatch) return exactMatch

  const relatedMatch = voices.find(voice => getVoiceSupportLevel(voice, speechLang) === 2)
  if (relatedMatch) return relatedMatch

  const preferred = [
    'Google UK English Female', 'Google US English',
    'Microsoft Zira', 'Samantha', 'Karen', 'Moira', 'Tessa',
  ]
  if (livePreferredVoice) return livePreferredVoice
  for (const name of preferred) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  return voices.find(v => getVoiceSupportLevel(v, speechLang) === 1)
    || voices[0]
    || null
}

export function useVoice() {
  const { activeVoice, speechLang, recognitionLang, voiceSupport } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  // isPaused = recognition auto-stopped (mobile), popup stays open so user can resume or send
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
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
    const unsubscribe = subscribeToVoicesChanged(window.speechSynthesis, load)
    if (window.speechSynthesis.getVoices().length > 0) setVoicesLoaded(true)
    return unsubscribe
  }, [])

  const readMicrophonePermission = useCallback(async () => {
    if (!navigator.permissions?.query) return 'unknown'

    try {
      const status = await navigator.permissions.query({ name: 'microphone' })
      return status?.state || 'unknown'
    } catch {
      return 'unknown'
    }
  }, [])

  const ensureMicrophoneAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true

    setIsRequestingPermission(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setError(null)
      return true
    } catch (err) {
      const permissionState = await readMicrophonePermission()
      const errorName = err?.name || ''

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
        if (permissionState === 'denied') {
          setError('Microphone access is blocked. Allow it from the browser site settings, then tap the mic again.')
        } else {
          setError('Microphone access was dismissed. Tap the mic again and choose Allow to start recording.')
        }
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Microphone permission check failed. Please try the mic again.')
      }

      return false
    } finally {
      setIsRequestingPermission(false)
    }
  }, [readMicrophonePermission])

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
    recognition.lang = recognitionLang || 'en-US'
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setIsListening(true)
      setIsPaused(false)
      setError(null)
    }

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
        void readMicrophonePermission().then((permissionState) => {
          if (permissionState === 'denied') {
            setError('Microphone access is blocked. Allow it from the browser site settings, then tap the mic again.')
            return
          }

          setError('Microphone access was dismissed. Tap the mic again and choose Allow to start recording.')
        })
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
    try {
      recognition.start()
    } catch {
      setIsListening(false)
      setIsPaused(false)
      setError('Microphone could not start. Tap the mic again to retry.')
    }
  }

  // Start a fresh recording session
  const startListening = useCallback(async (onResult) => {
    if (!supported) return
    setError(null)
    setTranscript('')
    onResultCallbackRef.current = onResult
    const hasAccess = await ensureMicrophoneAccess()
    if (!hasAccess) return
    beginRecognitionRef.current(true)
  }, [ensureMicrophoneAccess, supported])

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
    const voice = getBestVoice(activeVoice, speechLang)

    function speakNext() {
      if (gen !== speakGenRef.current) return
      if (index >= chunks.length) {
        setIsSpeaking(false)
        onEnd && onEnd()
        return
      }
      const utt = new SpeechSynthesisUtterance(chunks[index++])
      utt.lang = speechLang || 'en-US'
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
  }, [voicesLoaded, activeVoice, speechLang])

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
    isListening, isPaused, transcript, isSpeaking, supported, error, isRequestingPermission,
    voiceSupport, speechLang, recognitionLang,
    startListening, resumeListening, stopListening, discardRecording,
    speak, stopSpeaking, clearError, replayLast,
  }
}
