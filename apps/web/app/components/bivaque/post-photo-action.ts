"use server"

// The server strips metadata even when the client bypasses the canvas.

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { sanitizeImage } from "../../../lib/storage/sanitize-image"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function uploadPostPhotoAction(
  formData: FormData,
): Promise<{ photoPath: string } | { error: string }> {
  const file = formData.get("photo") as File | null
  if (!file || !(file instanceof File)) throw new Error("no file provided")

  // Server-side validation (cannot be bypassed by tampering with client accept attr).
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`tipo não permitido: ${file.type}`)
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB (máx 5MB)`)
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("não autenticado")

  // Same prerequisite as event_photos_insert_self: no post/event exists yet.
  const { data: membership, error: membershipError } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()
  if (membershipError || !membership) throw new Error("vínculo com localidade necessário")

  let image: Buffer
  try {
    image = await sanitizeImage(file, MAX_SIZE)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível preparar a imagem." }
  }

  // Upload to storage bucket. The service_role client has write access.
  const serviceClient = createServiceClient()
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.type.split("/")[1]}`
  const { error: uploadError } = await serviceClient.storage
    .from("event-photos")
    .upload(fileName, image, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadError) throw new Error(uploadError.message)

  return { photoPath: fileName }
}

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}
