import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// NOME ACESSÍVEL DE FECHAR — a garantia de COBERTURA, que é uma asserção de
// AUSÊNCIA e por isso vive na fonte.
//
// O comportamento (o default chegar ao DOM e virar nome acessível) é provado por
// e2e em tests/e2e/close-label-ptbr.spec.ts. O que falta lá é a resposta para
// "nenhum ponto ficou de fora?": abrir os 11 modais e as 3 buscas num spec seria
// caro e dependente de estado, e um spec assim envelhece. Aqui a varredura é
// exaustiva e barata — e falha no dia em que alguém reintroduzir o primitivo do
// fornecedor num arquivo novo.
//
// A ORIGEM, medida: `@heroui/react` fixa `"aria-label": "Close"` DENTRO do
// próprio `CloseButton`
// (node_modules/@heroui/react/dist/components/close-button/close-button.js:21).
// Não é o chamador que escreve "Close" — nenhum arquivo deste app contém a
// string. Todo componente do HeroUI que monta um `CloseButton` sem rótulo
// próprio herda o inglês: modal, alert-dialog, drawer, search-field, tag, toast.
// O app usa modal (11 pontos), search-field (3 pontos) e o toast; `Tag` passa o
// próprio "Remove tag" e alert-dialog/drawer não são usados. Além desses, um
// ponto monta o `CloseButton` puro e passa rótulo próprio:
// `components/bivaque/feedback-alert.tsx` (`aria-label="Fechar aviso"`).
//
// LIMITE DESTA PROVA: é leitura de fonte, não comportamento — ela não abre modal
// nenhum. Quem ler depois não deve supor que aqui houve 11 comportamentos
// observados: quem observa é o e2e.
//
// PENDÊNCIA DECLARADA, e não escondida: o gatilho de fechar do TOAST continua
// herdando "Close". O rótulo dele vive no template INTERNO do `Toast.Provider`
// (`jsx(ToastCloseButton, {})`, sem rótulo), e sobrescrever exige reescrever o
// template inteiro — indicador, spinner de carregamento, posição da ação no
// mobile — contra um `@heroui/react` de faixa `^3.2.3`. Reproduzir interno de
// fornecedor sob faixa de versão troca um rótulo por risco de quebrar o toast de
// sucesso da publicação. A asserção abaixo NÃO finge cobertura sobre o toast.

const root = join(import.meta.dirname, "..", "..", "..")
const webApp = join(root, "apps", "web", "app")
const bivaque = join(webApp, "components", "bivaque")
const wrapper = join(bivaque, "close-button.tsx")

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

const files = walk(webApp).filter((file) => file !== wrapper)

describe("o rótulo de fechar não volta a ser herdado em inglês", () => {
  it("nenhum arquivo do app monta os primitivos do fornecedor direto", () => {
    // Estes dois herdam `aria-label="Close"` do wrapper do fornecedor. Quem
    // quiser um deles usa components/bivaque/close-button.tsx.
    const offenders = files.filter((file) => {
      const code = stripComments(readFileSync(file, "utf8"))
      return /<Modal\.CloseTrigger/.test(code) || /<SearchField\.ClearButton/.test(code)
    })
    expect(
      offenders.map((file) => file.slice(root.length + 1)),
      "use o wrapper da casa em components/bivaque/close-button.tsx",
    ).toEqual([])
  })

  it("nenhum CloseButton do fornecedor é montado sem rótulo", () => {
    // A lacuna que esta asserção fecha: as outras miram `Modal.CloseTrigger` e
    // `SearchField.ClearButton`, mas o `CloseButton` PURO do fornecedor também
    // herda `aria-label="Close"` — um arquivo novo que o montasse sem rótulo
    // passava por todas as asserções anteriores. Não é hipótese: o app já monta
    // esse primitivo num ponto legítimo (feedback-alert.tsx, com
    // `aria-label="Fechar aviso"`), então proibi-lo de todo não é o caminho —
    // o que se cobra é o rótulo.
    const offenders = files.filter((file) => {
      const code = stripComments(readFileSync(file, "utf8"))
      let at = code.indexOf("<CloseButton")
      while (at !== -1) {
        // A janela é a TAG de abertura: de `<CloseButton` até o próximo `<`, que
        // em JSX só pode ser filho ou elemento seguinte — o `>` que fecha a tag
        // vem antes. Fatiar por `<` dispensa contar chaves e casar `=>`, que é
        // exatamente onde uma regex de tag JSX costuma quebrar (e um teste que
        // quebra em código legítimo é pior que a lacuna que ele fecha).
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

  it("o wrapper da casa define os dois rótulos em português", () => {
    const code = stripComments(readFileSync(wrapper, "utf8"))
    expect(code).toContain('aria-label="Fechar"')
    expect(code).toContain('aria-label="Limpar busca"')
    // O rótulo tem de vir ANTES do espalhamento: é o `...rest` por último que
    // deixa o chamador sobrescrever sem perder o default.
    const fechar = code.indexOf('aria-label="Fechar"')
    const espalhamento = code.indexOf("{...rest}", fechar)
    expect(espalhamento).toBeGreaterThan(fechar)
  })

  it("todo chamador do wrapper importa o wrapper", () => {
    const callers = files.filter((file) =>
      readFileSync(file, "utf8").includes("<ModalCloseTrigger"),
    )
    // 11 pontos de montagem em 9 arquivos (feed-post-edit e configuracoes/conta
    // têm dois cada): é o número da varredura desta rodada, e cair abaixo dele
    // significa que um modal deixou de passar pelo wrapper.
    const sites = callers.reduce(
      (total, file) =>
        total + (readFileSync(file, "utf8").match(/<ModalCloseTrigger/g) ?? []).length,
      0,
    )
    expect(sites, "algum modal deixou de passar pelo wrapper").toBeGreaterThanOrEqual(11)
    for (const file of callers) {
      expect(readFileSync(file, "utf8"), file.slice(root.length + 1)).toMatch(
        /from "[^"]*close-button"/,
      )
    }
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
