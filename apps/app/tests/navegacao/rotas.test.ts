import { describe, expect, it } from "vitest"

import {
  BASE_PUBLICA,
  buscaDoEnderecoAntigo,
  caminhoComParametros,
  ENDERECOS_ANTIGOS_DO_MERCADO,
  ESTADOS_DA_ENTRADA,
  lerAbaDaUrl,
  NOMES_DAS_33,
  ROTAS,
  rotaCanonica,
  rotaPorNome,
  SUBABAS_DO_MERCADO,
  tituloDaRota,
  urlPublica,
  validarParametros,
} from "../../lib/navegacao/rotas"

// Lista literal do inventário (seção 1). Não é derivada do catálogo: é o
// contrato que o catálogo precisa cumprir. `caminho` é o molde da rota, com o
// marcador do parâmetro quando existe — endereço montado só com parâmetro real.
const INVENTARIO: ReadonlyArray<readonly [nome: string, molde: string, titulo: string]> = [
  ["inicio", "/inicio", "Bivaque"],
  ["comunidade", "/comunidade", "Comunidade"],
  ["conversas", "/conversas", "Conversas"],
  ["conversa", "/conversa/$id", "Conversa"],
  ["voce", "/voce", "Você"],
  ["busca", "/busca", "Buscar"],
  ["catalogo", "/catalogo", "Desapegos"],
  ["desapegos", "/desapegos", "Desapegos"],
  ["imoveis", "/imoveis", "Imóveis"],
  ["negocios", "/negocios", "Mercado da cidade"],
  ["anuncio", "/anuncio/$id", "Anúncio"],
  ["negocio", "/negocio/$id", "Negócio local"],
  ["pergunta", "/pergunta/$id", "Indicação"],
  ["grupo", "/grupo/$id", "Grupo"],
  ["publicacao", "/publicacao/$id", "Publicação"],
  ["evento", "/evento/$id", "Encontro"],
  ["agenda", "/agenda", "Agenda da cidade"],
  ["salvos", "/salvos", "Salvos"],
  ["meus-anuncios", "/meus-anuncios", "Meus anúncios"],
  ["minhas", "/minhas", "Minhas indicações"],
  // Título dependente da cidade: o molde é o contrato, não um texto inventado.
  ["guia", "/guia", "Guia de {cidade}"],
  ["pedidos", "/pedidos", "Pedidos de serviço"],
  ["pedido", "/pedido/$id", "Pedido de serviço"],
  ["dono", "/dono", "Painel do Bivaque"],
  ["entrar", "/entrar/$estado", "Bivaque"],
  ["privacidade", "/privacidade", "Política de privacidade"],
  ["conduta", "/conduta", "Código de conduta"],
  ["ocultados", "/ocultados", "Ocultados"],
  ["bloqueados", "/bloqueados", "Pessoas bloqueadas"],
  ["ajuda", "/ajuda/$topico", "Ajuda"],
  ["contato", "/contato", "Fale com a gente"],
  ["chamados", "/chamados", "Meus chamados"],
  ["apagar-conta", "/apagar-conta", "Apagar a conta"],
]

// As duas rotas do inventário que também existem sem parâmetro.
const SEM_PARAMETRO: ReadonlyArray<readonly [nome: string, caminho: string]> = [
  ["entrar", "/entrar"],
  ["ajuda", "/ajuda"],
]

const PARAMETRIZADAS: ReadonlyArray<readonly [nome: string, chave: string, exemplo: string]> = [
  ["conversa", "id", "c-1"],
  ["anuncio", "id", "a-1"],
  ["negocio", "id", "n-1"],
  ["pergunta", "id", "q-1"],
  ["grupo", "id", "g-1"],
  ["publicacao", "id", "g-1~p-1"],
  ["evento", "id", "e-1"],
  ["pedido", "id", "p-1"],
  ["verbete", "id", "a-1"],
  ["entrar", "estado", "conta"],
  ["ajuda", "topico", "apagar-conta"],
]

describe("catálogo de rotas", () => {
  it("preserva os 33 nomes do inventário", () => {
    expect([...NOMES_DAS_33].sort()).toEqual(INVENTARIO.map(([nome]) => nome).sort())
    expect(NOMES_DAS_33).toHaveLength(33)
  })

  it("declara o molde e o título de cada rota do inventário", () => {
    for (const [nome, molde, titulo] of INVENTARIO) {
      const rota = rotaPorNome(nome)
      expect(rota, `rota ausente: ${nome}`).toBeDefined()
      expect(rota?.caminho, `molde de ${nome}`).toBe(molde)
      expect(rota?.titulo, `título de ${nome}`).toBe(titulo)
    }
  })

  it("é um endereço real /app/<nome> quando a rota não tem parâmetro", () => {
    const semParametro = INVENTARIO.filter(([nome]) => rotaPorNome(nome)?.parametro === null)
    expect(semParametro).toHaveLength(23)
    for (const [nome, molde] of semParametro) {
      expect(urlPublica(nome)).toBe(`${BASE_PUBLICA}${molde}`)
      expect(urlPublica(nome)?.startsWith("/app/")).toBe(true)
    }
  })

  it("monta o endereço com parâmetro real, nunca com o molde literal", () => {
    for (const [nome, chave, exemplo] of PARAMETRIZADAS) {
      const molde = rotaPorNome(nome)?.caminho ?? ""
      expect(molde).toContain(`$${chave}`)
      const url = urlPublica(nome, { [chave]: exemplo })
      expect(url, `endereço de ${nome}`).toBe(
        `${BASE_PUBLICA}${molde.replace(`$${chave}`, exemplo)}`,
      )
      expect(url).not.toContain("$")
    }
  })

  it("recusa montar endereço sem o parâmetro obrigatório, e aceita as duas formas sem parâmetro", () => {
    expect(urlPublica("conversa")).toBeNull()
    expect(urlPublica("pergunta", { id: "" })).toBeNull()
    expect(urlPublica("rota-que-nao-existe")).toBeNull()
    for (const [nome, caminho] of SEM_PARAMETRO) {
      expect(rotaPorNome(nome)?.caminhoSemParametro).toBe(caminho)
      expect(urlPublica(nome)).toBe(`${BASE_PUBLICA}${caminho}`)
    }
    for (const [nome] of SEM_PARAMETRO) {
      expect(urlPublica(nome, {})).toBe(`${BASE_PUBLICA}${rotaPorNome(nome)?.caminhoSemParametro}`)
    }
  })

  it("codifica Unicode, espaço e separadores no parâmetro", () => {
    const caminho = caminhoComParametros("pergunta", { id: "mudança de cidade/2026" })
    expect(caminho).toBe("/pergunta/mudan%C3%A7a%20de%20cidade%2F2026")
    expect(caminho).not.toContain(" ")
    expect(urlPublica("conversa", { id: "Fila do SUS ?!" })).toBe(
      "/app/conversa/Fila%20do%20SUS%20%3F!",
    )
    // O `~` do id de publicação é seguro e não precisa virar escape.
    expect(urlPublica("publicacao", { id: "g-1~p-1" })).toBe("/app/publicacao/g-1~p-1")
  })

  it("mantém o Mercado como a rota das três sub-abas, com a aba na busca", () => {
    expect(rotaPorNome("mercado")?.caminho).toBe("/mercado")
    expect(rotaPorNome("mercado")?.dono).toBe("mercado")
    expect([...SUBABAS_DO_MERCADO]).toEqual(["desapegos", "imoveis", "negocios"])
    expect(lerAbaDaUrl({})).toBe("desapegos")
    expect(lerAbaDaUrl({ aba: "desapegos" })).toBe("desapegos")
    expect(lerAbaDaUrl({ aba: "imoveis" })).toBe("imoveis")
    expect(lerAbaDaUrl({ aba: "negocios" })).toBe("negocios")
    expect(lerAbaDaUrl({ aba: "fora-da-lista" })).toBe("desapegos")
    expect(urlPublica("mercado")).toBe("/app/mercado")
  })

  it("cada endereço antigo do Mercado leva à aba que representava (NAV-002)", () => {
    expect(buscaDoEnderecoAntigo("catalogo", {})).toEqual({ aba: "desapegos" })
    expect(buscaDoEnderecoAntigo("desapegos", {})).toEqual({ aba: "desapegos" })
    expect(buscaDoEnderecoAntigo("imoveis", {})).toEqual({ aba: "imoveis" })
    // Os filtros que vieram na URL seguem para o destino.
    expect(buscaDoEnderecoAntigo("desapegos", { q: "mesa", preco_min: "10000" })).toEqual({
      aba: "desapegos",
      q: "mesa",
      preco_min: "10000",
    })
    expect(buscaDoEnderecoAntigo("imoveis", { bairro: "Centro", quartos: "2" })).toEqual({
      aba: "imoveis",
      bairro: "Centro",
      quartos: "2",
    })
    // O Mercado e as demais rotas não redirecionam.
    expect(buscaDoEnderecoAntigo("mercado", { aba: "imoveis" })).toBeNull()
    expect(buscaDoEnderecoAntigo("inicio", {})).toBeNull()
  })

  it("o destino dos endereços antigos é o Mercado, sem ciclo nem volta", () => {
    for (const nome of Object.keys(ENDERECOS_ANTIGOS_DO_MERCADO)) {
      expect(rotaPorNome(nome)?.dono, `aba de ${nome}`).toBe("mercado")
      expect(rotaCanonica(nome), `destino de ${nome}`).toBe("mercado")
      expect(rotaCanonica("mercado")).toBe("mercado")
    }
    expect(rotaCanonica("inicio")).toBe("inicio")
    // Nenhuma rota declara um endereço antigo como pai: o Voltar interno nunca
    // monta um endereço que não existe mais.
    for (const rota of ROTAS) {
      expect(ENDERECOS_ANTIGOS_DO_MERCADO[rota.pai ?? ""], `pai de ${rota.nome}`).toBe(undefined)
    }
  })

  it("leva /app ao início", () => {
    expect(BASE_PUBLICA).toBe("/app")
    expect(rotaPorNome("inicio")?.caminho).toBe("/inicio")
  })

  it("recusa parâmetro ausente, vazio ou estado de entrada fora da lista", () => {
    expect(validarParametros("conversa", { id: "c-1" })).toEqual({ ok: true })
    expect(validarParametros("conversa", {}).ok).toBe(false)
    expect(validarParametros("conversa", { id: "  " }).ok).toBe(false)
    expect(validarParametros("entrar", { estado: "conta" })).toEqual({ ok: true })
    expect(validarParametros("entrar", { estado: "nao-existe" }).ok).toBe(false)
    expect(ESTADOS_DA_ENTRADA).toHaveLength(19)
    expect(validarParametros("ajuda", { topico: "apagar-conta" })).toEqual({ ok: true })
    expect(validarParametros("inicio", {}).ok).toBe(true)
    expect(validarParametros("rota-que-nao-existe", {}).ok).toBe(false)
  })

  it("resolve o título dependente da cidade em vez de inventar texto", () => {
    expect(tituloDaRota("guia", "Manaus")).toBe("Guia de Manaus")
    expect(tituloDaRota("guia")).toBe("Guia de {cidade}")
    expect(tituloDaRota("inicio")).toBe("Bivaque")
    expect(() => tituloDaRota("rota-que-nao-existe")).toThrow()
  })

  it("conhece o pai de cada detalhe, para o Voltar sem link direto", () => {
    expect(rotaPorNome("pergunta")?.pai).toBe("comunidade")
    expect(rotaPorNome("conversa")?.pai).toBe("conversas")
    expect(rotaPorNome("negocio")?.pai).toBe("negocios")
    expect(rotaPorNome("ajuda")?.pai).toBe("voce")
    expect(rotaPorNome("inicio")?.pai).toBeNull()
    expect(ROTAS.filter((rota) => rota.nome === "inicio")).toHaveLength(1)
  })

  it("o verbete do Guia é endereço próprio, fora dos 33 do inventário", () => {
    const verbete = rotaPorNome("verbete")
    expect(verbete?.caminho).toBe("/guia/$id")
    expect(verbete?.parametro).toBe("id")
    expect(verbete?.titulo).toBe("Referência")
    // O Voltar de um link direto ao verbete cai na lista do Guia.
    expect(verbete?.pai).toBe("guia")
    expect(urlPublica("verbete", { id: "a-1" })).toBe("/app/guia/a-1")
    expect(NOMES_DAS_33).not.toContain("verbete")
  })
})
