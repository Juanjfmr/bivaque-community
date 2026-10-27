import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { guardarMensagemDePrevia, lerMensagensDePrevia } from "../lib/contexto-conversa"
import { guardarRascunhoDoGrupo, lerRascunhosDoGrupo } from "../lib/grupos-locais"
import { criarPerguntaLocal, lerPerguntasLocais } from "../lib/perguntas-locais"
import { criarRascunhoCriacao, lerRascunhosCriacao } from "../lib/rascunhos-criacao"
import { lerRascunhosImoveis, salvarRascunhoImovel } from "../lib/rascunhos-imoveis"

const imovel = {
  titulo: "Apartamento para alugar",
  tipo: "apartamento",
  finalidade: "aluguel",
  bairro: "Centro",
  preco: 1000,
  quartos: 2,
  area: 60,
  vagas: 1,
  descricao: "Exemplo",
} as const
const criacao = {
  titulo: "Mesa de jantar",
  complemento: "Centro",
  descricao: "Mesa seminova com cadeiras",
  valor: 100,
  horario: null,
}

describe("limites locais preservam o conteúdo existente", () => {
  let valores: Map<string, string>
  beforeEach(() => {
    valores = new Map()
    const armazenamento = {
      getItem: (chave: string) => valores.get(chave) ?? null,
      setItem: (chave: string, valor: string) => valores.set(chave, valor),
    }
    vi.stubGlobal("sessionStorage", armazenamento)
    vi.stubGlobal("window", { sessionStorage: armazenamento })
  })
  afterEach(() => vi.unstubAllGlobals())

  for (const caso of [
    {
      nome: "imóveis",
      limite: 10,
      salvar: (i: number) =>
        salvarRascunhoImovel("Manaus", { ...imovel, titulo: `Apartamento número ${i}` }),
      ler: () => lerRascunhosImoveis("Manaus"),
    },
    {
      nome: "outras criações",
      limite: 30,
      salvar: (i: number) =>
        criarRascunhoCriacao("Manaus", "create-item", {
          ...criacao,
          titulo: `Mesa de jantar ${i}`,
        }),
      ler: () => lerRascunhosCriacao("Manaus"),
    },
    {
      nome: "grupo",
      limite: 10,
      salvar: (i: number) =>
        guardarRascunhoDoGrupo("Manaus", "grupo-1", `Rascunho de publicação ${i}`),
      ler: () => lerRascunhosDoGrupo("Manaus", "grupo-1"),
    },
    {
      nome: "conversa",
      limite: 30,
      salvar: (i: number) =>
        guardarMensagemDePrevia("Manaus", "conversa-1", `Mensagem de exemplo ${i}`),
      ler: () => lerMensagensDePrevia("Manaus", "conversa-1"),
    },
    {
      nome: "perguntas",
      limite: 30,
      salvar: (i: number) =>
        criarPerguntaLocal("Manaus", "localidade-1", `Quem recomenda eletricista ${i}?`, "Geral"),
      ler: () => lerPerguntasLocais("Manaus"),
    },
  ]) {
    it(`${caso.nome}: recusa excedente sem alterar os itens anteriores`, () => {
      for (let i = 0; i < caso.limite; i++) expect(caso.salvar(i)).not.toBeNull()
      const antes = JSON.stringify([...valores])
      expect(caso.salvar(caso.limite)).toBe("limite")
      expect(JSON.stringify([...valores])).toBe(antes)
      expect(caso.ler()).toHaveLength(caso.limite)
    })
  }

  it("mantém os limites separados por cidade e contexto", () => {
    for (let i = 0; i < 10; i++)
      guardarRascunhoDoGrupo("Manaus", "g1", `Publicação de exemplo ${i}`)
    expect(guardarRascunhoDoGrupo("Belém", "g1", "Outra publicação")).not.toBe("limite")
    expect(guardarRascunhoDoGrupo("Manaus", "g2", "Outra publicação")).not.toBe("limite")
  })

  it("lê todo o conteúdo legado acima do limite sem ocultar os primeiros itens", () => {
    valores.set(
      "bivaque:grupo-previa:manaus:g1:rascunhos",
      JSON.stringify(Array.from({ length: 11 }, (_, i) => `Publicação antiga ${i}`)),
    )
    valores.set(
      "bivaque:mensagens-previa:manaus:c1",
      JSON.stringify(
        Array.from({ length: 31 }, (_, i) => ({
          id: `antiga-${i}`,
          conteudo: `Mensagem antiga ${i}`,
        })),
      ),
    )
    expect(lerRascunhosDoGrupo("Manaus", "g1")).toHaveLength(11)
    expect(lerMensagensDePrevia("Manaus", "c1")).toHaveLength(31)
  })

  it("mantém validação e falha de armazenamento sem alegar sucesso", () => {
    expect(salvarRascunhoImovel("Manaus", { ...imovel, preco: 0 })).toBeNull()
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota")
      },
    })
    expect(guardarMensagemDePrevia("Manaus", "c1", "Mensagem válida")).toBeNull()
  })
})
