import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOKEN =
  /(\/\/[^\n]*|\/\*[^]*?\*\/)|(`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(export|function|const|let|return|if|else|for|of|new|type|interface|import|from|as|true|false|undefined)\b|\b(\d+(?:\.\d+)?)\b/g

/** Very small highlighter: comments, strings, keywords and numbers. */
function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out.push(code.slice(last, m.index))
    const [text, comment, str, kw, num] = m
    const cls = comment
      ? 'text-muted-foreground italic'
      : str
        ? 'text-calm'
        : kw
          ? 'text-primary font-semibold'
          : num
            ? 'text-attention'
            : ''
    out.push(
      <span key={m.index} className={cls}>
        {text}
      </span>,
    )
    last = m.index! + text.length
  }
  out.push(code.slice(last))
  return out
}

export function CodeBlock({ code, title, maxLines = 18 }: { code: string; title: string; maxLines?: number }) {
  const lines = code.split('\n')
  const [open, setOpen] = useState(lines.length <= maxLines)
  const shown = open ? code : lines.slice(0, maxLines).join('\n')
  return (
    <figure className="overflow-hidden rounded-2xl border bg-card">
      <figcaption className="flex items-center justify-between border-b px-4 py-2.5 text-[12.5px] text-muted-foreground">
        <span className="font-mono">{title}</span>
        <span>{lines.length} lines</span>
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-[1.6]">
        <code>{highlight(shown)}</code>
      </pre>
      {lines.length > maxLines && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 border-t text-[13px] font-semibold text-primary hover:bg-muted/50"
        >
          {open ? 'Show less' : `Show all ${lines.length} lines`}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      )}
    </figure>
  )
}

/** Pretty JSON with keys, strings and numbers tinted. */
export function JsonBlock({ value, title }: { value: unknown; title: string }) {
  const json = JSON.stringify(value, (_k, v) => (v === Infinity ? 'Infinity' : v), 2) ?? 'undefined'
  const parts: ReactNode[] = []
  let last = 0
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g
  for (const m of json.matchAll(re)) {
    if (m.index! > last) parts.push(json.slice(last, m.index))
    const [text, str, colon, num, lit] = m
    if (str && colon) {
      parts.push(
        <span key={m.index}>
          <span className="text-primary">{str}</span>
          {colon}
        </span>,
      )
    } else {
      parts.push(
        <span key={m.index} className={str ? 'text-calm' : num ? 'text-attention' : lit ? 'text-urgent' : ''}>
          {text}
        </span>,
      )
    }
    last = m.index! + text.length
  }
  parts.push(json.slice(last))
  return (
    <figure className="overflow-hidden rounded-2xl border bg-card">
      <figcaption className="border-b px-4 py-2.5 text-[12.5px] text-muted-foreground">{title}</figcaption>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-[12.5px] leading-[1.6]">
        <code>{parts}</code>
      </pre>
    </figure>
  )
}
