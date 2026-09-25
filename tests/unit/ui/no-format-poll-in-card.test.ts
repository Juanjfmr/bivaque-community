import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// Item 6 da frente P1-TESTE — o cartão não exibe mais formato como metadado.
//
// "Texto"/"Foto"/"Link" descrevem como o REGISTRO foi montado, não o que a
// pessoa quis fazer, e "Enquete" não existe no produto (prancha 44, painel 1: a
// publicação é pergunta ou indicação). O commit 1628f01 tirou `POST_TYPE_LABELS`
// do cabeçalho do cartão e o bloco de opções de enquete do corpo; ficou só o
// tempo relativo.
//
// Asserção de AUSÊNCIA: falha no dia em que alguém reintroduzir o rótulo de
// formato no cartão. É leitura de fonte, não comportamento — não exercita
// renderização nenhuma.
//
// LIMITE DESTA PROVA: quem ler depois não deve supor que houve comportamento
// observado aqui. O comportamento desta frente é exercitado pelo e2e e pelo
// teste da função pura.

const root = join(import.meta.dirname, "..", "..", "..")
const cardPath = join(root, "apps", "web", "app", "components", "bivaque", "feed-post-card.tsx")
const raw = readFileSync(cardPath, "utf8")
// O cartão DOCUMENTA a remoção num comentário JSX que nomeia `poll_options` e
// `post_type='poll'`. Sem tirar comentários, o texto que explica a proibição
// derrubaria a asserção — e o uso real continuaria passando.
const code = stripComments(raw)

describe("o cartão não exibe o formato como metadado", () => {
  it("não tem o rótulo de formato", () => {
    expect(code).not.toContain("POST_TYPE_LABELS")
    expect(code).not.toContain("POST_TYPE_ORDER")
  })

  it("não renderiza o formato a partir de post_type", () => {
    // O metadado era `POST_TYPE_LABELS[shown.post_type] ?? shown.post_type`, com
    // um separador ao lado do tempo relativo. Afirmar a forma — e não só a
    // constante — cobre uma reintrodução com nome novo.
    expect(code).not.toMatch(/shown\.post_type\s*\]/)
    expect(code).not.toMatch(/\bpost_type\s*\?\?/)
  })
})

describe("o cartão não tem bloco de enquete", () => {
  it("não tem as opções de enquete nem o estado de enquete", () => {
    expect(code).not.toContain("poll_options")
    expect(code).not.toContain("pollOptions")
    expect(code).not.toContain('"poll"')
    expect(code).not.toContain("'poll'")
  })

  it("não tem lista de opções renderizada", () => {
    // O bloco era `poll_options.map((option, i) => …)`. Nenhuma lista de opções
    // pode voltar ao corpo do cartão.
    expect(code).not.toMatch(/\bpoll\w*\s*\.map\s*\(/)
  })
})

describe("foto e link continuam sendo anexos reais de uma pergunta", () => {
  it("os dois anexos continuam renderizando", () => {
    // O outro lado da asserção: tirar formato e enquete não pode ter levado os
    // anexos junto. Eles não são formato — são o que a pessoa anexou, e o
    // cartão continua dizendo de qual host veio o link.
    expect(code).toContain('post.post_type === "photo"')
    expect(code).toContain('post.post_type === "link"')
    expect(code).toContain("post.photo_path")
    expect(code).toContain("post.link_url")
    expect(code).toContain("linkHostname")
  })

  it("o tempo relativo continua sendo o metadado do cabeçalho", () => {
    expect(code).toContain("formatRelativeTime(post.created_at)")
  })
})
