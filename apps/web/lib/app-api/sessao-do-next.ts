import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import type { Database } from "supabase/database.generated"
import { opcoesDoCookieDaSessao } from "../auth/cookie-options"
import { temCookieDeSessao } from "./contrato"
import { resolverSessao, type Sessao, type UsuarioDaSessao } from "./sessao"

/**
 * A ponte entre o contrato puro (`sessao.ts`) e o runtime do Next: lê o cookie
 * da web pelo pacote do `@supabase/ssr` e valida o `Authorization` do app de
 * loja com `getUser(token)`; o token inválido continua recusado sem tocar no
 * cookie.
 *
 * Também devolve o cliente **do usuário** — sob RLS, nunca service_role — para
 * a rota que precisa ler ou gravar como a pessoa. Criar esse cliente é o passo
 * em que é fácil errar para o lado perigoso; por isso ele nasce daqui e não de
 * cada rota.
 */

/** Um cookie que o `@supabase/ssr` pediu para gravar (renovação de token). */
export type CookieParaGravar = Readonly<{
  name: string
  value: string
  options?: Record<string, unknown>
}>

export type SessaoDaRequisicao =
  | {
      readonly estado: "autenticada"
      readonly via: "cookie" | "bearer"
      readonly usuario: UsuarioDaSessao
      readonly cliente: SupabaseClient<Database>
      readonly cabecalhos: Readonly<Record<string, string>>
      /**
       * Cookies renovados durante a leitura da sessão. A rota precisa gravá-los
       * na resposta, senão o token renovado só existe na memória desta
       * requisição e a sessão morre quando o token de acesso vence (1 hora).
       */
      readonly cookiesParaGravar?: readonly CookieParaGravar[]
    }
  | { readonly estado: "recusada"; readonly sessao: Extract<Sessao, { estado: "recusada" }> }
  // Falta de configuração do servidor: não é credencial recusada, é serviço fora.
  | { readonly estado: "indisponivel" }

function ambiente(): { url: string; anon: string } | null {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return null
  return { url, anon }
}

/**
 * Cliente do cookie da web. O proxy NÃO renova a sessão em `/api` e `/app`
 * (são caminhos públicos do portão), então a renovação é desta leitura: os
 * cookies que o `@supabase/ssr` pede para gravar vão para `gravar`, e a rota os
 * põe na resposta com as mesmas opções do callback (`Secure` em produção).
 */
function clienteDoCookie(
  url: string,
  anon: string,
  request: NextRequest,
  gravar: CookieParaGravar[],
): SupabaseClient<Database> {
  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies) {
        for (const cookie of cookies) gravar.push(cookie)
      },
    },
    cookieOptions: opcoesDoCookieDaSessao(),
  })
}

/** Cliente do usuário para o token do app de loja: RLS com o JWT da pessoa. */
function clienteDoToken(url: string, anon: string, token: string): SupabaseClient<Database> {
  return createClient<Database>(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/** O usuário do GoTrue no formato que as rotas consomem, com o provedor. */
function usuarioDaSessao(usuario: User): UsuarioDaSessao {
  return {
    id: usuario.id,
    email: usuario.email ?? null,
    appMetadata: usuario.app_metadata,
  }
}

export async function resolverSessaoDaRequisicao(
  request: NextRequest,
): Promise<SessaoDaRequisicao> {
  const config = ambiente()
  if (config === null) return { estado: "indisponivel" }

  let cliente: SupabaseClient<Database> | null = null
  let cabecalhos: Readonly<Record<string, string>> = {}
  const cookiesParaGravar: CookieParaGravar[] = []

  const sessao = await resolverSessao(request.headers.get("authorization"), {
    temCookie: () => temCookieDeSessao(request.cookies.getAll().map((cookie) => cookie.name)),
    async lerUsuarioDoCookie() {
      const doCookie = clienteDoCookie(config.url, config.anon, request, cookiesParaGravar)
      const { data } = await doCookie.auth.getUser()
      if (data.user === null) return null
      cliente = doCookie
      return usuarioDaSessao(data.user)
    },
    async lerUsuarioDoToken(token) {
      const anonimo = createClient<Database>(config.url, config.anon, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data } = await anonimo.auth.getUser(token)
      if (data.user === null) return null
      cliente = clienteDoToken(config.url, config.anon, token)
      // O app de loja manda o token no cabeçalho; a rota devolve o mesmo par
      // para o cliente conferir que a credencial foi aceita.
      cabecalhos = { vary: "Authorization" }
      return usuarioDaSessao(data.user)
    },
  })

  if (sessao.estado === "recusada") return { estado: "recusada", sessao }
  if (cliente === null) {
    return { estado: "recusada", sessao: { estado: "recusada", motivo: "sessao-invalida" } }
  }

  return {
    estado: "autenticada",
    via: sessao.via,
    usuario: sessao.usuario,
    cliente,
    cabecalhos,
    // Só o cookie renova; no token do app de loja a lista fica vazia.
    cookiesParaGravar: sessao.via === "cookie" ? cookiesParaGravar : [],
  }
}
