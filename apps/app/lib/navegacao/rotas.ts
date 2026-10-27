// Catálogo das rotas do app (onda 1b).
//
// A autoridade é a seção 1 do inventário (as 33 rotas), o ADR §3.1 (a barra
// nova, com Mercado e Conversas no topo) e o §3.2 (a aba ativa). O catálogo é
// dado puro: não conhece tela, roteador nem DOM.

export const BASE_PUBLICA = "/app"

export type Aba = "inicio" | "comunidade" | "mercado" | "voce"

/** Dono fixo da aba, ou a regra de origem por entrada, ou nenhuma aba. */
export type DonoDeAba = Aba | "origem" | "sem-aba"

/** Qual casca a rota usa: a do app, a da entrada ou a do painel do dono. */
export type Casca = "app" | "entrada" | "painel"

export type ParametroDeRota = "id" | "estado" | "topico"

export type NomeDeRota =
  | "inicio"
  | "comunidade"
  | "conversas"
  | "conversa"
  | "voce"
  | "busca"
  | "catalogo"
  | "desapegos"
  | "imoveis"
  | "negocios"
  | "anuncio"
  | "negocio"
  | "pergunta"
  | "grupo"
  | "publicacao"
  | "evento"
  | "agenda"
  | "salvos"
  | "meus-anuncios"
  | "minhas"
  | "guia"
  | "pedidos"
  | "pedido"
  | "dono"
  | "entrar"
  | "privacidade"
  | "conduta"
  | "ocultados"
  | "bloqueados"
  | "ajuda"
  | "contato"
  | "chamados"
  | "apagar-conta"
  | "mercado"
  | "indisponivel"

export type Rota = {
  readonly nome: NomeDeRota
  /** Molde do endereço, com `$<parâmetro>` quando a rota tem parâmetro. */
  readonly caminho: string
  /** Forma sem parâmetro, quando a rota existe das duas maneiras. */
  readonly caminhoSemParametro: string | null
  readonly parametro: ParametroDeRota | null
  readonly titulo: string
  readonly dono: DonoDeAba
  readonly casca: Casca
  readonly raiz: boolean
  /** Pai declarado, usado pelo Voltar quando não há pai na entrada. */
  readonly pai: NomeDeRota | null
}

export const ESTADOS_DA_ENTRADA = [
  "conta",
  "retomar",
  "aceite",
  "cpf",
  "resultado",
  "analise",
  "documento",
  "consulta-indisponivel",
  "convite-indisponivel",
  "cidade",
  "boas-vindas",
  "login",
  "senha",
  "convite",
  "apagada",
] as const

export type EstadoDaEntrada = (typeof ESTADOS_DA_ENTRADA)[number]

export const SUBABAS_DO_MERCADO = ["desapegos", "imoveis", "negocios"] as const

export type SubAbaDoMercado = (typeof SUBABAS_DO_MERCADO)[number]

type LinhaDoCatalogo = readonly [
  nome: NomeDeRota,
  caminho: string,
  titulo: string,
  dono: DonoDeAba,
  extras: {
    parametro?: ParametroDeRota
    semParametro?: string
    casca?: Casca
    raiz?: boolean
    pai?: NomeDeRota
  },
]

const LINHAS: readonly LinhaDoCatalogo[] = [
  ["inicio", "/inicio", "Bivaque", "inicio", { raiz: true }],
  ["comunidade", "/comunidade", "Comunidade", "comunidade", { raiz: true }],
  ["conversas", "/conversas", "Conversas", "sem-aba", { raiz: true }],
  ["conversa", "/conversa/$id", "Conversa", "sem-aba", { parametro: "id", pai: "conversas" }],
  ["voce", "/voce", "Você", "voce", { raiz: true }],
  ["busca", "/busca", "Buscar", "origem", { pai: "inicio" }],
  ["catalogo", "/catalogo", "Desapegos", "mercado", { pai: "inicio" }],
  ["desapegos", "/desapegos", "Desapegos", "mercado", { pai: "inicio" }],
  ["imoveis", "/imoveis", "Imóveis", "mercado", { pai: "inicio" }],
  ["negocios", "/negocios", "Negócios locais", "mercado", { pai: "inicio" }],
  ["mercado", "/mercado", "Mercado", "mercado", { pai: "inicio" }],
  ["anuncio", "/anuncio/$id", "Anúncio", "mercado", { parametro: "id", pai: "desapegos" }],
  ["negocio", "/negocio/$id", "Negócio local", "mercado", { parametro: "id", pai: "negocios" }],
  ["pergunta", "/pergunta/$id", "Indicação", "comunidade", { parametro: "id", pai: "comunidade" }],
  ["grupo", "/grupo/$id", "Grupo", "comunidade", { parametro: "id", pai: "comunidade" }],
  [
    "publicacao",
    "/publicacao/$id",
    "Publicação",
    "comunidade",
    { parametro: "id", pai: "comunidade" },
  ],
  ["evento", "/evento/$id", "Encontro", "origem", { parametro: "id", pai: "agenda" }],
  ["agenda", "/agenda", "Agenda da cidade", "origem", { pai: "inicio" }],
  ["salvos", "/salvos", "Salvos", "origem", { pai: "voce" }],
  ["meus-anuncios", "/meus-anuncios", "Meus anúncios", "origem", { pai: "voce" }],
  ["minhas", "/minhas", "Minhas indicações", "comunidade", { pai: "comunidade" }],
  // Título dependente da cidade: o molde fica no catálogo e a cidade é dado.
  ["guia", "/guia", "Guia de {cidade}", "origem", { pai: "inicio" }],
  ["pedidos", "/pedidos", "Pedidos de serviço", "voce", { pai: "voce" }],
  ["pedido", "/pedido/$id", "Pedido de serviço", "origem", { parametro: "id", pai: "pedidos" }],
  ["dono", "/dono", "Painel do Bivaque", "sem-aba", { casca: "painel", pai: "inicio" }],
  [
    "entrar",
    "/entrar/$estado",
    "Bivaque",
    "sem-aba",
    { parametro: "estado", semParametro: "/entrar", casca: "entrada", pai: "inicio" },
  ],
  ["privacidade", "/privacidade", "Política de privacidade", "voce", { pai: "voce" }],
  ["conduta", "/conduta", "Código de conduta", "voce", { pai: "voce" }],
  ["ocultados", "/ocultados", "Ocultados", "voce", { pai: "voce" }],
  ["bloqueados", "/bloqueados", "Pessoas bloqueadas", "voce", { pai: "voce" }],
  [
    "ajuda",
    "/ajuda/$topico",
    "Ajuda",
    "voce",
    { parametro: "topico", semParametro: "/ajuda", pai: "voce" },
  ],
  ["contato", "/contato", "Fale com a gente", "voce", { pai: "ajuda" }],
  ["chamados", "/chamados", "Meus chamados", "voce", { pai: "ajuda" }],
  ["apagar-conta", "/apagar-conta", "Apagar a conta", "voce", { pai: "voce" }],
  ["indisponivel", "/indisponivel", "Página indisponível", "origem", {}],
]

export const ROTAS: readonly Rota[] = LINHAS.map(([nome, caminho, titulo, dono, extras]) => ({
  nome,
  caminho,
  caminhoSemParametro: extras.semParametro ?? null,
  parametro: extras.parametro ?? null,
  titulo,
  dono,
  casca: extras.casca ?? "app",
  raiz: extras.raiz ?? false,
  pai: extras.pai ?? null,
}))

/** Os 33 nomes da seção 1 do inventário, sem as rotas internas do app. */
export const NOMES_DAS_33: readonly NomeDeRota[] = ROTAS.filter(
  (rota) => rota.nome !== "mercado" && rota.nome !== "indisponivel",
).map((rota) => rota.nome)

const POR_NOME: Readonly<Record<string, Rota | undefined>> = Object.fromEntries(
  ROTAS.map((rota) => [rota.nome, rota]),
)

export function rotaPorNome(nome: string): Rota | undefined {
  return POR_NOME[nome]
}

/**
 * A rota pelo caminho do roteador (o `routeId`), que é o próprio molde do
 * catálogo. Evita depender do caminho resolvido, que carrega o parâmetro.
 */
export function rotaPeloCaminho(caminho: string): Rota | undefined {
  // A raiz da base pública é o Início: `/app` leva ao início.
  if (caminho === "/" || caminho === "") return POR_NOME["inicio"]
  return ROTAS.find((rota) => rota.caminho === caminho || rota.caminhoSemParametro === caminho)
}

const LINHA_INDISPONIVEL: Rota = {
  nome: "indisponivel",
  caminho: "/indisponivel",
  caminhoSemParametro: null,
  parametro: null,
  titulo: "Página indisponível",
  dono: "origem",
  casca: "app",
  raiz: false,
  pai: null,
}

export const ROTA_INDISPONIVEL: Rota = POR_NOME["indisponivel"] ?? LINHA_INDISPONIVEL

export function tituloDaRota(nome: string, cidade?: string): string {
  const rota = rotaPorNome(nome)
  if (!rota) throw new Error(`Rota desconhecida: ${nome}`)
  return rota.titulo.replace("{cidade}", cidade ?? "{cidade}")
}

/**
 * Monta o caminho do roteador (sem a base pública). Sem o parâmetro
 * obrigatório, devolve `null` quando a rota não tem forma sem parâmetro.
 */
export function caminhoComParametros(
  nome: string,
  parametros?: Readonly<Record<string, string>> | undefined,
): string | null {
  const rota = rotaPorNome(nome)
  if (!rota) return null
  if (rota.parametro === null) return rota.caminho
  const valor = parametros?.[rota.parametro]
  if (valor === undefined || valor === "") {
    return rota.caminhoSemParametro
  }
  return rota.caminho.replace(`$${rota.parametro}`, encodeURIComponent(valor))
}

export function urlPublica(
  nome: string,
  parametros?: Readonly<Record<string, string>> | undefined,
): string | null {
  const caminho = caminhoComParametros(nome, parametros)
  return caminho === null ? null : `${BASE_PUBLICA}${caminho}`
}

export type ValidacaoDeParametros = { ok: true } | { ok: false; motivo: string }

export function validarParametros(
  nome: string,
  parametros: Readonly<Record<string, string | undefined>>,
): ValidacaoDeParametros {
  const rota = rotaPorNome(nome)
  if (!rota) return { ok: false, motivo: `Rota desconhecida: ${nome}` }
  if (rota.parametro === null) return { ok: true }

  const valor = parametros[rota.parametro]
  if (valor === undefined) {
    // As rotas que existem nas duas formas (`entrar`, `ajuda`) valem sem o
    // parâmetro; as demais precisam dele para a tela existir.
    return rota.caminhoSemParametro === null
      ? { ok: false, motivo: `Falta o parâmetro ${rota.parametro}.` }
      : { ok: true }
  }
  if (valor.trim() === "") {
    return { ok: false, motivo: `Falta o parâmetro ${rota.parametro}.` }
  }
  if (rota.nome === "entrar" && !(ESTADOS_DA_ENTRADA as readonly string[]).includes(valor)) {
    return { ok: false, motivo: `Passo de entrada desconhecido: ${valor}` }
  }
  return { ok: true }
}
