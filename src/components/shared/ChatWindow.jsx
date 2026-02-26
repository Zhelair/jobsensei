import React, { useEffect, useRef } from 'react'
import { Bot, User } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in">
      <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
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
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-body">
        {emptyText || 'Start the conversation...'}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-3 animate-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            msg.role === 'user' ? 'bg-indigo-500/20' : 'bg-teal-500/20'
          }`}>
            {msg.role === 'user'
              ? <User size={14} className="text-indigo-400" />
              : <Bot size={14} className="text-teal-400" />
            }
          </div>
          <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        </div>
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
