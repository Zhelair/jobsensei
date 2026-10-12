import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import MarkdownContent from './MarkdownContent'

describe('Markdown content from AI and imported notes', () => {
  it('renders readable headings, tables and code without executing raw HTML', () => {
    const html = renderToStaticMarkup(<MarkdownContent>{'# Lesson\n\n| Name | Amount |\n| --- | --- |\n| Alice | 50 |\n\n```sql\nSELECT 1;\n```\n\n<script>alert(1)</script>'}</MarkdownContent>)
    expect(html).toContain('<h1>Lesson</h1>')
    expect(html).toContain('<table>')
    expect(html).toContain('language-sql')
    expect(html).not.toContain('<script>')
  })
  it('does not turn unsafe provider links into executable URLs', () => {
    const html = renderToStaticMarkup(<MarkdownContent>{'[unsafe](javascript:alert%281%29)\n\n[safe](https://example.com)'}</MarkdownContent>)
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
