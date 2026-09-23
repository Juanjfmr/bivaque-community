import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// F1 da auditoria de produção (rodada seguinte ao ITEM 9). A rodada anterior
// fechou o vazamento em recommendation-requests.tsx e o escopo foi nomeado por
// ARQUIVO: o formulário "Pedir indicação" continuou mostrando o texto cru do
// PostgREST dentro do alerta de perigo.
//
// Este teste guarda a ROTA inteira, não um arquivo: as duas metades do aceite
// (frase de produto na tela, causa real no log) e a fiação dos três arquivos que
// o fluxo de indicação renderiza.

import {
  READ_FAILURE_COPY,
  type ReadOperation,
  readFailure,
  WRITE_FAILURE_COPY,
  type WriteOperation,
  writeFailure,
} from "web/lib/recommendations/write-failure-copy"
import { stripComments } from "../ui/source-scan"

const root = join(import.meta.dirname, "..", "..", "..")
const ler = (...partes: string[]) => readFileSync(join(root, ...partes), "utf8")

const MODULO = ler("apps", "web", "lib", "recommendations", "write-failure-copy.ts")
const PAGINA = ler("apps", "web", "app", "(shell)", "recommendations", "page.tsx")
const GUIA = ler("apps", "web", "app", "components", "bivaque", "guide-first-request.tsx")
const PEDIDOS = ler("apps", "web", "app", "components", "bivaque", "recommendation-requests.tsx")

// As varreduras de ausência olham CÓDIGO, não documentação: estes arquivos
// nomeiam em comentário justamente o que é proibido (`raw_message`, o texto cru
// do PostgREST), e o comentário que explica a proibição derrubaria a asserção.
const CODIGO = {
  modulo: stripComments(MODULO),
  pagina: stripComments(PAGINA),
  guia: stripComments(GUIA),
  pedidos: stripComments(PEDIDOS),
}

const ESCRITAS = Object.keys(WRITE_FAILURE_COPY) as WriteOperation[]
const LEITURAS = Object.keys(READ_FAILURE_COPY) as ReadOperation[]

// O erro PostgREST que o verificador independente viu na tela.
const CRU = 'column "x_interno_auditoria" does not exist'

// Vocabulário de banco/infraestrutura que nunca pode chegar à tela.
const JARGAO = [
  "x_interno",
  "does not exist",
  "column",
  "relation",
  "violates",
  "duplicate key",
  "null value",
  "permission denied",
  "PGRST",
  "PostgREST",
  "SQL",
  "schema",
]

// As duas formas exatas que o defeito tinha: a mensagem crua indo DIRETO para o
// setState, sem passar por writeFailure/readFailure. A chamada correta
// (`setError(readFailure("x", err.message))`) não casa com nenhuma das duas.
const REPASSE_CRU = [
  /set[A-Z]\w*\(\s*[A-Za-z_$]*[Ee]rror\.message\s*\)/,
  /set[A-Z]\w*\(\s*err instanceof Error \? err\.message/,
]

let erroEspiado: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  erroEspiado = vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  erroEspiado.mockRestore()
})

describe("frase de produto para escrita e para leitura", () => {
  it("nenhuma operação devolve a mensagem crua do servidor", () => {
    for (const operacao of ESCRITAS) expect(writeFailure(operacao, CRU)).not.toContain(CRU)
    for (const operacao of LEITURAS) expect(readFailure(operacao, CRU)).not.toContain(CRU)
  })

  it("toda frase é de produto: português, sem jargão de banco", () => {
    for (const operacao of ESCRITAS) {
      const mensagem = writeFailure(operacao, CRU)
      expect(mensagem, `escrita ${operacao}`).toMatch(/^Não foi possível /)
      for (const termo of JARGAO) {
        expect(mensagem.toLowerCase(), `escrita ${operacao}`).not.toContain(termo.toLowerCase())
      }
    }
    for (const operacao of LEITURAS) {
      const mensagem = readFailure(operacao, CRU)
      expect(mensagem, `leitura ${operacao}`).toMatch(/^Não foi possível /)
      for (const termo of JARGAO) {
        expect(mensagem.toLowerCase(), `leitura ${operacao}`).not.toContain(termo.toLowerCase())
      }
    }
  })

  it("a operação que falhou é identificável: uma frase distinta por operação", () => {
    const frases = [
      ...ESCRITAS.map((operacao) => WRITE_FAILURE_COPY[operacao]),
      ...LEITURAS.map((operacao) => READ_FAILURE_COPY[operacao]),
    ]
    expect(new Set(frases).size).toBe(frases.length)
    expect(WRITE_FAILURE_COPY.publicar_pedido).toContain("publicar seu pedido")
    expect(WRITE_FAILURE_COPY.entrar_no_grupo).toContain("entrar no grupo")
    expect(READ_FAILURE_COPY.carregar_recomendacoes).toContain("carregar as recomendações")
  })

  it("a leitura registra a causa pelo logger do projeto, sem redigi-la", () => {
    readFailure("carregar_recomendacoes", CRU)
    expect(erroEspiado).toHaveBeenCalledTimes(1)
    const registro = JSON.parse(String(erroEspiado.mock.calls[0]?.[0] ?? "")) as Record<
      string,
      unknown
    >
    expect(registro.level).toBe("error")
    // Evento distinto do de escrita: quem depura separa "não leu" de "não gravou".
    expect(registro.msg).toBe("recommendation_read_failed")
    expect(registro.operation).toBe("carregar_recomendacoes")
    // A causa precisa sobreviver: `raw_message` seria [REDACTED] e voltaria a
    // engolir exatamente o que este caminho existe para preservar.
    expect(registro.serverMessage).toBe(CRU)
    expect(registro.serverMessage).not.toBe("[REDACTED]")
  })
})

describe("nenhum ponto da rota repassa erro cru ao usuário", () => {
  it("page.tsx não passa mensagem de servidor direto para nenhum setState", () => {
    for (const padrao of REPASSE_CRU) {
      expect(CODIGO.pagina, `padrão ${padrao}`).not.toMatch(padrao)
    }
  })

  it("guide-first-request.tsx e recommendation-requests.tsx também não", () => {
    for (const fonte of [CODIGO.guia, CODIGO.pedidos]) {
      for (const padrao of REPASSE_CRU) {
        expect(fonte, `padrão ${padrao}`).not.toMatch(padrao)
      }
    }
  })

  it("toda falha da página passa pela operação identificada do módulo", () => {
    const usadas = [...CODIGO.pagina.matchAll(/\b(write|read)Failure\(\s*"([a-z_]+)"/g)].map(
      (m) => ({
        tipo: m[1],
        operacao: m[2] as string,
      }),
    )
    expect(usadas.length).toBe(5)
    for (const { tipo, operacao } of usadas) {
      if (tipo === "write") expect(ESCRITAS).toContain(operacao as WriteOperation)
      else expect(LEITURAS).toContain(operacao as ReadOperation)
    }
    expect(usadas.map((u) => u.operacao).sort()).toEqual([
      "carregar_recomendacoes",
      "carregar_salvos",
      "entrar_no_grupo",
      "publicar_pedido",
      "remover_pedido_salvo",
    ])
  })

  it("as cargas do painel de Pedidos levam a causa junto", () => {
    expect(CODIGO.pedidos).toMatch(
      /readFailure\(\s*"carregar_pedidos",\s*requestError\.message\s*\)/,
    )
    expect(CODIGO.pedidos).toMatch(
      /readFailure\(\s*"carregar_respostas_e_salvos",\s*falhaDaCarga\.message\s*\)/,
    )
  })

  it("a busca do Guia segue com a frase de produto que já tinha", () => {
    // Ponto da varredura que ficou SEM tocar: um teste existente
    // (guide-first-request.test.ts) fixa esta frase DENTRO deste arquivo, e
    // reescrever a asserção dele para a frase vir do módulo é proibido nesta
    // rodada. O que se garante aqui é o que importa para quem usa: a tela
    // continua em português, sem texto de servidor.
    expect(CODIGO.guia).toContain("Não foi possível buscar no Guia agora. Tente novamente.")
  })

  it("usa o logger do projeto, nunca console direto", () => {
    for (const fonte of [CODIGO.pagina, CODIGO.guia, CODIGO.pedidos]) {
      expect(fonte).not.toMatch(/console\.(error|warn|info)\(/)
    }
    expect(CODIGO.pagina).toContain('from "../../../lib/recommendations/write-failure-copy"')
  })

  it("o módulo registra a causa em `serverMessage`, nunca em `raw_message`", () => {
    // `raw_message` está na lista de redação do logger: usá-lo viraria
    // [REDACTED] e engoliria a causa que este caminho existe para preservar.
    expect(CODIGO.modulo).not.toMatch(/raw_message/)
    expect(CODIGO.modulo).toMatch(/\{\s*operation,\s*serverMessage\s*\}/)
  })
})
