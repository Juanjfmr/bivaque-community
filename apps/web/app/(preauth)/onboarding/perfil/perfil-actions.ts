"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { callUserGroupInterestsRpc } from "../../../../lib/user-group-interests-rpcs"

// Opções de interesse do passo de personalização (prancha 39). Os interesses
// do produto são grupos reais da cidade (§3.2 — sem taxonomia paralela), então
// a tela mostra os grupos disponíveis na localidade escolhida. A leitura passa
// pelo service client porque `list_available_groups_for_interests` é
// service_role-only; o `p_user_id` vem da sessão resolvida no servidor, nunca
// do cliente.

export type InterestOption = {
  alreadyInterest: boolean
  id: string
  name: string
}

export async function loadInterestOptionsAction(localityId: string): Promise<InterestOption[]> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
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
  if (!user) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.")
  }

  const supabase = createServiceClient()

  // Só quem foi verificado vê os grupos: a leitura é service_role e o
  // `p_locality_id` vem do cliente, então sem esta conferência uma conta não
  // verificada listava os grupos de qualquer cidade (auditoria de 22/09/2026,
  // achado MEDIUM). A situação é lida pelo usuário da sessão, nunca do corpo.
  const { data: statusRows, error: statusError } = await supabase.rpc("read_verification_status", {
    p_user_id: user.id,
  })
  if (statusError) {
    throw new Error("Não foi possível carregar os interesses. Tente novamente.")
  }
  if ((statusRows as { status: string }[] | null)?.[0]?.status !== "verified") {
    throw new Error("Conclua a verificação de acesso para escolher interesses.")
  }

  const { data, error } = await callUserGroupInterestsRpc(
    supabase,
    "list_available_groups_for_interests",
    { p_user_id: user.id, p_locality_id: localityId },
  )
  if (error) {
    throw new Error("Não foi possível carregar os interesses. Tente novamente.")
  }

  return (data ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    alreadyInterest: group.already_interest,
  }))
}
