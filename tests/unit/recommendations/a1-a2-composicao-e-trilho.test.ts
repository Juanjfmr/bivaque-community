import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "../ui/source-scan"

// Guardas dos dois achados que abriram o reparo r3 — a medida de leitura (A1) e
// o trilho de prévia (A2). Ambos já estão no código; este arquivo existe para
// que a próxima passada não os desfaça em silêncio.
//
// A1: a 1440 /recommendations era uma coluna única de 1152 px — busca de 1100,
// parágrafos de 1152 a 14 px (~130 caracteres por linha), sem medida em comum
// com a Home. Depois: rota de 896 px (a mesma medida da Home), texto corrido
// limitado por `measure-reading` (semantic.typography-reading-measure = 72ch) e
// a etapa comunitária em duas colunas (552 de leitura + 288 de trilho).
//
// A2: o painel 3 da prancha 45 ("Como seu pedido será publicado") não existia em
// lugar nenhum do produto.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const page = read("apps", "web", "app", "(shell)", "recommendations", "page.tsx")
const guide = read("apps", "web", "app", "components", "bivaque", "guide-first-request.tsx")
const requests = read("apps", "web", "app", "components", "bivaque", "recommendation-requests.tsx")

describe("A1 — medida compartilhada e largura de leitura", () => {
  it("a rota usa a mesma medida que a Home já provou", () => {
    const inicio = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")
    // A medida é literalmente a mesma string nos dois arquivos: não é uma
    // segunda medida inventada para a mesma coluna.
    const medida = "mx-auto flex w-full max-w-[56rem]"
    expect(inicio).toContain(medida)
    expect(page).toContain(medida)
  })

  it("o texto corrido do fluxo é limitado pela medida de leitura do produto", () => {
    // O utilitário do produto aplica semantic.typography-reading-measure (72ch).
    const globals = read("apps", "web", "app", "globals.css")
    expect(globals).toContain("max-inline-size: var(--semantic-typography-reading-measure)")

    // Subtítulo da rota, promessa da etapa do Guia, descrição de cada resultado.
    expect(page).toMatch(/className="measure-reading text-sm text-muted"/)
    expect(guide).toMatch(/className="measure-reading text-sm text-muted"/)
    expect(guide).toMatch(/className="measure-reading mt-1 text-sm leading-relaxed text-muted"/)
    // Corpo do pedido e corpo da resposta (a leitura longa medida em 1120 px).
    expect(requests).toMatch(/className="measure-reading text-sm text-muted">\{request\.body\}/)
    expect(requests).toContain("measure-reading flex flex-col gap-1 text-sm text-muted")
  })

  it("a etapa comunitária compõe duas colunas, com o trilho como segunda", () => {
    expect(page).toContain("lg:grid-cols-[minmax(0,1fr)_18rem]")
  })
})

describe("A2 — trilho de prévia da publicação", () => {
  it("existe, com o título e a frase exatos da prancha 45", () => {
    expect(page).toContain("Como seu pedido será publicado")
    expect(page).toContain("Esta é uma prévia de como sua publicação aparecerá para a comunidade.")
  })

  it("é um marco nomeado, não uma div decorativa", () => {
    expect(page).toContain('aria-label="Como seu pedido será publicado"')
    expect(page).toMatch(/<aside[^>]*aria-label="Como seu pedido será publicado"/)
  })

  it("desenha o que a prancha pede: ícone de conversa, título, autor, cidade e chip", () => {
    const trilho = page.slice(page.indexOf("function PublicationPreview"))
    expect(trilho).toContain("MessageCircle")
    expect(trilho).toContain("{displayName}")
    expect(trilho).toContain("{current.cityName}")
    expect(trilho).toContain("categoryLabel")
    expect(trilho).toContain("<Chip")
  })

  it("usa os dados REAIS do formulário, não conteúdo fictício", () => {
    // O componente recebe o estado do formulário...
    expect(page).toContain("title={requestTitle}")
    expect(page).toContain("description={requestDescription}")
    expect(page).toContain("category={requestCategory}")
    // ...e não carrega exemplo, cidade ou nome de pessoa chumbados.
    const trilho = page.slice(page.indexOf("function PublicationPreview"))
    expect(trilho).not.toMatch(/\b(Manaus|Recife|Brasília|Carlos|Ana|Lúcia)\b/)
    // Com o campo vazio ele diz o que vai aparecer, em vez de fingir um exemplo.
    expect(trilho).toContain("O título do seu pedido aparece aqui.")
    expect(trilho).toContain("O que você escrever na descrição aparece aqui.")
    expect(trilho).toContain("A categoria escolhida aparece aqui.")
  })

  it("não desenha controle sem operação", () => {
    const trilho = page.slice(page.indexOf("function PublicationPreview"))
    const codigo = stripComments(trilho)
    expect(codigo).not.toMatch(/<Button/)
    expect(codigo).not.toMatch(/<Link/)
    expect(codigo).not.toMatch(/onPress|onClick|href=/)
  })

  it("só existe na etapa comunitária: o Guia não ganha trilho inventado", () => {
    const guia = page.indexOf('requestStage === "guide" ?')
    const trilho = page.indexOf("<PublicationPreview")
    expect(guia).toBeGreaterThan(-1)
    expect(trilho).toBeGreaterThan(guia)
    // E ele vive no painel do pedido, antes do painel de Pedidos.
    expect(trilho).toBeLessThan(page.indexOf('hidden={selectedTab !== "requests"}'))
    // Nem o painel do Guia nem a lista de pedidos montam o trilho.
    expect(guide).not.toContain("Como seu pedido será publicado")
    expect(requests).not.toContain("Como seu pedido será publicado")
  })
})
