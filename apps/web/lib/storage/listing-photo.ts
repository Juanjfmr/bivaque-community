import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { buildListingPhotoPath } from "../listings/catalog"
import { MAX_LISTING_PHOTOS, MAX_PHOTO_BYTES } from "../listings/types"
import { createServerClient } from "../supabase/server"
import { sanitizeImage } from "./sanitize-image"

export class FalhaDaFoto extends Error {
  constructor(
    readonly status: 400 | 404 | 503,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

export async function enviarFotoDoAnuncio(
  client: SupabaseClient<Database>,
  userId: string,
  listingId: string,
  position: number,
  file: File,
): Promise<string> {
  if (!Number.isInteger(position) || position < 0 || position >= MAX_LISTING_PHOTOS) {
    throw new FalhaDaFoto(400, "Posição de foto inválida.")
  }
  const dono = await client
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("owner_user_id", userId)
    .maybeSingle()
  if (dono.error) throw new FalhaDaFoto(503, "Não foi possível conferir o anúncio.")
  if (!dono.data) throw new FalhaDaFoto(404, "Este anúncio não existe ou não é seu.")
  let imagem: Buffer
  try {
    imagem = await sanitizeImage(file, MAX_PHOTO_BYTES)
  } catch (error) {
    // shortcut: ecoa o texto do sanitize (já é para a pessoa, sem técnico); upgrade se vier i18n.
    throw new FalhaDaFoto(
      400,
      error instanceof Error
        ? error.message
        : "Envie uma imagem JPEG, PNG ou WebP válida de até 10 MB.",
    )
  }
  const path = buildListingPhotoPath(listingId, position, file.type)
  // SEC-006: só o bucket exige service_role; posse conferida acima pela sessão sob RLS.
  const upload = await createServerClient()
    .storage.from("listing-photos")
    .upload(path, imagem, { contentType: file.type, upsert: false })
  if (upload.error) throw new FalhaDaFoto(503, "Não foi possível enviar a foto.")
  return path
}
