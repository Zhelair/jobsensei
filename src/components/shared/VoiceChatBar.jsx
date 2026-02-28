/**
 * VoiceChatBar — reusable chat input bar with voice recording popup + TTS replay.
 *
 * Props:
 *   onSend(text)       — called when user sends a message (typed or voiced)
 *   isLoading          — disables send while AI is responding
 *   lastAiMessage      — most recent AI message content (for auto-TTS and replay)
 *   placeholder        — input placeholder text
 */
import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Send, Volume2, VolumeX, AlertCircle, X, BellOff, RotateCcw, Trash2 } from 'lucide-react'
import { useVoice } from '../../hooks/useVoice'
import { useApp } from '../../context/AppContext'

export default function VoiceChatBar({
  onSend,
  isLoading = false,
  lastAiMessage = '',
  placeholder = 'Type your message…',
}) {
  const { isMuted } = useApp()
  const {
    isListening, transcript, isSpeaking, supported, error, clearError,
    startListening, stopListening, discardRecording, speak, stopSpeaking, replayLast,
  } = useVoice()

  const [input, setInput] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [mutedWarning, setMutedWarning] = useState(false)
  const ttsEnabledRef = useRef(false)
  const textareaRef = useRef(null)
  const mutedWarnTimer = useRef(null)

  // Keep speak in a ref so the TTS effect never needs speak as a dependency
  const speakRef = useRef(speak)
  useEffect(() => { speakRef.current = speak }, [speak])

  useEffect(() => { ttsEnabledRef.current = ttsEnabled }, [ttsEnabled])

  // Stop ongoing speech immediately when globally muted
  useEffect(() => {
    if (isMuted) stopSpeaking()
  }, [isMuted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play new AI messages when TTS is enabled.
  // speak intentionally excluded from deps — speakRef keeps it current without causing re-runs.
  const prevMsgRef = useRef('')
  useEffect(() => {
    if (!lastAiMessage || lastAiMessage === prevMsgRef.current) return
    prevMsgRef.current = lastAiMessage
    if (ttsEnabledRef.current && !isMuted) speakRef.current(lastAiMessage)
  }, [lastAiMessage, isMuted])

  // -- Mic --
  function handleMic() {
    if (isListening) {
      stopListening()   // triggers onend → delivers accumulated transcript → onSend
      return
    }
    clearError()
    startListening(
      (final) => { if (final.trim()) onSend(final) },
      () => {}   // interim updates already tracked via transcript state in useVoice
    )
  }

  // -- TTS button --
  // OFF  + not speaking → enable TTS autoplay + speak last AI message immediately (if not muted)
  // ON   + not speaking → disable TTS autoplay
  // any state + speaking → stop speaking
  function handleTts() {
    if (isSpeaking) { stopSpeaking(); return }
    if (ttsEnabled) {
      setTtsEnabled(false)
    } else {
      setTtsEnabled(true)
      if (isMuted) {
        // Voice is globally muted — warn user
        if (mutedWarnTimer.current) clearTimeout(mutedWarnTimer.current)
        setMutedWarning(true)
        mutedWarnTimer.current = setTimeout(() => setMutedWarning(false), 4000)
      } else {
        // Use lastAiMessage directly — lastTextRef may be empty on fresh mount
        if (lastAiMessage) speakRef.current(lastAiMessage)
        else replayLast()
      }
    }
  }

  // -- Text send --
  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    onSend(text)
    setInput('')
    textareaRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* ── Recording popup ── */}
      {isListening && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-navy-800 border border-teal-500/40 rounded-2xl p-4 shadow-2xl z-20 animate-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-teal-400 text-sm font-body font-medium">Listening…</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={discardRecording}
                className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-body hover:bg-red-500/25 transition-all flex items-center gap-1"
                title="Discard this recording"
              >
                <Trash2 size={11} /> Discard
              </button>
              <button
                onClick={stopListening}
                className="px-3 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-body hover:bg-teal-500/30 transition-all"
              >
                Done — Send
              </button>
            </div>
          </div>

          <div className="min-h-[3rem] bg-navy-900/60 rounded-xl px-3 py-2">
            {transcript
              ? <p className="text-white text-sm leading-relaxed">{transcript}</p>
              : <p className="text-slate-500 text-sm italic">Speak now — natural pauses are fine…</p>
            }
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">
            Press <strong className="text-slate-500">Done — Send</strong> when finished · <strong className="text-slate-500">Discard</strong> to start over
          </p>
        </div>
      )}

      {/* ── Muted warning ── */}
      {mutedWarning && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-2 text-amber-300 text-xs animate-in">
          <BellOff size={13} className="flex-shrink-0" />
          <span className="flex-1">AI voice is muted — tap 🔇 in the top bar to unmute</span>
          <button onClick={() => setMutedWarning(false)} className="text-amber-400 hover:text-amber-200 flex-shrink-0"><X size={12}/></button>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-2 text-red-300 text-xs">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-200 flex-shrink-0"><X size={12}/></button>
        </div>
      )}

      {/* ── Input row ── */}
      <div className="flex gap-2 items-end">
        {/* Mic button — always shown if browser supports it */}
        {supported && (
          <button
            onClick={handleMic}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-navy-700 text-slate-400 hover:text-teal-400 hover:bg-navy-600'
            }`}
            title={isListening ? 'Stop & send' : 'Press to speak'}
          >
            {isListening ? <MicOff size={16}/> : <Mic size={16}/>}
          </button>
        )}

        {/* TTS / Replay button */}
        <button
          onClick={handleTts}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all relative overflow-hidden ${
            isSpeaking
              ? 'bg-teal-500/25 text-teal-400 border border-teal-500/40 shadow-lg shadow-teal-500/20'
              : ttsEnabled
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
              : 'bg-navy-700 text-slate-500 hover:text-slate-300'
          }`}
          title={
            isSpeaking ? 'Tap to stop'
            : ttsEnabled ? 'Auto-play on — tap to replay now, or hold to turn off'
            : 'Play last AI response aloud'
          }
        >
          {/* Pulse ring when speaking */}
          {isSpeaking && (
            <span className="absolute inset-0 rounded-xl bg-teal-400/20 animate-ping" />
          )}
          {isSpeaking
            ? <Volume2 size={16}/>
            : ttsEnabled
            ? <RotateCcw size={15}/>
            : <VolumeX size={16}/>}
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          className="textarea-field flex-1 py-2.5 resize-none min-h-[40px] max-h-32"
          placeholder={isListening ? '🎙 Recording above — speak freely…' : placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          rows={1}
          readOnly={isListening}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center transition-all"
          title="Send"
        >
          <Send size={16} className="text-navy-900"/>
        </button>
      </div>

      {isSpeaking && (
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
          <span className="text-teal-400 text-xs animate-pulse">Speaking — tap 🔊 to stop</span>
        </div>
      )}
    </div>
  )
}
