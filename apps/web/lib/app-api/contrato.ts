/**
 * Contrato de segurança das rotas de API do app (SPA ADR §5, itens 1 a 3).
 *
 * O app de página única fala com o servidor por `/api`, na mesma origem da web.
 * Isso tira a proteção que as Server Actions ganhavam de graça, então cada regra
 * daqui para baixo precisa ser explícita — e provada com caso positivo e
 * negativo, porque esquecer uma delas não quebra teste nenhum de telas:
 *
 * 1. uma credencial por requisição: cookie da web OU `Authorization: Bearer`
 *    (app de loja), nunca as duas; token inválido é recusado e NÃO cai para o
 *    cookie;
 * 2. escrita que aceita cookie confere `Origin` contra a lista e exige o
 *    cabeçalho do app;
 * 3. CORS com lista explícita e sem curinga com credencial.
 *
 * Funções puras: nada de Next, nada de Supabase, nada de rede. Quem transforma
 * isso em cliente autenticado é `sessao-do-next.ts`; quem prova é
 * `tests/unit/app-api`.
 */

/** Cabeçalho que só o app manda; um formulário de outro site não consegue. */
export const CABECALHO_DO_APP = "x-bivaque-app"
export const VALOR_DO_CABECALHO_DO_APP = "bivaque-spa"

/** `sb-<ref>-auth-token`, inclusive em pedaços (`.0`, `.1`) quando fica grande. */
const COOKIE_DE_SESSAO = /^sb-[^.]*-auth-token(\.\d+)?$/

export type Credencial =
  | { readonly via: "cookie" }
  | { readonly via: "bearer"; readonly token: string }
  | { readonly erro: "sem-credencial" | "conflito" | "token-invalido" }

/**
 * Decide qual credencial vale. A ordem das recusas é o contrato:
 *
 * - cabeçalho presente e malformado é `token-invalido` **mesmo com cookie**: um
 *   token quebrado não pode virar acesso pelo cookie, senão um cliente com
 *   token vencido continua entrando e o erro real fica invisível;
 * - as duas credenciais válidas ao mesmo tempo são `conflito`, e a rota recusa;
 * - sem cabeçalho, o cookie é a credencial da web.
 */
export function resolverCredencial(entrada: {
  readonly autorizacao: string | null | undefined
  readonly temCookie: boolean
}): Credencial {
  const bruto = (entrada.autorizacao ?? "").trim()
  if (bruto !== "") {
    const [esquema = "", token = "", ...resto] = bruto.split(/\s+/)
    if (
      esquema.toLowerCase() !== "bearer" ||
      token === "" ||
      resto.length > 0 ||
      token.includes(",")
    ) {
      return { erro: "token-invalido" }
    }
    if (entrada.temCookie) return { erro: "conflito" }
    return { via: "bearer", token }
  }
  if (entrada.temCookie) return { via: "cookie" }
  return { erro: "sem-credencial" }
}

/** Algum cookie é o pacote de sessão do Supabase (com ou sem pedaços). */
export function temCookieDeSessao(nomes: readonly string[]): boolean {
  return nomes.some((nome) => COOKIE_DE_SESSAO.test(nome))
}

/** Origem exata na lista. `null`, string vazia e `"null"` nunca entram. */
export function origemPermitida(
  origem: string | null | undefined,
  permitidas: readonly string[],
): boolean {
  if (typeof origem !== "string" || origem === "" || origem === "null") return false
  return permitidas.includes(origem)
}

export type VereditoDeEscrita =
  | { readonly ok: true }
  | { readonly ok: false; readonly motivo: "origem-recusada" | "cabecalho-ausente" }

/**
 * CSRF da escrita. Cookie é enviado sozinho pelo navegador, então a rota exige
 * as duas provas: `Origin` na lista e o cabeçalho do app. Bearer não sofre CSRF
 * (nenhum navegador anexa `Authorization` sozinho), mas a origem ainda é
 * conferida quando existe, para não virar caminho alternativo de escrita.
 */
export function avaliarEscrita(entrada: {
  readonly via: "cookie" | "bearer"
  readonly origem: string | null | undefined
  readonly cabecalhoDoApp: string | null | undefined
  readonly origensPermitidas: readonly string[]
}): VereditoDeEscrita {
  if (entrada.via === "cookie" && !origemPermitida(entrada.origem, entrada.origensPermitidas)) {
    return { ok: false, motivo: "origem-recusada" }
  }
  if (entrada.via === "cookie" && entrada.cabecalhoDoApp !== VALOR_DO_CABECALHO_DO_APP) {
    return { ok: false, motivo: "cabecalho-ausente" }
  }
  // Bearer vindo de navegador traz `Origin`; se trouxer, ele passa pela mesma
  // lista. O app de loja não manda origem, e a ausência não é falha — o token
  // não é anexado sozinho por página nenhuma.
  const origemDoApp =
    entrada.via === "bearer" &&
    entrada.origem !== null &&
    entrada.origem !== undefined &&
    !origemPermitida(entrada.origem, entrada.origensPermitidas)
  if (origemDoApp) return { ok: false, motivo: "origem-recusada" }
  return { ok: true }
}

/**
 * Cabeçalhos de CORS. Origem não listada não recebe nada: um `*` com
 * `Access-Control-Allow-Credentials` deixaria qualquer site ler a resposta de
 * quem está logado.
 */
export function cabecalhosDeCors(
  origem: string | null | undefined,
  permitidas: readonly string[],
): Readonly<Record<string, string>> {
  if (!origemPermitida(origem, permitidas)) return {}
  return {
    "access-control-allow-origin": String(origem),
    "access-control-allow-credentials": "true",
    vary: "Origin",
  }
}

/** Resposta ao preflight: mesmos métodos e cabeçalhos do contrato, nada além. */
export function cabecalhosDePreflight(
  origem: string | null | undefined,
  permitidas: readonly string[],
): Readonly<Record<string, string>> {
  const cors = cabecalhosDeCors(origem, permitidas)
  if (Object.keys(cors).length === 0) return {}
  return {
    ...cors,
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": `authorization, content-type, ${CABECALHO_DO_APP}`,
    "access-control-max-age": "600",
  }
}
