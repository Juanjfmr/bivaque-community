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

  it("o botão sem sessão preserva o token na memória, sem pôr o token no endereço", () => {
    // Nada de `location.assign("/app/entrar")` cru: sem o token, o convite morre.
    expect(convite).toContain("aoEntrar")
    // E nada de `location.assign` com o token no `redirect`: o aceite é estado da
    // entrada, e a barra e o histórico nunca recebem o token (M1 da correção 1).
    expect(entrada).not.toContain("/app/entrar?redirect=${")
    expect(entrada).not.toContain("window.location.replace(retornoDoConvite)")
    expect(entrada).toContain("setEntrandoNoConvite(true)")
    expect(entrada).toContain("retornoValido")
    // O token é credencial: sai da barra assim que é lido, e o `redirect` junto.
    expect(entrada).toContain('searchParams.delete("prestador")')
    expect(entrada).toContain('searchParams.delete("redirect")')
    expect(entrada).toContain("replaceState")
    // Depois do código, o aceite — não o funil de membro.
    expect(entrada).toContain('atual.etapa === "codigo"')
  })

  it("token inválido, expirado e usado têm frase própria", () => {
    expect(convite).toContain("convite já foi aceito")
    expect(convite).toContain("convite expirou")
    expect(convite).toContain("revogado")
    // A recusa de conta de membro mostra a frase do servidor.
    expect(convite).toContain('motivo === "conta-recusada"')
    expect(convite).toContain("mensagemDoServidor")
    // Token inválido ou desconhecido cai na fronteira de leitura (indisponível),
    // nunca num convite inventado.
    expect(convite).toContain("FalhaDaLeitura")
  })

  it("não criou rota nova para o convite", () => {
    expect(rotas).not.toContain("prestador-convite")
  })
})
