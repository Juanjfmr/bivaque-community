"use server"

// Onda E Task 11 — server actions for user group interests.
//
// §3.2: interests map to groups (no parallel taxonomy). §3.3: private
// groups only suggest to members of their container. The collection is
// bounded to one declared purpose (LGPD finalidade declarada — §4.4).
//
// PORT-005 (correção do achado P2 da revisão independente): a leitura dos
// grupos usa service_role, então a sessão sozinha não basta — quem nunca foi
// verificado (nem pendente, nem recusado) não consulta a lista. A situação vem
// do banco, pelo usuário da sessão; o cliente não diz nada sobre ela. E a
// cidade vem do vínculo CORRENTE (`kind = 'current'`), nunca do vínculo de
// saída: quem está saindo de uma cidade não recebe sugestão de grupos dela.

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { callUserGroupInterestsRpc } from "../../../lib/user-group-interests-rpcs"

type AvailableGroup = {
  id: string
  name: string
  description: string | null
  visibility: "public" | "private"
  already_member: boolean
  already_interest: boolean
}

type UserInterest = {
  group_id: string
  created_at: string
}

type InterestsData = {
  available: AvailableGroup[]
  recorded: UserInterest[]
}

type ServiceClient = ReturnType<typeof createServiceClient>

type InterestsContext = {
  localityId: string
  supabase: ServiceClient
  userId: string
}

async function readSessionUserId(): Promise<string | null> {
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
  return user?.id ?? null
}

/**
 * A sessão, a verificação e a cidade corrente numa leitura só.
 *
 * `null` é "sem sessão ou sem vínculo corrente": não há dado de interesse para
 * ler nem para escrever. A verificação é o único caso que sobe como erro — ela
 * é uma recusa, não uma ausência, e a lista de grupos nem chega a ser
 * consultada (é o que o teste prova).
 */
async function readVerifiedContext(): Promise<InterestsContext | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()

  const { data: statusRows, error: statusError } = await supabase.rpc("read_verification_status", {
    p_user_id: userId,
  })
  if (statusError) {
    throw new Error("Não foi possível conferir sua verificação agora. Tente novamente.")
  }

  const status = (statusRows as { status: string }[] | null)?.[0]?.status ?? null
  if (status !== "verified") {
    throw new Error("Conclua a verificação de acesso para escolher interesses.")
  }

  // Só o vínculo corrente: o de saída é o da cidade que a pessoa está deixando.
  const { data: membership } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .eq("kind", "current")
    .limit(1)
    .maybeSingle()

  const localityId = (membership as { locality_id: string } | null)?.locality_id ?? null
  if (!localityId) return null

  return { localityId, supabase, userId }
}

export async function getUserInterestsDataAction(): Promise<InterestsData | null> {
  const context = await readVerifiedContext()
  if (!context) return null

  const [availableResult, recordedResult] = await Promise.all([
    callUserGroupInterestsRpc(context.supabase, "list_available_groups_for_interests", {
      p_user_id: context.userId,
      p_locality_id: context.localityId,
    }),
    callUserGroupInterestsRpc(context.supabase, "list_user_group_interests", {
      p_user_id: context.userId,
    }),
  ])

  return {
    available: availableResult.data ?? [],
    recorded: recordedResult.data ?? [],
  }
}

export async function recordUserGroupInterestsAction(formData: FormData) {
  const context = await readVerifiedContext()
  if (!context) throw new Error("não autenticado")

  const groupIds = formData
    .getAll("groupIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0)

  const { error } = await callUserGroupInterestsRpc(
    context.supabase,
    "record_user_group_interests",
    {
      p_user_id: context.userId,
      p_locality_id: context.localityId,
      p_group_ids: groupIds,
    },
  )

  if (error) {
    if (error.message.includes("not in caller locality")) {
      throw new Error("um dos grupos selecionados não pertence à sua cidade.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile/interests")
}

export async function clearUserGroupInterestsAction() {
  const context = await readVerifiedContext()
  if (!context) throw new Error("não autenticado")

  const { error } = await callUserGroupInterestsRpc(
    context.supabase,
    "record_user_group_interests",
    {
      p_user_id: context.userId,
      p_locality_id: context.localityId,
      p_group_ids: [] as string[],
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/profile/interests")
}
