import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Um pedido de indicação tem UM endereço (ADR-20260925-memoria-de-indicacoes):
// /app/pergunta/<id>. Antes, notificação, salvos, denúncia, Guia e Início abriam
// /recommendations?focus=…, uma lista longa onde o pedido tinha de ser achado
// de novo. LIMITE: leitura de fonte; a navegação real é provada no navegador.

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) => readFileSync(join(root, "apps", "web", ...segments), "utf8")

describe("toda porta de um pedido leva a /app/pergunta/<id>", () => {
  it.each([
    ["notificação de resposta e alvo de denúncia", ["lib", "notifications", "deep-links.ts"]],
    ["denúncia", ["lib", "reports", "reports.ts"]],
    // RUN-186: a tela web de Salvos saiu com `lib/saves/saved-items.ts`; a tela
    // do app lista anúncio, publicação, pergunta e guia. O pedido salvo continua
    // com um endereço só (`/app/pergunta/<id>`), provado nos dois módulos acima.
    // O verbete do Guia é do app desde o F08: a página web que abria um pedido
    // de indicação saiu com a jornada, e a porta do pedido não mora mais ali.
    // F02-001: as perguntas abertas do Início antigo saíram com a tela; o Início
    // do app abre a pergunta em /app/pergunta/<id>.
  ])("%s", (_name, path) => {
    const source = web(...path)
    expect(source).toContain("/app/pergunta/")
    expect(source).not.toContain("/recommendations?focus=")
  })
})

describe("pedir leva à caixa de pedir", () => {
  it("o botão de criar usa o destino da caixa de pedir", () => {
    for (const path of [["app", "components", "shell", "create-menu.tsx"]]) {
      expect(web(...path)).toContain(
        'import { ASK_INDICATION_HREF } from "../../../lib/indications/indications"',
      )
    }
  })

  it("o cabeçalho leva a Indicações", () => {
    expect(web("app", "components", "bivaque", "app-shell.tsx")).toContain('href="/app/comunidade"')
  })
})

// O menu de mais opções é compartilhado com o feed: item sem ação não aparece.
// Antes, "Ocultar" e "Denunciar" apareciam na própria resposta e não faziam nada.
describe("menu de mais opções sem item morto", () => {
  const menu = web("app", "components", "bivaque", "feed-post-menu.tsx")

  it("ocultar e denunciar só existem quando alguém os executa", () => {
    expect(menu).toMatch(/\{onHide \? \(\s*<Dropdown\.Item key="hide"/)
    expect(menu).toMatch(/\{onReport \? \(\s*<Dropdown\.Item key="report"/)
  })
})
