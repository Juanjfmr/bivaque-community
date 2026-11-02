"use server"

// PORT-005 (correção do achado P2 da revisão independente) — a cidade de destino
// da saída nas boas-vindas.
//
// A tela lia a cidade de destino com o cliente do navegador, mas a policy de
// `localities` só deixa o membro ler a cidade do próprio vínculo
// (`private.is_locality_member`). O destino nunca é a cidade do vínculo: quem
// está saindo ainda mora na origem. A leitura voltava vazia, as boas-vindas
// caíam no bloco de "moro aqui" e a pessoa que declarou a saída via o bloco
// errado — um erro de leitura disfarçado de estado normal.
//
// O catálogo é dado público (nome de município do IBGE), então a leitura pode
// ser feita no servidor com o cliente privilegiado. O que NÃO vem do cliente é
// o id: o destino é resolvido na linha de momento do próprio chamador, pela
// sessão, e o argumento da função não carrega cidade nenhuma.

import { createServerClient as createSupabaseAuthClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient } from "../../../../lib/supabase/server"

async function readSessionUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createSupabaseAuthClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

/**
 * O nome da cidade de destino da PRÓPRIA saída, ou `null` quando a pessoa não
 * declarou saída (ou não está autenticada). Sem sessão não há linha de momento
 * para ler — a função nunca aceita uma cidade vinda do chamador.
 */
export async function readMyDepartureCityAction(): Promise<string | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServerClient()

  const { data: moment, error: momentError } = await supabase
    .from("member_entry_moments")
    .select("destination_locality_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (momentError) {
    // Falha de leitura é falha, não "não há destino": quem decide o que fazer é
    // a tela, que já trata o caso sem cidade de destino.
    return null
  }

  const destinationId = moment?.destination_locality_id ?? null
  if (!destinationId) return null

  const { data: locality, error: localityError } = await supabase
    .from("localities")
    .select("city_name")
    .eq("id", destinationId)
    .maybeSingle()

  if (localityError) return null

  return locality?.city_name ?? null
}
