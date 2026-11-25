import { describe, expect, it } from "vitest"
import type { InicioDaCidade } from "@/lib/dados/inicio"
import { inicioVazio, vazioDoInicio } from "@/src/inicio/vazio"

// O vazio da Início (BUG-CIDADE-GRUPOS) só afirma o que a consulta confirmou:
// numa cidade sem conteúdo nenhum, nenhuma contagem, nenhum nome de terceiro e
// nenhuma promessa de lista — só o próximo passo que cria conteúdo.

function cidadeCom(partes: Partial<InicioDaCidade>): InicioDaCidade {
  return {
    cidade: "Manaus",
    perguntas: [],
    eventos: [],
    anuncios: [],
    negocios: [],
    grupos: [],
    proximo: null,
    ...partes,
  }
}

describe("vazio do início", () => {
  it("reconhece a cidade vazia e não chama de vazia a que tem conteúdo", () => {
    expect(inicioVazio(cidadeCom({}))).toBe(true)
    expect(
      inicioVazio(
        cidadeCom({
          eventos: [{ id: "e", title: "Café", local: null, comecaEm: null }],
        }),
      ),
    ).toBe(false)
    expect(
      inicioVazio(
        cidadeCom({
          grupos: [{ id: "g", nome: "Vizinhos", membros: 1 }],
        }),
      ),
    ).toBe(false)
    // Sem resposta ainda não é vazio: é carregando.
    expect(inicioVazio(null)).toBe(false)
  })

  it("o texto nomeia a cidade e não promete conteúdo que não existe", () => {
    const vazio = vazioDoInicio("Santa Maria")
    expect(vazio.titulo).toContain("Santa Maria")
    expect(vazio.texto).toContain("publicar")
    // Nada de contagem nem de perguntas: a consulta disse que não há nenhuma.
    expect(`${vazio.titulo} ${vazio.texto}`).not.toMatch(/\d/)
    expect(`${vazio.titulo} ${vazio.texto}`).not.toMatch(/perguntas?/i)
  })
})
