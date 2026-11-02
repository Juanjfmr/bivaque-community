"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"

// COM-005 (B2 do lote 5): decidir um pedido de entrada do grupo. São as duas
// portas do moderador — aprovar (RPC definer, que também apaga o motivo) e
// recusar (delete da participação, que leva o motivo pelo cascade). O motivo
// só existe enquanto o pedido está aberto.

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

function readId(formData: FormData, name: string): string {
  const value = formData.get(name)
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} required`)
  return value
}

export async function approveJoinRequestAction(formData: FormData): Promise<void> {
  const groupId = readId(formData, "groupId")
  const targetUserId = readId(formData, "targetUserId")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // approve_group_member exige is_group_moderator (dono ou moderador) e apaga
  // o motivo na mesma transação da decisão.
  const { error } = await supabase.rpc("approve_group_member", {
    p_group_id: groupId,
    p_user_id: targetUserId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

export async function rejectJoinRequestAction(formData: FormData): Promise<void> {
  const groupId = readId(formData, "groupId")
  const targetUserId = readId(formData, "targetUserId")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // Recusar é apagar a participação pendente; a RLS exige o moderador do grupo
  // e o motivo cai junto pelo cascade da chave.
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .eq("status", "pending")
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}
