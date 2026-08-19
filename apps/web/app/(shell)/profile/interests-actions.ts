"use server"

// Onda E Task 11 — server actions for user group interests.
//
// §3.2: interests map to groups (no parallel taxonomy). §3.3: private
// groups only suggest to members of their container. The collection is
// bounded to one declared purpose (LGPD finalidade declarada — §4.4).

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

async function readSessionLocalityId(): Promise<string | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  return (data as { locality_id: string } | null)?.locality_id ?? null
}

export async function getUserInterestsDataAction(): Promise<InterestsData | null> {
  const userId = await readSessionUserId()
  const localityId = await readSessionLocalityId()
  if (!userId || !localityId) return null

  const supabase = createServiceClient()
  const [availableResult, recordedResult] = await Promise.all([
    callUserGroupInterestsRpc(supabase, "list_available_groups_for_interests", {
      p_user_id: userId,
      p_locality_id: localityId,
    }),
    callUserGroupInterestsRpc(supabase, "list_user_group_interests", {
      p_user_id: userId,
    }),
  ])

  return {
    available: availableResult.data ?? [],
    recorded: recordedResult.data ?? [],
  }
}

export async function recordUserGroupInterestsAction(formData: FormData) {
  const userId = await readSessionUserId()
  const localityId = await readSessionLocalityId()
  if (!userId || !localityId) throw new Error("não autenticado")

  const groupIds = formData
    .getAll("groupIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0)

  const supabase = createServiceClient()
  const { error } = await callUserGroupInterestsRpc(supabase, "record_user_group_interests", {
    p_user_id: userId,
    p_locality_id: localityId,
    p_group_ids: groupIds,
  })

  if (error) {
    if (error.message.includes("not in caller locality")) {
      throw new Error("um dos grupos selecionados não pertence à sua cidade.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile/interests")
}

export async function clearUserGroupInterestsAction() {
  const userId = await readSessionUserId()
  const localityId = await readSessionLocalityId()
  if (!userId || !localityId) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { error } = await callUserGroupInterestsRpc(supabase, "record_user_group_interests", {
    p_user_id: userId,
    p_locality_id: localityId,
    p_group_ids: [] as string[],
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/profile/interests")
}
