// RECON-034 — contrato da faixa e da miniatura da comunidade (pranchas 42/43).
//
// Módulo puro: sem React e sem Supabase. É o único lugar que nomeia o bucket,
// os limites, o caminho determinístico do objeto, a validação do ponteiro e o
// texto alternativo — assim a tela, a action de upload e os testes falam o
// mesmo vocabulário, e uma mudança no ADR (limite, tipo) muda num lugar só.

export const COMMUNITY_IMAGE_BUCKET = "community-images"
export const COMMUNITY_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const COMMUNITY_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type CommunityImageKind = "banner" | "thumbnail"
export type CommunityImageMime = (typeof COMMUNITY_IMAGE_MIME_TYPES)[number]

export type CommunityImageFile = {
  mimeType: string
  sizeBytes: number
}

export type CommunityImageValidation =
  | { ok: true; mimeType: CommunityImageMime }
  | { ok: false; reason: "mime" | "size" }

/**
 * Caminho determinístico por comunidade e tipo: trocar a imagem SOBRESCREVE o
 * mesmo objeto, então a troca não acumula arquivo antigo. O primeiro segmento
 * é o id da comunidade — é dele que a policy de storage parte para decidir
 * leitura (D2) e escrita (D3).
 */
export function communityImagePath(communityId: string, kind: CommunityImageKind): string {
  return `${communityId}/${kind}`
}

export function isCommunityImageKind(value: string): value is CommunityImageKind {
  return value === "banner" || value === "thumbnail"
}

/**
 * `null` quando o caminho não pode ser um objeto desta comunidade: pasta de
 * outra comunidade, subpasta, vazio. É a mesma cerca que a RPC aplica no banco.
 */
export function parseCommunityImagePath(
  communityId: string,
  path: string | null | undefined,
): string | null {
  if (!path) return null
  const prefix = `${communityId}/`
  if (!path.startsWith(prefix)) return null
  const leaf = path.slice(prefix.length)
  if (leaf.length === 0 || leaf.includes("/")) return null
  return path
}

export function validateCommunityImage(file: CommunityImageFile): CommunityImageValidation {
  if (!COMMUNITY_IMAGE_MIME_TYPES.includes(file.mimeType as CommunityImageMime)) {
    return { ok: false, reason: "mime" }
  }
  if (!Number.isFinite(file.sizeBytes) || file.sizeBytes <= 0) {
    return { ok: false, reason: "size" }
  }
  if (file.sizeBytes > COMMUNITY_IMAGE_MAX_BYTES) {
    return { ok: false, reason: "size" }
  }
  return { ok: true, mimeType: file.mimeType as CommunityImageMime }
}

/**
 * Descreve a imagem sem repetir o nome da comunidade que já aparece ao lado
 * (prancha 43) e sem prometer conteúdo que o arquivo não garante.
 */
export function communityImageAltText(kind: CommunityImageKind): string {
  return kind === "banner" ? "Faixa de apresentação da comunidade" : "Miniatura da comunidade"
}
