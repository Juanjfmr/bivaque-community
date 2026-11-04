import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import type { Database } from "supabase/database.generated"
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

export type SessaoDaRequisicao =
  | {
      readonly estado: "autenticada"
      readonly via: "cookie" | "bearer"
      readonly usuario: UsuarioDaSessao
      readonly cliente: SupabaseClient<Database>
      readonly cabecalhos: Readonly<Record<string, string>>
    }
  | { readonly estado: "recusada"; readonly sessao: Extract<Sessao, { estado: "recusada" }> }

function ambiente(): { url: string; anon: string } | null {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return null
  return { url, anon }
}

/** Cookie do SSR sem escrita: a renovação de token é do proxy, não da rota. */
function clienteDoCookie(
  url: string,
  anon: string,
  request: NextRequest,
): SupabaseClient<Database> {
  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {},
    },
  })
}

/** Cliente do usuário para o token do app de loja: RLS com o JWT da pessoa. */
function clienteDoToken(url: string, anon: string, token: string): SupabaseClient<Database> {
  return createClient<Database>(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export async function resolverSessaoDaRequisicao(
  request: NextRequest,
): Promise<SessaoDaRequisicao> {
  const config = ambiente()
  if (config === null) {
    return { estado: "recusada", sessao: { estado: "recusada", motivo: "sem-credencial" } }
  }

  let cliente: SupabaseClient<Database> | null = null
  let cabecalhos: Readonly<Record<string, string>> = {}

  const sessao = await resolverSessao(request.headers.get("authorization"), {
    temCookie: () => temCookieDeSessao(request.cookies.getAll().map((cookie) => cookie.name)),
    async lerUsuarioDoCookie() {
      const doCookie = clienteDoCookie(config.url, config.anon, request)
      const { data } = await doCookie.auth.getUser()
      if (data.user === null) return null
      cliente = doCookie
      return { id: data.user.id, email: data.user.email ?? null }
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
      return { id: data.user.id, email: data.user.email ?? null }
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
  }
}
