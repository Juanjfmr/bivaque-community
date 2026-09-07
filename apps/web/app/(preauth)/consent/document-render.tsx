import type { ReactNode } from "react"
import { stripFrontMatter } from "./front-matter"

// Renders the markdown legal documents as accessible, styled content. The
// legal text stays in docs/legal/ (the versioned source); this keeps bullets
// and headings presentable without pulling a markdown dependency into the
// bundle.

export function renderLegalDocument(markdown: string): ReactNode[] {
  const blocks: ReactNode[] = []
  const lines = stripFrontMatter(markdown).split(/\r?\n/)
  let key = 0
  let list: string[] = []
  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={`list-${key++}`} className="list-disc space-y-1 pl-4">
          {list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>,
      )
      list = []
    }
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("### ")) {
      flushList()
      blocks.push(
        <h3 key={key++} className="mt-4 text-sm font-semibold">
          {trimmed.slice(4)}
        </h3>,
      )
    } else if (trimmed.startsWith("## ")) {
      flushList()
      blocks.push(
        <h2 key={key++} className="mt-4 text-sm font-semibold">
          {trimmed.slice(3)}
        </h2>,
      )
    } else if (trimmed.startsWith("# ")) {
      flushList()
      blocks.push(
        <h2 key={key++} className="text-sm font-semibold uppercase tracking-wide">
          {trimmed.slice(2)}
        </h2>,
      )
    } else if (trimmed.startsWith("- ")) {
      list.push(trimmed.slice(2))
    } else if (trimmed === "") {
      flushList()
    } else {
      flushList()
      blocks.push(
        <p key={key++} className="my-1.5 text-sm text-muted">
          {trimmed}
        </p>,
      )
    }
  }
  flushList()
  return blocks
}
