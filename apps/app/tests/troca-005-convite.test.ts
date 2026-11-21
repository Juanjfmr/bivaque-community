import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// TROCA-005 — contrato de fonte do convite de prestador na entrada: é estado da
// entrada (token na busca), não uma rota nova.

const raiz = join(import.meta.dirname, "..")
const ler = (caminho: string) => readFileSync(join(raiz, caminho), "utf8")

const convite = ler(join("src", "entrada", "AceiteDeConviteDePrestador.tsx"))
const entrada = ler(join("src", "entrada", "TelaDeEntrada.tsx"))
const rotas = ler(join("lib", "navegacao", "rotas.ts"))

describe("TROCA-005 — convite de prestador na entrada", () => {
  it("a entrada lê o token da busca e desenha o aceite, sem rota nova", () => {
    expect(entrada).toContain('get("prestador")')
    expect(entrada).toContain("<AceiteDeConviteDePrestador")
    expect(convite).toContain("Aceitar convite")
    expect(convite).toContain("lerConviteDePrestador")
    expect(convite).toContain("aceitarConviteDePrestador")
  })

  it("token inválido, expirado e usado têm frase própria", () => {
    expect(convite).toContain("convite já foi aceito")
    expect(convite).toContain("convite expirou")
    expect(convite).toContain("revogado")
    // Token inválido ou desconhecido cai na fronteira de leitura (indisponível),
    // nunca num convite inventado.
    expect(convite).toContain("FalhaDaLeitura")
  })

  it("não criou rota nova para o convite", () => {
    expect(rotas).not.toContain("prestador-convite")
  })
})
