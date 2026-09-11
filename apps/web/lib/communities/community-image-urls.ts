import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { log } from "../logger"
import {
  COMMUNITY_IMAGE_BUCKET,
  type CommunityImageKind,
  communityImagePath,
} from "./community-media"

export const COMMUNITY_IMAGE_SIGNED_URL_EXPIRY_SECONDS = 60 * 60

export type CommunityImageUrls = {
  bannerUrl: string | null
  thumbnailUrl: string | null
}

export type CommunityImageSignRequest = {
  communityId: string
  banner: boolean
  thumbnail: boolean
}

/**
 * Emite URLs assinadas de vida curta para os objetos que a comunidade referencia
 * HOJE. A autorização acontece ANTES e TAMBÉM AQUI: quem assina é o client
 * autenticado do próprio membro, então a policy de leitura de `storage.objects`
 * decide de novo se ele alcança a comunidade — uma conta fora do escopo não
 * consegue assinar nem sabendo o caminho. Assinar em lote evita o N+1 que o ADR
 * alerta.
 *
 * O erro do storage é lido e registrado; a tela cai para o estado sem imagem em
 * vez de derrubar a página inteira por um objeto ausente. Não é uma leitura de
 * dado que virou lista vazia — é a ausência do objeto, com o erro no log.
 */
export async function signCommunityImageUrls(
  client: SupabaseClient<Database>,
  requests: CommunityImageSignRequest[],
): Promise<Map<string, CommunityImageUrls>> {
  const result = new Map<string, CommunityImageUrls>()
  const wanted: { communityId: string; kind: CommunityImageKind }[] = []
  for (const request of requests) {
    if (request.banner) wanted.push({ communityId: request.communityId, kind: "banner" })
    if (request.thumbnail) wanted.push({ communityId: request.communityId, kind: "thumbnail" })
  }
  if (wanted.length === 0) return result

  const paths = wanted.map((entry) => communityImagePath(entry.communityId, entry.kind))
  const { data, error } = await client.storage
    .from(COMMUNITY_IMAGE_BUCKET)
    .createSignedUrls(paths, COMMUNITY_IMAGE_SIGNED_URL_EXPIRY_SECONDS)

  if (error) {
    log.error("community-images: could not sign community image urls", {
      error: error.message,
    })
    return result
  }

  const byPath = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) byPath.set(item.path, item.signedUrl)
  }
  for (const request of requests) {
    result.set(request.communityId, {
      bannerUrl: request.banner
        ? (byPath.get(communityImagePath(request.communityId, "banner")) ?? null)
        : null,
      thumbnailUrl: request.thumbnail
        ? (byPath.get(communityImagePath(request.communityId, "thumbnail")) ?? null)
        : null,
    })
  }
  return result
}
