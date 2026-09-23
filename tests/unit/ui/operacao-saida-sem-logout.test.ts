import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// Decisão do dono (2026-09-10, commit cefa14d6): o shell de operação NÃO oferece
// "Sair da operação". A prancha 58 o desenha, mas é ação que sai da operação e
// não pertence à navegação do operador — a saída de sessão do membro vive no
// perfil. A única saída do shell é "Voltar ao Bivaque", que devolve ao produto
// preservando a sessão. Este teste trava a decisão no arquivo atual (o main
// substituiu operator-shell.tsx por (admin)/layout.tsx + operator-nav.tsx).

const root = join(import.meta.dirname, "..", "..", "..")
const adminLayout = join(root, "apps", "web", "app", "(admin)", "layout.tsx")
const operationProof = join(root, "scripts", "visual", "operation-proof.mjs")

describe("shell de operação — só 'Voltar ao Bivaque', sem logout (2026-09-10)", () => {
  it("o layout não renderiza 'Sair da operação'", () => {
    // Os comentários documentam a proibição e citam o rótulo; a varredura mira
    // código, não documentação (o comentário que explica a regra não pode ser a
    // prova de que ela é violada).
    const source = stripComments(readFileSync(adminLayout, "utf8"))
    expect(source).not.toContain("Sair da operação")
  })

  it("o layout mantém a saída 'Voltar ao Bivaque' para /inicio", () => {
    const source = stripComments(readFileSync(adminLayout, "utf8"))
    expect(source).toContain("Voltar ao Bivaque")
    expect(source).toContain('href="/inicio"')
  })

  it("a prova de runtime afirma a ausência em vez de exigir o texto", () => {
    // A prova não pode continuar clicando num rótulo que não existe: se exigir
    // "Sair da operação", fica vermelha para sempre; o contrato agora é a
    // ausência declarada nas três larguras.
    const source = readFileSync(operationProof, "utf8")
    expect(source).not.toMatch(/for \(const label of \[[^\]]*Sair da operação/)
    expect(source).toContain('"no-sair-da-operacao"')
    expect(source).toContain("Voltar ao Bivaque")
  })
})
