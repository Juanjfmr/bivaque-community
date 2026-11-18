import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { createServerClient } from "../supabase/server"
import { sanitizeImage } from "./sanitize-image"
import { conferirEscritaDaConta } from "./veto-de-conta"

export const FOTO_DO_GRUPO_MAX = 5 * 1024 * 1024
const TIPOS = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as const

export function lerFotoDoGrupo(corpo: Record<string, unknown>): File | null {
  const tipo = corpo["tipo"]
  const conteudo = corpo["conteudo"]
  if (
    typeof tipo !== "string" ||
    !Object.hasOwn(TIPOS, tipo) ||
    typeof conteudo !== "string" ||
    conteudo.length > Math.ceil(FOTO_DO_GRUPO_MAX / 3) * 4 ||
    conteudo.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(conteudo)
  )
    return null
  const bytes = Buffer.from(conteudo, "base64")
  if (bytes.length === 0 || bytes.length > FOTO_DO_GRUPO_MAX) return null
  return new File([bytes], "foto", { type: tipo })
}

export async function enviarFotoDoGrupo(
  client: SupabaseClient<Database>,
  userId: string,
  grupoId: string,
  file: File,
): Promise<{ caminho: string } | { invalida: true } | { recusada: true }> {
  const membro = await client
    .from("group_memberships")
    .select("group_id")
    .eq("group_id", grupoId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle()
  if (membro.error || !membro.data) throw new Error("membership unavailable")

  // AUTHZ-007: veto de conta antes do upload privilegiado, pela sessão da
  // pessoa — o objeto não sobe se a linha seria recusada.
  const conta = await conferirEscritaDaConta(client)
  if (!conta.ok) {
    if (conta.motivo === "conta") return { recusada: true }
    throw new Error("account check unavailable")
  }

  let imagem: Buffer
  try {
    imagem = await sanitizeImage(file, FOTO_DO_GRUPO_MAX)
  } catch {
    return { invalida: true }
  }
  const extensao = TIPOS[file.type as keyof typeof TIPOS]
  const caminho = `${userId}/grupos/${grupoId}/${randomUUID()}.${extensao}`
  // SEC-006: só o upload exige serviço; vínculo conferido acima pela sessão sob RLS.
  const { error } = await createServerClient()
    .storage.from("event-photos")
    .upload(caminho, imagem, {
      contentType: file.type,
      upsert: false,
    })
  if (error) throw error
  return { caminho }
}
