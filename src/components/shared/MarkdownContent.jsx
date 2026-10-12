import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Raw HTML is deliberately not enabled for provider or imported content.
export default function MarkdownContent({ children }) {
  return <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
    img: ({ alt }) => <span className="text-slate-400">{alt || 'Image'}</span>,
    table: ({ node, ...props }) => <div className="markdown-table"><table {...props} /></div>,
  }}>{String(children || '')}</ReactMarkdown></div>
}
