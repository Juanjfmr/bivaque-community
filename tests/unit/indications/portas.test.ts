import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Um pedido de indicação tem UM endereço (ADR-20260925-memoria-de-indicacoes):
// /indicacoes/<id>. Antes, notificação, salvos, denúncia, Guia e Início abriam
// /recommendations?focus=…, uma lista longa onde o pedido tinha de ser achado
// de novo. LIMITE: leitura de fonte; a navegação real é provada no navegador.

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) => readFileSync(join(root, "apps", "web", ...segments), "utf8")

describe("toda porta de um pedido leva a /indicacoes/<id>", () => {
  it.each([
    [
      "notificação de resposta e alvo de denúncia",
      ["app", "(shell)", "notifications", "deep-links.ts"],
    ],
    ["denúncia", ["lib", "reports", "reports.ts"]],
    ["salvos", ["lib", "saves", "saved-items.ts"]],
    ["origem de um item do Guia", ["app", "(shell)", "guide", "[id]", "page.tsx"]],
    ["perguntas abertas do Início", ["app", "(shell)", "inicio", "questions-guide.tsx"]],
  ])("%s", (_name, path) => {
    const source = web(...path)
    expect(source).toContain("/indicacoes/")
    expect(source).not.toContain("/recommendations?focus=")
  })
})

describe("pedir leva à caixa de pedir", () => {
  it("o botão de criar e o atalho do Início usam o mesmo destino", () => {
    for (const path of [
      ["app", "components", "shell", "create-menu.tsx"],
      ["app", "components", "bivaque", "intent-launcher.tsx"],
    ]) {
      expect(web(...path)).toContain(
        'import { ASK_INDICATION_HREF } from "../../../lib/indications/indications"',
      )
    }
  })

  it("a página lê ?pedir=1 e foca a caixa", () => {
    expect(web("app", "(shell)", "indicacoes", "page.tsx")).toContain(
      'searchParams.get("pedir") === "1"',
    )
    expect(web("app", "components", "indications", "ask-indication.tsx")).toContain(
      "if (autoFocus) inputRef.current?.focus()",
    )
  })

  it("o cabeçalho leva a Indicações", () => {
    expect(web("app", "components", "bivaque", "app-shell.tsx")).toContain('href="/indicacoes"')
  })
})

describe("pedido em uma frase, sem trava nem aviso", () => {
  const ask = web("app", "components", "indications", "ask-indication.tsx")

  it("busca o que a cidade já perguntou antes de pedir", () => {
    expect(ask).toContain('supabase.rpc("list_indications"')
    expect(ask).toContain("Já perguntaram")
  })

  it("publica na cidade com detalhe opcional", () => {
    expect(ask).toContain("locality_id: localityId")
    expect(ask).toContain("body: details.trim()")
  })

  it("não avisa nem barra saúde", () => {
    expect(ask).not.toMatch(/saude_bem_estar/)
    expect(ask).not.toMatch(/todos os membros da cidade verão/i)
  })
})
