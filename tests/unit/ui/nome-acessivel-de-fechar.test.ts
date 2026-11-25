import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// NOME ACESSÍVEL DE FECHAR — a garantia de COBERTURA, que é uma asserção de
// AUSÊNCIA e por isso vive na fonte.
//
// A ORIGEM, medida: `@heroui/react` fixa `"aria-label": "Close"` DENTRO do
// próprio `CloseButton`. Nenhum arquivo deste app escreve "Close": todo
// componente do fornecedor que monta um `CloseButton` sem rótulo próprio herda o
// inglês. O wrapper da casa (`components/bivaque/close-button.tsx`) saiu com a
// casca web em TROCA-005; a varredura abaixo é o que impede o rótulo inglês de
// voltar num arquivo novo.
//
// LIMITE DESTA PROVA: é leitura de fonte, não comportamento — ela não abre modal
// nenhum. Quem ler depois não deve supor que aqui houve comportamento observado.

const root = join(import.meta.dirname, "..", "..", "..")
const webApp = join(root, "apps", "web", "app")

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

const files = walk(webApp)

describe("o rótulo de fechar não volta a ser herdado em inglês", () => {
  it("nenhum CloseButton do fornecedor é montado sem rótulo", () => {
    const offenders = files.filter((file) => {
      const code = stripComments(readFileSync(file, "utf8"))
      let at = code.indexOf("<CloseButton")
      while (at !== -1) {
        const next = code.indexOf("<", at + 1)
        const tag = code.slice(at, next === -1 ? undefined : next)
        if (!/aria-label/.test(tag)) return true
        at = code.indexOf("<CloseButton", at + 1)
      }
      return false
    })
    expect(
      offenders.map((file) => file.slice(root.length + 1)),
      "um CloseButton do fornecedor sem aria-label herda o inglês; passe o rótulo pt-BR",
    ).toEqual([])
  })

  it("a string 'Close' não rotula nada no app", () => {
    // Ausência literal: era o valor que aparecia nos três viewports. A varredura
    // mira código, não documentação — o comentário que EXPLICA a proibição cita
    // "Close" e derrubaria a asserção se os comentários ficassem.
    const offenders = files.filter((file) => {
      const code = stripComments(readFileSync(file, "utf8"))
      return /aria-label="Close"/.test(code) || /aria-label='Close'/.test(code)
    })
    expect(offenders.map((file) => file.slice(root.length + 1))).toEqual([])
  })
})
