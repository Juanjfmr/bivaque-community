// SEC-006 (reconferência 2026-10-19) — estado da seleção de fotos do pedido.
//
// Uma seleção inválida não pode esvaziar as fotos que a pessoa já escolheu, e o
// erro precisa sobreviver ao submit até uma seleção válida. O formulário usa
// estas funções como a única fonte do estado, em vez de decidir no JSX.

import { validateRequestPhotos } from "./request-form"

export interface RequestPhotoSelection {
  photos: File[]
  error: string | null
}

export function selectRequestPhotos(current: File[], incoming: File[]): RequestPhotoSelection {
  const validation = validateRequestPhotos(incoming)
  if (!validation.ok) {
    return { photos: current, error: validation.message }
  }
  return { photos: incoming, error: null }
}

export function requestSubmissionBlocked(photoError: string | null): string | null {
  return photoError
}
