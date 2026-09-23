import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// Item 5 da frente P1-TESTE — o FORMATO não volta ao modal de criação.
//
// O modal que abre depois de "Fazer uma pergunta" / "Pedir uma indicação"
// perguntava o formato DE NOVO: Texto / Foto / Link / Enquete apareciam antes do
// conteúdo (prancha 44, painel 1, que não tem formato nenhum). Os commits
// 0023e0d e 1628f01 tiraram o seletor, tiraram a enquete do produto e tiraram o
// formato do cartão.
//
// Esta é uma asserção de AUSÊNCIA, e para ausência a leitura de fonte é a
// ferramenta certa: ela falha no dia em que alguém reintroduzir o que saiu. Não
// descreve o que está escrito hoje — afirma o que NÃO pode voltar.
//
// O que fica de fora de propósito: o controle de enquete NA ENTRADA
// (feed-composer.tsx) já é coberto por
// tests/unit/ui/no-photo-poll-controls.test.ts:16-19. Aqui é o MODAL.
//
// LIMITE DESTA PROVA: é leitura de fonte, não comportamento. Ela não exercita
// clique nenhum; o que exercita comportamento nesta frente é o e2e
// (tests/e2e/feed-attachment-publish.spec.ts) e o teste da função pura
// (tests/unit/composer/post-attachment.test.ts). Quem ler depois não deve supor
// que aqui houve seis comportamentos observados.

const root = join(import.meta.dirname, "..", "..", "..")
const bivaque = join(root, "apps", "web", "app", "components", "bivaque")

const raw = readFileSync(join(bivaque, "feed-post-create.tsx"), "utf8")
// O fonte DOCUMENTA as proibições em comentários ("não existe seletor de
// Texto/Foto/Link/Enquete"), e o comentário que explica a proibição derrubaria a
// asserção. A varredura certa mira código: comentários saem antes da comparação
// e o uso real (JSX, chamada, string renderizada) continua sendo pego.
const code = stripComments(raw)

describe("o modal de criação não oferece escolha de formato", () => {
  it("não tem as constantes do seletor de formato", () => {
    expect(code).not.toContain("POST_TYPE_ORDER")
    expect(code).not.toContain("POST_TYPE_LABELS")
  })

  it("não tem estado de formato nem lista de tipos renderizada", () => {
    // O seletor era um `POST_TYPE_ORDER.map(...)` com um botão por tipo. Sem as
    // constantes a lista não existe, mas a asserção é explícita sobre a FORMA
    // para que uma reintrodução com nomes novos (POST_TYPES, FORMATS) também
    // caia: nenhum estado de formato, nenhum `.map` de tipos.
    expect(code).not.toMatch(/setPostType\b/)
    expect(code).not.toMatch(/\b[A-Z][A-Z_]*\s*\.map\s*\(/)
    expect(code).not.toMatch(/\bpostTypes?\b\s*\.map\s*\(/)
    expect(code).not.toMatch(/\bFORMATS?\b/)
  })

  it("o anexo vem DEPOIS do conteúdo — nunca como passo anterior", () => {
    // A propriedade exata do commit 0023e0d: a intenção já foi escolhida na tela
    // anterior, então o campo da pergunta é o primeiro campo de conteúdo e
    // anexar é opção SOBRE ela. Se o anexo voltar a ser passo anterior, a
    // pergunta deixa de vir primeiro.
    const pergunta = code.indexOf('id="post-conteudo"')
    const anexo = code.indexOf("Anexar à pergunta")
    expect(pergunta, "campo da pergunta presente").toBeGreaterThan(-1)
    expect(anexo, "campo do anexo presente").toBeGreaterThan(-1)
    expect(anexo, "anexo depois do conteúdo").toBeGreaterThan(pergunta)
  })
})

describe("a enquete não volta ao fluxo de criação", () => {
  it("não tem o editor de opções nem o estado de opções", () => {
    expect(code).not.toContain("PollEditor")
    expect(code).not.toContain("pollOptions")
  })

  it("não tem ramo de enquete — nem no tipo derivado, nem no insert", () => {
    // O `poll` era um valor de `post_type` e um ramo de `derived` que gravava
    // `poll_options`. Nenhum caminho pode voltar a produzi-lo.
    expect(code).not.toContain('"poll"')
    expect(code).not.toContain("'poll'")
    expect(code).not.toContain("poll_options")
  })

  it("o arquivo do editor de enquete não existe mais", () => {
    expect(existsSync(join(bivaque, "feed-post-poll-editor.tsx"))).toBe(false)
  })
})

describe("o rascunho do navegador não guarda formato nem opções de enquete", () => {
  const draftCode = stripComments(readFileSync(join(bivaque, "feed-post-draft.ts"), "utf8"))

  it("as chaves saíram do rascunho", () => {
    // O `PostDraft` guarda o que a PESSOA escreveu (texto, detalhes, anexo) e
    // não o formato: o `post_type` é derivado do anexo real no compositor.
    // Rascunho antigo que ainda traga essas chaves tem os valores descartados na
    // leitura — não há superfície para revisar opções de enquete, e publicar às
    // cegas o que não se vê seria pior do que não restaurar.
    expect(draftCode).not.toContain("postType")
    expect(draftCode).not.toContain("pollOptions")
    expect(draftCode).not.toContain("poll_options")
  })

  it("o rascunho continua guardando os quatro campos reais", () => {
    // O outro lado da asserção: tirar formato e enquete não pode ter levado o
    // anexo junto — é dele que o `post_type` agora sai.
    for (const campo of ["content", "details", "linkUrl", "photoPath"]) {
      expect(draftCode, campo).toContain(campo)
    }
  })
})
