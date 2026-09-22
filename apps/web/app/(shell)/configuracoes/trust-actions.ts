"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// RECON-031 / prancha 56: o acompanhamento das próprias denúncias e a lista de
// pessoas bloqueadas. A leitura é sempre do próprio usuário, resolvido da
// sessão, nunca de outra conta. A identidade de quem denunciou não é exposta
// aqui — esta tela é a do próprio denunciante.

export interface MyReport {
  id: string
  targetType: string
  category: string
  explanation: string
  status: "open" | "resolved"
  createdAt: string
}

export interface BlockedPerson {
  userId: string
  displayName: string
  blockedAt: string
}

export interface TrustCenterData {
  reports: MyReport[]
  blocked: BlockedPerson[]
}

const TARGET_LABEL: Record<string, string> = {
  post: "Publicação",
  comment: "Comentário",
  group: "Comunidade",
  message: "Mensagem",
  recommendation_request: "Pedido",
  recommendation_reply: "Resposta",
  provider_profile: "Perfil profissional",
}

// O report-button grava `reason` como "Categoria: explicação" (ou só a
// categoria). Separar no primeiro ": " reconstrói o motivo de lista fechada e a
// explicação sem precisar de coluna nova — a taxonomia estruturada pertence ao
// RECON-032, que cria a denúncia.
function splitReason(reason: string): { category: string; explanation: string } {
  const separator = reason.indexOf(": ")
  if (separator === -1) return { category: reason, explanation: "" }
  return {
    category: reason.slice(0, separator),
    explanation: reason.slice(separator + 2),
  }
}

// As tabelas de membro (reports, dm_blocks) são lidas e escritas com o cliente
// da SESSÃO, não com service_role: as policies `reports_select_reporter_only` e
// `dm_blocks_*_self` são a autorização, e service_role não recebeu SELECT/DELETE
// em dm_blocks. O service_role fica só para o nome de quem foi bloqueado, que a
// policy de perfil pode não expor.
async function createSessionClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const client = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await client.auth.getUser()
  return { client, userId: user?.id ?? null }
}

export async function getTrustCenterDataAction(): Promise<TrustCenterData | null> {
  const { client, userId } = await createSessionClient()
  if (!userId) return null

  const [reportsResult, blocksResult] = await Promise.all([
    client
      .from("reports")
      .select("id, target_type, reason, status, created_at")
      .eq("reporter_user_id", userId)
      .order("created_at", { ascending: false }),
    client
      .from("dm_blocks")
      .select("blocked_user_id, created_at")
      .eq("blocker_user_id", userId)
      .order("created_at", { ascending: false }),
  ])

  if (reportsResult.error) throw new Error(reportsResult.error.message)
  if (blocksResult.error) throw new Error(blocksResult.error.message)

  const reports: MyReport[] = (reportsResult.data ?? []).map((row) => {
    const { category, explanation } = splitReason(row.reason)
    return {
      id: row.id,
      targetType: TARGET_LABEL[row.target_type] ?? row.target_type,
      category,
      explanation,
      status: row.status,
      createdAt: row.created_at,
    }
  })

  const blockedIds = (blocksResult.data ?? []).map((row) => row.blocked_user_id)
  let names = new Map<string, string>()
  if (blockedIds.length > 0) {
    const service = createServiceClient()
    const { data: profiles, error: profilesError } = await service
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", blockedIds)
    if (profilesError) throw new Error(profilesError.message)
    names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name]))
  }

  const blocked: BlockedPerson[] = (blocksResult.data ?? []).map((row) => ({
    userId: row.blocked_user_id,
    displayName: names.get(row.blocked_user_id) ?? "Membro",
    blockedAt: row.created_at,
  }))

  return { reports, blocked }
}

export async function unblockPersonAction(formData: FormData) {
  const blockedUserId = formData.get("blockedUserId")
  if (typeof blockedUserId !== "string" || blockedUserId.length === 0) {
    throw new Error("blockedUserId required")
  }

  const { client, userId } = await createSessionClient()
  if (!userId) throw new Error("não autenticado")

  // A policy `dm_blocks_delete_self` exige blocker = auth.uid(); o filtro por
  // sessão aqui é a segunda barreira. O `blockedUserId` só escolhe a linha.
  const { error } = await client
    .from("dm_blocks")
    .delete()
    .eq("blocker_user_id", userId)
    .eq("blocked_user_id", blockedUserId)

  if (error) throw new Error(error.message)

  revalidatePath("/configuracoes/bloqueados")
}
