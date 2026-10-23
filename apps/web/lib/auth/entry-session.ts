import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import type { EntryAccountKind } from "./entry-progress"

/**
 * Quem está chegando na entrada, lido no servidor.
 *
 * Duas telas públicas precisam saber disso antes de desenhar: `/login` e
 * `/signup` mostram "Você já começou" quando a sessão existe e a entrada não
 * terminou (ADR-20261022-entrada-do-prototipo, item 5), e `/consent` diz com
 * qual conta o aceite está sendo registrado. Nenhuma das três pode confiar em
 * estado de cliente para isso: a sessão vem dos cookies do request e o tipo da
 * conta vem do banco, com o RPC que o proxy já usa — o autor é sempre a sessão
 * trocada, nunca um parâmetro.
 *
 * Falha de leitura vira "sem sessão", nunca exceção: a tela pública continua
 * servindo o formulário, e quem tenta entrar sem infraestrutura recebe a
 * mensagem do próprio formulário em vez de uma tela de erro.
 */

export type EntrySession = Readonly<{
  accountKind: EntryAccountKind
  email: string | null
  hasSession: boolean
  name: string | null
}>

const ANONYMOUS: EntrySession = {
  accountKind: null,
  email: null,
  hasSession: false,
  name: null,
}

const ACCOUNT_KINDS: readonly string[] = ["member", "provider"]

function readName(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null
  const display = (metadata as { display_name?: unknown }).display_name
  return typeof display === "string" && display.trim().length > 0 ? display.trim() : null
}

export async function readEntrySession(): Promise<EntrySession> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !key) return ANONYMOUS

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // Componente de servidor não escreve cookie: a renovação do token é do
        // proxy, que roda em toda navegação.
        setAll() {},
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return ANONYMOUS

    // `my_account_kind()` devolve escalar (`returns text`): o PostgREST entrega
    // a string crua, não uma lista de linhas — a mesma armadilha documentada no
    // proxy. Erro no RPC deixa `accountKind` nulo, que é o ramo conservador:
    // a pessoa vê "Você já começou" e o proxy decide o passo real.
    const { data: kind, error } = await supabase.rpc("my_account_kind")
    const accountKind =
      !error && typeof kind === "string" && ACCOUNT_KINDS.includes(kind)
        ? (kind as EntryAccountKind)
        : null

    return {
      accountKind,
      email: user.email ?? null,
      hasSession: true,
      name: readName(user.user_metadata),
    }
  } catch {
    return ANONYMOUS
  }
}
