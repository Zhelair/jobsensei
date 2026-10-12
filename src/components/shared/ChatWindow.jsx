import React, { useEffect, useRef, useState } from 'react'
import { Bot, User } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import MarkdownContent from './MarkdownContent'

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in">
      <div className="chat-avatar w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-teal-400" />
      </div>
      <div className="chat-ai flex items-center gap-1 py-4">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

export default function ChatWindow({ messages, isLoading, emptyText }) {
  const scrollRef = useRef(null)
  const followRef = useRef(true)
  const [unseen, setUnseen] = useState(false)
  const { t } = useLanguage()

  function renderMessageContent(message) {
    const content = String(message?.content || '')
    if (message?.role === 'assistant') return <MarkdownContent>{content}</MarkdownContent>
    return content

  }

  useEffect(() => {
    const area = scrollRef.current
    if (area && (followRef.current || messages.at(-1)?.role === 'user')) area.scrollTop = area.scrollHeight
    else if (area) setUnseen(true)
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-body">
        {emptyText || t('voice.placeholder')}
      </div>
    )
  }

  return (
    <><div ref={scrollRef} onScroll={e => { const area = e.currentTarget; followRef.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80; if (followRef.current) setUnseen(false) }} className="chat-transcript flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" role="log" tabIndex={0} aria-label={t('chat.conversation')} aria-busy={isLoading}>
      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-3 animate-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`chat-avatar w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            msg.role === 'user' ? 'bg-indigo-500/20' : 'bg-teal-500/20'
          }`}>
            {msg.role === 'user'
              ? <User size={14} className="text-indigo-400" />
              : <Bot size={14} className="text-teal-400" />
            }
          </div>
          <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}>
            <div className={msg.role === 'user' ? 'whitespace-pre-wrap' : undefined}>{renderMessageContent(msg)}</div>
          </div>
        </div>
      ))}
      {isLoading && <TypingIndicator />}
    </div>{unseen && <button className="chat-new-response btn-secondary" onClick={() => { const area = scrollRef.current; if (area) area.scrollTop = area.scrollHeight; followRef.current = true; setUnseen(false) }}>{t('chat.newResponse')}</button>}</>
  )
}
