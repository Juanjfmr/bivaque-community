import { describe, expect, it } from "vitest"

import { abaAtiva, subAbaDoMercado } from "../../lib/navegacao/abas"
import type { Aba } from "../../lib/navegacao/rotas"

// [rota, origem guardada na entrada, aba que deve acender]
const CASOS: ReadonlyArray<readonly [nome: string, origem: Aba, esperada: Aba | null]> = [
  ["inicio", "mercado", "inicio"],
  ["comunidade", "inicio", "comunidade"],
  ["voce", "mercado", "voce"],
  // Mercado: a aba tem dono fixo, inclusive os catálogos e os detalhes.
  ["mercado", "inicio", "mercado"],
  ["catalogo", "voce", "mercado"],
  ["desapegos", "voce", "mercado"],
  ["imoveis", "inicio", "mercado"],
  ["negocios", "voce", "mercado"],
  ["anuncio", "comunidade", "mercado"],
  ["negocio", "voce", "mercado"],
  // Comunidade: dono fixo, a origem não sobrescreve.
  ["pergunta", "mercado", "comunidade"],
  ["grupo", "voce", "comunidade"],
  ["publicacao", "voce", "comunidade"],
  ["minhas", "voce", "comunidade"],
  // Conversas: só o ícone do topo, nenhuma aba inferior.
  ["conversas", "comunidade", null],
  ["conversa", "comunidade", null],
  // Várias portas: a aba é a origem da entrada.
  ["salvos", "comunidade", "comunidade"],
  ["salvos", "mercado", "mercado"],
  ["meus-anuncios", "voce", "voce"],
  ["meus-anuncios", "mercado", "mercado"],
  ["busca", "mercado", "mercado"],
  ["busca", "inicio", "inicio"],
  // Destinos de notificação com mais de uma porta.
  ["evento", "comunidade", "comunidade"],
  ["pedido", "voce", "voce"],
  ["agenda", "inicio", "inicio"],
  ["guia", "inicio", "inicio"],
  ["dono", "comunidade", null],
  ["entrar", "inicio", null],
  ["indisponivel", "mercado", "mercado"],
  // Dono fixo em Você.
  ["pedidos", "mercado", "voce"],
  ["privacidade", "inicio", "voce"],
  ["conduta", "mercado", "voce"],
  ["ocultados", "mercado", "voce"],
  ["bloqueados", "inicio", "voce"],
  ["ajuda", "mercado", "voce"],
  ["contato", "inicio", "voce"],
  ["chamados", "mercado", "voce"],
  ["apagar-conta", "inicio", "voce"],
]

describe("aba ativa", () => {
  it("segue o dono da rota e a origem por entrada", () => {
    for (const [nome, origem, esperada] of CASOS) {
      expect(abaAtiva(nome, origem), `${nome} com origem ${origem}`).toBe(esperada)
    }
  })

  it("não acende aba inferior em Conversas nem na conversa aberta", () => {
    expect(abaAtiva("conversas", "voce")).toBeNull()
    expect(abaAtiva("conversa", "voce")).toBeNull()
  })

  it("não acende aba inferior na entrada nem no painel do dono", () => {
    // Inventário §5: as duas trocam a casca e a navegação do app sai de cena.
    expect(abaAtiva("entrar", "inicio")).toBeNull()
    expect(abaAtiva("dono", "comunidade")).toBeNull()
  })

  it("não deixa a origem sobrescrever o dono fixo de pergunta, anúncio e negócio", () => {
    for (const origem of ["inicio", "comunidade", "mercado", "voce"] as const) {
      expect(abaAtiva("pergunta", origem)).toBe("comunidade")
      expect(abaAtiva("anuncio", origem)).toBe("mercado")
      expect(abaAtiva("negocio", origem)).toBe("mercado")
    }
  })

  it("aponta a sub-aba do Mercado", () => {
    expect(subAbaDoMercado("desapegos")).toBe("desapegos")
    expect(subAbaDoMercado("catalogo")).toBe("desapegos")
    expect(subAbaDoMercado("imoveis")).toBe("imoveis")
    expect(subAbaDoMercado("negocios")).toBe("negocios")
    expect(subAbaDoMercado("inicio")).toBeNull()
  })
})
