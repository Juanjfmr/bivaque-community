// RECON-022 — borda do formulário de pedido de serviço (prancha 62, R42).
//
// Arquivo separado das Server Actions porque um arquivo "use server" só pode
// exportar funções assíncronas. As actions chamam estas funções antes de tocar
// o banco; os testes unitários as exercitam diretamente. Os limites espelham os
// `check`s da migration 20260911032309_service_requests.

export type FieldValidation = { ok: true } | { ok: false; field: string; message: string }

const ok: FieldValidation = { ok: true }

function fail(field: string, message: string): FieldValidation {
  return { ok: false, field, message }
}

/** Teto do contador desenhado na prancha (34/500). */
export const SERVICE_REQUEST_DESCRIPTION_MAX = 500
/** O "quando" é uma janela curta, nunca um contato pessoal. */
export const SERVICE_REQUEST_WHEN_MAX = 120
/** Limite real do anexo do pedido — igual ao do bucket privado. */
export const SERVICE_REQUEST_MAX_PHOTOS = 6
export const SERVICE_REQUEST_PHOTO_MAX_BYTES = 10 * 1024 * 1024

export const SERVICE_REQUEST_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

// Vocabulário de "Quando" herdado da coluna homônima da prancha 23
// ("Nesta semana", "A combinar"). Não é promessa de prazo de resposta.
export const SERVICE_REQUEST_WHEN_OPTIONS = ["A combinar", "Nesta semana"] as const

export function validateRequestDescription(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return fail("description", "Descreva o que você precisa.")
  }
  if (trimmed.length > SERVICE_REQUEST_DESCRIPTION_MAX) {
    return fail(
      "description",
      `A descrição passa de ${SERVICE_REQUEST_DESCRIPTION_MAX} caracteres.`,
    )
  }
  return ok
}

export function validateRequestWhen(value: string | null): FieldValidation {
  if (value === null) return ok
  const trimmed = value.trim()
  if (trimmed.length === 0) return ok
  if (trimmed.length > SERVICE_REQUEST_WHEN_MAX) {
    return fail("when", `O prazo desejado passa de ${SERVICE_REQUEST_WHEN_MAX} caracteres.`)
  }
  return ok
}

export function validateRequestPhotos(files: { size: number; type: string }[]): FieldValidation {
  if (files.length > SERVICE_REQUEST_MAX_PHOTOS) {
    return fail("photos", `Envie no máximo ${SERVICE_REQUEST_MAX_PHOTOS} fotos.`)
  }
  for (const file of files) {
    if (!SERVICE_REQUEST_PHOTO_MIME_TYPES.some((mime) => mime === file.type)) {
      return fail("photos", "Use imagens JPEG, PNG ou WebP.")
    }
    if (file.size > SERVICE_REQUEST_PHOTO_MAX_BYTES) {
      return fail("photos", "Cada imagem pode ter no máximo 10 MB.")
    }
  }
  return ok
}

export function firstFailure(...results: FieldValidation[]): FieldValidation {
  return results.find((result) => !result.ok) ?? ok
}
