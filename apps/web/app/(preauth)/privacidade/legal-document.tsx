import type { ReactNode } from "react"
import { stripFrontMatter } from "../consent/front-matter"

// PORT-006 (lote 4 da entrada): o documento legal na pele da entrada.
//
// O texto continua sendo o de docs/legal/*.md — a fonte versionada que o aceite
// cobre. O que muda é a leitura: o renderizador antigo (consent/document-render)
// tratava cada linha como parágrafo e não conhecia `**negrito**`, então o
// cabeçalho do documento aparecia com os asteriscos na tela. Aqui entram
// negrito, listas e os títulos com as medidas do protótipo (`renderLegal` em
// legal/pages.js: .legal-h e .legal-p).
//
// Sem dependência de markdown: o formato usado nos dois documentos é este, e
// uma biblioteca inteira por quatro regras não se paga.

const BOLD = /\*\*([^*]+)\*\*/g

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let index = 0
  for (const match of text.matchAll(BOLD)) {
    const start = match.index ?? 0
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start))
    nodes.push(<strong key={`${keyPrefix}-b-${index++}`}>{match[1]}</strong>)
    lastIndex = start + match[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export function LegalDocument({ markdown }: Readonly<{ markdown: string }>) {
  const blocks: ReactNode[] = []
  const lines = stripFrontMatter(markdown).split(/\r?\n/)
  let list: string[] = []
  let key = 0

  const flushList = () => {
    if (list.length === 0) return
    const items = list
    list = []
    blocks.push(
      <ul className="legal-list" key={`list-${key++}`}>
        {items.map((item) => (
          <li key={`item-${key++}`}>{inline(item, `item-${key}`)}</li>
        ))}
      </ul>,
    )
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line === "") {
      flushList()
      continue
    }
    if (line.startsWith("### ")) {
      flushList()
      blocks.push(
        <h3 className="legal-h" key={key++}>
          {inline(line.slice(4), `h3-${key}`)}
        </h3>,
      )
      continue
    }
    if (line.startsWith("## ")) {
      flushList()
      blocks.push(
        <h2 className="legal-h" key={key++}>
          {inline(line.slice(3), `h2-${key}`)}
        </h2>,
      )
      continue
    }
    if (line.startsWith("# ")) {
      // O `#` do documento é o título da página, que a casca escreve: repetir
      // aqui daria dois h1.
      flushList()
      continue
    }
    if (line.startsWith("- ")) {
      list.push(line.slice(2))
      continue
    }
    flushList()
    blocks.push(
      <p className="legal-p" key={key++}>
        {inline(line, `p-${key}`)}
      </p>,
    )
  }
  flushList()

  return <div className="legal-doc">{blocks}</div>
}
