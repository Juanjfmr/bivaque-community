import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { HELP_TOPICS } from "web/app/(public)/ajuda/help-topics"

// PORT-006 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo itens 6 e 7:
// Ajuda pública, Conta apagada e páginas legais. Contrato de fonte, como as
// demais telas de tests/unit/ui.
const APP = join(process.cwd(), "apps", "web", "app")
const read = (...parts: string[]) => readFileSync(join(APP, ...parts), "utf8")

describe("conteúdo da Ajuda", () => {
  it("tem os quatro assuntos do protótipo, sem perder pergunta", () => {
    expect(HELP_TOPICS.map((topic) => topic.id)).toEqual([
      "conta",
      "comunidade",
      "anuncios",
      "seguranca",
    ])
    expect(HELP_TOPICS.map((topic) => topic.questions.length)).toEqual([5, 4, 5, 5])
  })

  it("não descreve o modo de teste do protótipo", () => {
    // "Neste teste nenhum e-mail é enviado" e "o chamado fica só neste
    // aparelho" descrevem o protótipo, não o produto: no Bivaque o e-mail sai e
    // o chamado é registrado. Copiar a frase seria mentir para quem lê.
    for (const topic of HELP_TOPICS) {
      for (const [, answer] of topic.questions) {
        expect(answer.toLowerCase()).not.toContain("neste teste")
        expect(answer.toLowerCase()).not.toContain("neste aparelho")
      }
    }
  })

  it("ensina a entrada por código no e-mail, não um fluxo de senha", () => {
    // RUN-187: ADR-20261101-entrada-unica-por-codigo §2 tirou e-mail e senha da
    // tela; a ajuda pública não pode vender o caminho que a entrada não tem.
    const conta = HELP_TOPICS.find((topic) => topic.id === "conta")
    expect(conta?.subtitle).toBe("CPF, convite, código")
    const par = conta?.questions.find(([pergunta]) => pergunta === "Preciso de senha para entrar?")
    expect(par).toBeDefined()
    expect(par?.[1]).toContain("o Bivaque não usa senha")
    expect(par?.[1]).toContain("Continuar com e-mail")
    expect(par?.[1]).toContain("código de 6 números")

    const respostas = HELP_TOPICS.flatMap((topic) => topic.questions.map(([, answer]) => answer))
    expect(respostas.join(" ").toLowerCase()).not.toContain("esqueci minha senha")
  })
})

describe("Ajuda pública", () => {
  const page = read("(public)", "ajuda", "page.tsx")

  it("abre sem sessão e só acrescenta o que depende dela", () => {
    expect(page).toContain("readSessionUser")
    expect(page).toContain("user ? (")
    expect(page).toContain("Meus chamados")
    expect(page).toContain("Fale com a gente")
    expect(page).toContain("SUPPORT_EMAIL")
  })

  it("lê os chamados do dono da sessão, nunca de um parâmetro", () => {
    expect(page).toContain('.eq("user_id", userId)')
    expect(page).not.toContain("searchParams")
  })

  it("distingue erro de lista vazia ao carregar chamados", () => {
    expect(page).toContain("tickets === null")
    expect(page).toContain("Não foi possível carregar seus chamados")
    expect(page).toContain("Nenhum chamado ainda")
  })

  it("o atalho de conta leva ao Você do app, não à tela antiga de configurações", () => {
    // RUN-184: a árvore `(shell)/configuracoes` saiu; o atalho da ajuda pública não
    // pode voltar a apontar para o endereço que agora é só redirect.
    expect(page).toContain('{ href: "/app/voce", label: "Configurações" }')
    expect(page).not.toContain("/configuracoes")
  })

  it("o atalho de Salvos leva à tela do app", () => {
    // RUN-186: `/salvos` saiu da web (307 para /app/salvos).
    expect(page).toContain('{ href: "/app/salvos", label: "Salvos" }')
  })
})

describe("Conta apagada", () => {
  const page = read("(preauth)", "conta-apagada", "page.tsx")

  it("usa o texto do protótipo e oferece a volta", () => {
    expect(page).toContain("Sua conta foi apagada.")
    expect(page).toContain("Obrigado por ter feito parte. Você pode voltar quando quiser.")
    expect(page).toContain("Voltar ao início")
    expect(page).toContain("<EntryShell")
  })

  it("não recebe parâmetro: não serve para descobrir se um e-mail existiu", () => {
    expect(page).not.toContain("searchParams")
    expect(page).not.toContain("params")
  })
})

describe("páginas legais", () => {
  it("usam a casca e a pele da entrada, com o documento versionado", () => {
    const documents: Record<string, string> = {
      privacidade: "PRIVACIDADE.md",
      "codigo-de-conduta": "CODIGO_DE_CONDUTA.md",
    }
    for (const [slug, document] of Object.entries(documents)) {
      const page = read("(preauth)", slug, "page.tsx")
      expect(page).toContain("<EntryShell")
      expect(page).toContain("LegalDocument")
      expect(page).toContain(document)
      expect(page).not.toContain("OnboardingShell")
    }
  })

  it("o renderizador conhece negrito, que o antigo mostrava com asteriscos", () => {
    const renderer = read("(preauth)", "privacidade", "legal-document.tsx")
    expect(renderer).toContain("BOLD")
    expect(renderer).toContain("<strong")
    expect(renderer).toContain('className="legal-p"')
  })
})

describe("landing", () => {
  const landing = read("landing", "landing.tsx")

  it("religa Ajuda e Fale com a gente", () => {
    expect(landing).toContain('href="/ajuda"')
    expect(landing).toContain('href="/ajuda#fale-com-a-gente"')
    expect(landing).toContain("Fale com a gente")
  })
})
