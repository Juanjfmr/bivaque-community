import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { getRedirectStatus } from "next/dist/lib/redirect-status"
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match"
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { ROTAS } from "../../../apps/app/lib/navegacao/rotas"
import nextConfig from "../../../apps/web/next.config"
import { routeFromFile } from "../../e2e/helpers/crawl-model"

const ID = "41000000-0000-4000-8000-000000000051"
const ORIGEM = "https://bivaque.example.invalid"
const TROCADAS = [
  [`/mercado/${ID}`, `/app/anuncio/${ID}`],
  [`/mercado/${ID}/editar`, `/app/anuncio/${ID}`],
  ["/mercado/novo", "/app/mercado"],
  ["/mercado/novo?categoria=eletronicos", "/app/mercado?categoria=eletronicos"],
  [`/imoveis/${ID}`, `/app/anuncio/${ID}`],
  // RUN-164: criar e editar imóvel saem da web; a lista é o destino do criar.
  ["/imoveis/novo", "/app/imoveis"],
  ["/imoveis/novo?tipo=casa", "/app/imoveis?tipo=casa"],
  [`/imoveis/${ID}/editar`, `/app/anuncio/${ID}`],
  // RUN-169: a gestão dos alertas de busca é do app.
  ["/imoveis/alertas", "/app/imoveis/alertas"],
  ["/imoveis/alertas?aba=imoveis", "/app/imoveis/alertas?aba=imoveis"],
  ["/mercado", "/app/mercado"],
  ["/mercado?preco_min=10000&pagina=2", "/app/mercado?preco_min=10000&pagina=2"],
  ["/imoveis", "/app/imoveis"],
  ["/imoveis?q=centro&quartos=2&valor_max=4000", "/app/imoveis?q=centro&quartos=2&valor_max=4000"],
  ["/meus-anuncios", "/app/meus-anuncios"],
  ["/guide", "/app/guia"],
  ["/guide/sugerir", "/app/guia"],
  ["/guide?q=escola&categoria=school", "/app/guia?q=escola&categoria=school"],
  ["/pedidos", "/app/pedidos"],
  [`/pedidos/${ID}`, `/app/pedido/${ID}`],
  [`/profile/${ID}`, `/app/perfil/${ID}`],
  // RUN-172: o perfil próprio e a edição saíram da web (ADR-20261116). As duas
  // regras exatas vêm antes da regra do id, que segue mandando o perfil alheio;
  // `?mudar=<id>` (CTA da consulta de cidade e rodapé do chip) chega ao Você.
  ["/profile", "/app/voce"],
  ["/profile/editar", "/app/voce"],
  // RUN-163: a tela de interesses saiu; o link da edição vai direto ao app e a
  // URL antiga (favorito, histórico) responde 307 com a query preservada.
  ["/profile/interests", "/app/voce"],
  [`/prestadores/${ID}`, `/app/negocio/${ID}`],
  ["/configuracoes/bloqueados", "/app/bloqueados"],
  ["/configuracoes/familia", "/app/voce"],
  ["/configuracoes/notificacoes", "/app/voce"],
  // RUN-184: a tela de conta saiu inteira (a seção vive no Você) e o índice junto —
  // ele só redirecionava para conta. A troca de e-mail ficou fora do lançamento por
  // decisão do dono em 17/11 (Ajuda); senha e recuperação já tinham saído pelo
  // ADR-20261101 §2. As duas exatas vêm antes da subárvore no next.config.
  ["/configuracoes", "/app/voce"],
  ["/configuracoes/conta", "/app/voce"],
  // RUN-186: a tela de Salvos saiu inteira — a página e o módulo que a alimentava.
  // O destino é a tela do app, com a query preservada pelo Next.
  ["/salvos", "/app/salvos"],
  ["/salvos?aba=guia", "/app/salvos?aba=guia"],
  ["/inicio", "/app/inicio"],
  ["/notifications", "/app/avisos"],
  ["/explorar/busca", "/app/busca"],
  ["/explorar/busca?q=termo", "/app/busca?q=termo"],
  // RUN-181: a última tela de busca da web (o painel de serviços) saiu. O
  // destino é a busca do app, que lê `q` e o alias `search` por si.
  ["/explorar/servicos", "/app/busca"],
  ["/explorar/servicos?q=climatiza", "/app/busca?q=climatiza"],
  ["/explorar", "/app/busca"],
  ["/events", "/app/agenda"],
  ["/events/novo", "/app/agenda"],
  [`/events/${ID}`, `/app/evento/${ID}`],
  [`/events/${ID}/editar`, `/app/evento/${ID}`],
  [`/events/${ID}/perguntas`, `/app/evento/${ID}`],
  // CIDADE-169: a consulta de cidade é tela do app; o id do catálogo vai junto.
  [`/cidade/${ID}`, `/app/cidade/${ID}`],
] as const

// Mesmos matchers do resolve-routes do Next, sem servidor. O helper experimental
// instalado perde as capturas de `has`, impedindo testar conversation pelo helper.
async function resolver(caminho: string) {
  const url = new URL(caminho, ORIGEM)
  const query = Object.fromEntries(url.searchParams)
  for (const regra of (await nextConfig.redirects?.()) ?? []) {
    const parametros = getPathMatch(regra.source)(url.pathname)
    if (!parametros) continue
    const condicoes = matchHas(new NextRequest(url), query, regra.has, regra.missing)
    if (!condicoes) continue
    const { newUrl, parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: regra.destination,
      params: { ...parametros, ...condicoes },
      query,
    })
    const destino = new URL(newUrl, ORIGEM)
    for (const [chave, valor] of Object.entries(parsedDestination.query)) {
      for (const item of Array.isArray(valor) ? valor : [valor]) {
        if (item !== undefined) destino.searchParams.append(chave, item)
      }
    }
    return Response.redirect(destino, getRedirectStatus(regra))
  }
  return new Response()
}

describe("LAN-TROCA fase 1", () => {
  it.each(TROCADAS)("%s preserva ID e query em 307 para %s, sem ciclo", async (de, para) => {
    const separador = de.includes("?") ? "&" : "?"
    const resposta = await resolver(`${de}${separador}origem=aviso&texto=ol%C3%A1`)
    expect(resposta.status).toBe(307)
    const destino = new URL(resposta.headers.get("location") ?? "", ORIGEM)
    const esperado = new URL(para, ORIGEM)
    expect(destino.pathname).toBe(esperado.pathname)
    expect(destino.searchParams.get("origem")).toBe("aviso")
    expect(destino.searchParams.get("texto")).toBe("olá")
    for (const [chave, valor] of esperado.searchParams) {
      expect(destino.searchParams.get(chave)).toBe(valor)
    }
    expect(
      (await resolver(`${destino.pathname}${destino.search}`)).headers.get("location"),
    ).toBeNull()
    expect(
      ROTAS.some((rota) => `/app${rota.caminho.replace("$id", ID)}` === destino.pathname),
    ).toBe(true)
  })

  // RUN-166: a pasta de mensagens saiu da web (a prova de ausência está no fim
  // do arquivo), mas a regra de redirect NÃO mudou — as três formas da URL
  // antiga continuam trocadas, com id e query preservados.
  it.each([
    ["/messages", "/app/conversas"],
    [`/messages?conversation=${ID}`, `/app/conversa/${ID}?conversation=${ID}`],
    [`/messages/${ID}`, `/app/conversa/${ID}`],
  ] as const)("%s (URL antiga de mensagens) segue em 307 para %s", async (de, para) => {
    const resposta = await resolver(de)
    expect(resposta.status).toBe(307)
    const destino = new URL(resposta.headers.get("location") ?? "", ORIGEM)
    const esperado = new URL(para, ORIGEM)
    expect(destino.pathname).toBe(esperado.pathname)
    for (const [chave, valor] of esperado.searchParams) {
      expect(destino.searchParams.get(chave)).toBe(valor)
    }
    expect(
      (await resolver(`${destino.pathname}${destino.search}`)).headers.get("location"),
    ).toBeNull()
  })

  it.each(["", "nao-e-uuid", `${ID}/editar`, `https://fora.example.invalid/${ID}`])(
    "conversation=%s inválido fica na caixa e não vira caminho",
    async (valor) => {
      const resposta = await resolver(`/messages?conversation=${encodeURIComponent(valor)}`)
      expect(resposta.status).toBe(307)
      expect(new URL(resposta.headers.get("location") ?? "", ORIGEM).pathname).toBe(
        "/app/conversas",
      )
    },
  )

  const shell = join(process.cwd(), "apps/web/app/(shell)")
  const paginas = readdirSync(shell, { recursive: true, encoding: "utf8" })
    .filter((arquivo) => arquivo.replaceAll("\\", "/").endsWith("/page.tsx"))
    .map((arquivo) => routeFromFile(arquivo).replace(/\[[^\]]+\]/g, ID))
  const trocadas = new Set(TROCADAS.map(([de]) => de.split("?")[0]))

  it.each(paginas.filter((caminho) => !trocadas.has(caminho)))(
    "%s continua na web, inclusive criação, edição e demais jornadas",
    async (caminho) => {
      expect((await resolver(caminho)).headers.get("location")).toBeNull()
      expect((await resolver(`${caminho}?q=teste`)).headers.get("location")).toBeNull()
      expect((await resolver(`${caminho}/`)).headers.get("location")).toBeNull()
    },
  )

  it.each(["/", "/api/app/pedidos", "/auth/callback", "/consent", "/admissions", "/prestador"])(
    "%s mantém seu portão ou fluxo próprio",
    async (caminho) => {
      expect((await resolver(caminho)).headers.get("location")).toBeNull()
    },
  )

  // RUN-164: as regras de criar/editar imóvel não engolem a lista de alertas
  // nem transformam um subcaminho qualquer num anúncio.
  it.each([`/imoveis/${ID}/denunciar`, "/imoveis/novo/editar"])(
    "%s não é capturado como anúncio de imóvel",
    async (caminho) => {
      const localizacao = (await resolver(caminho)).headers.get("location")
      const destino = localizacao === null ? "" : new URL(localizacao, ORIGEM).pathname
      expect(destino.startsWith("/app/anuncio"), `destino de ${caminho}`).toBe(false)
    },
  )

  // RUN-169: a lista de alertas saiu da web — nenhuma tela nem action sobra para
  // alguém "voltar" editando a pasta, e o form do detalhe saiu junto.
  it("a pasta antiga de alertas não deixa tela nem action para trás", () => {
    const pasta = join(shell, "imoveis/alertas")
    const sobras = existsSync(pasta)
      ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
      : []
    expect(sobras).toEqual([])
    expect(existsSync(join(shell, "imoveis", "alert-form.tsx"))).toBe(false)
  })

  it.each(["explorar", "explorar/busca", "explorar/servicos"])(
    "a pasta antiga %s não deixa tela nem action para trás",
    (relativa) => {
      // LT-002 removia só a busca; o RUN-181 levou o resto da pasta — o hub e o
      // painel de serviços. A prova é de ausência: o diretório não existe mais.
      const pasta = join(shell, relativa)
      const sobras = existsSync(pasta)
        ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
        : []
      expect(sobras).toEqual([])
    },
  )

  // CIDADE-169: a consulta de cidade e a referência da cidade são do app. A
  // prova é de ausência — nenhuma tela sobra para alguém "voltar" editando a
  // pasta, e o endereço antigo responde 307.
  it.each(["cidade", "localidade"])("a tela antiga %s não deixa arquivos para trás", (relativa) => {
    const pasta = join(shell, relativa)
    const sobras = existsSync(pasta)
      ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
      : []
    expect(sobras).toEqual([])
  })

  it("/localidade cai na consulta da cidade da própria sessão, com a query preservada", async () => {
    const resposta = await resolver("/localidade?de=email")
    expect(resposta.status).toBe(307)
    const destino = new URL(resposta.headers.get("location") ?? "", ORIGEM)
    expect(destino.pathname).toBe("/app/cidade/atual")
    expect(destino.searchParams.get("de")).toBe("email")
    expect((await resolver("/app/cidade/atual")).headers.get("location")).toBeNull()
  })

  // A regra é do segmento exato: subárvore de `/localidade` nunca existiu e
  // continua sem redirect, em vez de virar consulta por acidente.
  it.each(["/localidade/qualquer", `/cidade/${ID}/editar`])(
    "%s não é capturado pela consulta",
    async (caminho) => {
      expect((await resolver(caminho)).headers.get("location")).toBeNull()
    },
  )

  // F05: a tela antiga sai inteira — nenhum page.tsx e nenhuma action sobram
  // para alguém "voltar" editando a pasta. A prova é de ausência: o diretório
  // não existe mais no checkout. A falha lista o que sobrou, para o bloqueio
  // nunca ser "um teste vermelho" sem nome.
  it("a pasta antiga de eventos não deixa tela nem action para trás", () => {
    const pasta = join(shell, "events")
    const sobras = existsSync(pasta)
      ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
      : []
    expect(sobras).toEqual([])
  })

  // RUN-184: a árvore de configurações saiu inteira — a conta, o índice, os resíduos
  // de bloqueados/família e as actions (trust-actions.ts) morreram com a troca.
  // RUN-186: salvos saiu pelo mesmo molde. A prova é de ausência: o diretório não
  // existe mais no checkout.
  it.each(["notifications", "configuracoes", "messages", "salvos"])(
    "a pasta antiga %s não deixa tela nem action para trás",
    (relativa) => {
      const pasta = join(shell, relativa)
      const sobras = existsSync(pasta)
        ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
        : []
      expect(sobras).toEqual([])
    },
  )

  it.each(["mercado", "imoveis", "guide"])(
    "a lista antiga de %s não deixa page.tsx para trás",
    (nome) => {
      const arquivo = join(shell, nome, "page.tsx")
      expect(existsSync(arquivo), `arquivo de página que sobrou: ${arquivo}`).toBe(false)
    },
  )

  // F06 resíduo: criar e editar desapego e imóvel saíram sem deixar page.tsx
  // para trás (RUN-156 e RUN-164).
  it.each(["mercado/novo", "mercado/[id]/editar", "imoveis/novo", "imoveis/[id]/editar"])(
    "a página trocada %s não deixa page.tsx para trás",
    (relativa) => {
      const arquivo = join(shell, relativa, "page.tsx")
      expect(existsSync(arquivo), `arquivo de página que sobrou: ${arquivo}`).toBe(false)
    },
  )

  it("a pasta antiga de meus-anuncios não deixa arquivos para trás", () => {
    const pasta = join(shell, "meus-anuncios")
    const sobras = existsSync(pasta)
      ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
      : []
    expect(sobras).toEqual([])
  })

  // F10: o perfil saiu inteiro da web. A prova é de ausência — nem o perfil de
  // outra pessoa, nem o próprio, nem a edição deixam tela ou action para
  // alguém "voltar" editando a pasta (RUN-163 e RUN-172).
  it("a pasta antiga do perfil não deixa tela nem action para trás", () => {
    const pasta = join(shell, "profile")
    expect(existsSync(pasta), `pasta que sobrou: ${pasta}`).toBe(false)
  })

  // RUN-163/RUN-172: `:id` continua mandando o id do perfil alheio, e as duas
  // rotas fixas (a edição e o próprio perfil) não são capturadas por ela — cada
  // uma tem a sua regra exata, que vence por vir antes.
  it.each([ID, "membro-1"])("/profile/%s segue para /app/perfil/:id", async (id) => {
    const resposta = await resolver(`/profile/${id}`)
    expect(resposta.status).toBe(307)
    expect(new URL(resposta.headers.get("location") ?? "", ORIGEM).pathname).toBe(
      `/app/perfil/${id}`,
    )
  })

  it.each(["editar", "interests"])("/profile/%s não é capturado pela regra do id", async (fixa) => {
    expect(
      new URL((await resolver(`/profile/${fixa}`)).headers.get("location") ?? "", ORIGEM).pathname,
    ).toBe("/app/voce")
  })

  // RUN-163: a tela de interesses saiu inteira — nem page.tsx, nem a seção, nem
  // as server actions sobram para alguém "voltar" editando a pasta.
  it("a tela antiga de interesses não deixa arquivos para trás", () => {
    const pasta = join(shell, "profile", "interests")
    const sobras = existsSync(pasta)
      ? readdirSync(pasta, { recursive: true, encoding: "utf8" })
      : []
    expect(sobras).toEqual([])
    expect(existsSync(join(shell, "profile", "interests-section.tsx"))).toBe(false)
    expect(existsSync(join(shell, "profile", "interests-actions.ts"))).toBe(false)
  })
})
