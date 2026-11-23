import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// TROCA-005 — contrato de fonte da Ajuda: a lista única com chamados e
// denúncias, e a denúncia nova/detalhe na Folha única do NAV-001.

const raiz = join(import.meta.dirname, "..")
const ler = (caminho: string) => readFileSync(join(raiz, caminho), "utf8")

const ajuda = ler(join("src", "telas", "Ajuda.tsx"))
const rotas = ler(join("lib", "navegacao", "rotas.ts"))

describe("TROCA-005 — Ajuda com chamados e denúncias", () => {
  it("tem a lista única com as duas seções", () => {
    expect(ajuda).toContain('{ id: "chamados", rotulo: "Meus chamados" }')
    expect(ajuda).toContain('{ id: "denuncias", rotulo: "Minhas denúncias" }')
    expect(ajuda).toContain('busca["aba"]')
    expect(ajuda).toContain("useTrocarBusca")
  })

  it("a nova denúncia e o detalhe moram na Folha única", () => {
    expect(ajuda).toContain('sobreposicao="denuncia-nova"')
    expect(ajuda).toContain('sobreposicao="denuncia-detalhe"')
    expect(ajuda).toContain("Nova denúncia")
    expect(ajuda).toContain("Enviar denúncia")
    expect(ajuda).toContain("lerDenuncia")
    expect(ajuda).toContain("lerDenuncias")
  })

  it("carrega páginas seguintes sem perder a lista anterior", () => {
    expect(ajuda).toContain("carregarMais")
    expect(ajuda).toContain("depois:")
    expect(ajuda).toContain("proximo")
    expect(ajuda).toContain(
      "Não foi possível carregar mais denúncias. As anteriores continuam aqui.",
    )
  })

  it("detalhe e denúncia nova abrem pela URL e a recarga reabre", () => {
    expect(ajuda).toContain('busca["denuncia"]')
    expect(ajuda).toContain('busca["denunciar"]')
    expect(ajuda).toContain("alvoDaBusca")
    // A Folha fica na URL do detalhe; abrir escreve o id na busca e não
    // espalha o `?denunciar=` do formulário (B2 da correção 1).
    expect(ajuda).toContain("denuncia: id")
    expect(ajuda).not.toContain("...busca")
    // Fechar tira o id, senão a recarga reabriria a Folha fechada.
    expect(ajuda).toContain('busca["denuncia"] !== undefined')
    // Enviar ou fechar a denúncia nova também tira o alvo da URL.
    expect(ajuda).toContain('busca["denunciar"] !== undefined')
    // O alvo da URL chega ao formulário como opção escolhida.
    expect(ajuda).toContain("alvoInicial={alvoDaUrl}")
  })

  it("a Ajuda ainda responde pelas perguntas da conta", () => {
    expect(ajuda).toContain('"Preciso de senha para entrar?"')
    expect(ajuda).toContain("o Bivaque não usa senha")
  })

  it("não criou rota nova de denúncia", () => {
    expect(rotas).not.toContain('"denuncias"')
  })
})
