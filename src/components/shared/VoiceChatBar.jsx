import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Send, Volume2, VolumeX, AlertCircle, X, BellOff, RotateCcw, Trash2 } from 'lucide-react'
import { useVoice } from '../../hooks/useVoice'
import { useApp } from '../../context/AppContext'
import { useLanguage } from '../../context/LanguageContext'

export default function VoiceChatBar({
  onSend,
  isLoading = false,
  lastAiMessage = '',
  placeholder = '',
}) {
  const { isMuted } = useApp()
  const { t, languageOption } = useLanguage()
  const {
    isListening, isPaused, transcript, isSpeaking, supported, error, clearError,
    voiceSupport,
    startListening, resumeListening, stopListening, discardRecording, speak, stopSpeaking, replayLast,
  } = useVoice()

  const [input, setInput] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [mutedWarning, setMutedWarning] = useState(false)
  const ttsEnabledRef = useRef(false)
  const textareaRef = useRef(null)
  const mutedWarnTimer = useRef(null)

  const speakRef = useRef(speak)
  useEffect(() => { speakRef.current = speak }, [speak])

  useEffect(() => { ttsEnabledRef.current = ttsEnabled }, [ttsEnabled])

  useEffect(() => {
    if (isMuted) stopSpeaking()
  }, [isMuted]) // eslint-disable-line react-hooks/exhaustive-deps

  const prevMsgRef = useRef('')
  useEffect(() => {
    if (!lastAiMessage || lastAiMessage === prevMsgRef.current) return
    prevMsgRef.current = lastAiMessage
    if (ttsEnabledRef.current && !isMuted) speakRef.current(lastAiMessage)
  }, [lastAiMessage, isMuted])

  function handleMic() {
    if (isPaused) {
      resumeListening()
      return
    }
    if (isListening) {
      discardRecording()
      return
    }
    clearError()
    startListening((final) => { if (final.trim()) onSend(final) })
  }

  function handleTts() {
    if (isSpeaking) {
      stopSpeaking()
      return
    }
    if (ttsEnabled) {
      setTtsEnabled(false)
      return
    }

    setTtsEnabled(true)
    if (isMuted) {
      if (mutedWarnTimer.current) clearTimeout(mutedWarnTimer.current)
      setMutedWarning(true)
      mutedWarnTimer.current = setTimeout(() => setMutedWarning(false), 4000)
      return
    }

    if (lastAiMessage) speakRef.current(lastAiMessage)
    else replayLast()
  }

  function resizeInput() {
    const el = textareaRef.current
    if (!el) return
    const maxHeight = 160
    el.style.height = 'auto'
    const nextHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${Math.max(nextHeight, 40)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }

  useEffect(() => {
    resizeInput()
  }, [input])

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    onSend(text)
    setInput('')
    textareaRef.current?.focus()
  }

  const inputPlaceholder = placeholder || t('voice.placeholder')
  const micTitle = !supported
    ? t('voice.micUnsupported')
    : isPaused
      ? t('voice.micResume')
      : isListening
        ? t('voice.discardTitle')
        : t('voice.micPress')

  return (
    <div className="relative">
      {(isListening || isPaused) && (
        <div className={`absolute bottom-full left-0 right-0 mb-2 bg-navy-800 rounded-2xl p-4 shadow-2xl z-20 animate-in border ${isPaused ? 'border-amber-500/40' : 'border-teal-500/40'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isPaused ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  <span className="text-amber-400 text-sm font-body font-medium">{t('voice.paused')}</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-teal-400 text-sm font-body font-medium">{t('voice.listening')}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={discardRecording}
                className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-body hover:bg-red-500/25 transition-all flex items-center gap-1"
                title={t('voice.discardTitle')}
              >
                <Trash2 size={11} /> {t('voice.discard')}
              </button>
              <button
                onClick={stopListening}
                className="px-3 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-body hover:bg-teal-500/30 transition-all"
              >
                {t('voice.doneSend')}
              </button>
            </div>
          </div>

          <div className="min-h-[3rem] bg-navy-900/60 rounded-xl px-3 py-2">
            {transcript
              ? <p className="text-white text-sm leading-relaxed">{transcript}</p>
              : <p className="text-slate-500 text-sm italic">{t('voice.speakNow')}</p>
            }
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">{t('voice.submitHelp')}</p>
        </div>
      )}

      {voiceSupport === 'fallback' && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 mb-2 text-yellow-300 text-xs animate-in">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span className="flex-1">{languageOption.voiceNote || t('settings.voiceFallback')}</span>
        </div>
      )}

      {mutedWarning && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-2 text-amber-300 text-xs animate-in">
          <BellOff size={13} className="flex-shrink-0" />
          <span className="flex-1">{t('voice.muted')}</span>
          <button onClick={() => setMutedWarning(false)} className="text-amber-400 hover:text-amber-200 flex-shrink-0"><X size={12} /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-2 text-red-300 text-xs">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-200 flex-shrink-0"><X size={12} /></button>
        </div>
      )}

      {!supported && (
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-2 mb-2 text-indigo-200 text-xs animate-in">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span className="flex-1">{t('voice.micUnsupportedNote')}</span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <button
          onClick={handleMic}
          disabled={!supported}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            !supported
              ? 'bg-navy-800 text-slate-600 border border-navy-700 cursor-not-allowed'
              : isListening && !isPaused
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : isPaused
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-navy-700 text-slate-400 hover:text-teal-400 hover:bg-navy-600'
          }`}
          title={micTitle}
        >
          {isListening && !isPaused ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

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
            isSpeaking ? t('voice.ttsStop')
              : ttsEnabled ? t('voice.ttsAutoplay')
                : t('voice.ttsReplay')
          }
        >
          {isSpeaking && (
            <span className="absolute inset-0 rounded-xl bg-teal-400/20 animate-ping" />
          )}
          {isSpeaking
            ? <Volume2 size={16} />
            : ttsEnabled
              ? <RotateCcw size={15} />
              : <VolumeX size={16} />}
        </button>

        <textarea
          ref={textareaRef}
          className="textarea-field flex-1 py-2.5 resize-none min-h-[40px]"
          placeholder={isListening ? t('voice.recordingPlaceholder') : inputPlaceholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={1}
          readOnly={isListening}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center transition-all"
          title={t('voice.sendShortcut')}
        >
          <Send size={16} className="text-navy-900" />
        </button>
      </div>

      {isSpeaking && (
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
          <span className="text-teal-400 text-xs animate-pulse">{t('voice.speaking')}</span>
        </div>
      )}
    </div>
  )
}
