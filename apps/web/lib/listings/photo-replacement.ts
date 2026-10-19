// SEC-006 (revisão M1) — troca da foto de um anúncio do Mercado.
//
// O fluxo vive fora da tela porque a ordem das operações é o contrato: subir a
// foto nova, limpar as linhas antigas, gravar a linha nova e só então remover o
// objeto antigo. A tela injeta as operações (Server Actions + cliente Supabase)
// e este módulo decide o que pode ser desfeito.

export interface ListingPhotoReplacementSteps {
  uploadNewPhoto: () => Promise<{ path: string } | { error: string }>
  clearPhotoRows: () => Promise<{ error: string | null }>
  insertNewPhotoRow: (path: string) => Promise<{ error: string | null }>
  deletePhotoObject: (path: string) => Promise<{ ok: boolean }>
}

export type ListingPhotoReplacementResult =
  | { ok: true; path: string; previousCleanupFailed: boolean }
  | { ok: false; message: string }

const REPLACE_ERROR = "Não foi possível trocar a foto. A foto anterior continua aqui."

async function discardNewPhoto(path: string, steps: ListingPhotoReplacementSteps): Promise<void> {
  try {
    await steps.deletePhotoObject(path)
  } catch (error) {
    // O anúncio ainda aponta para a foto anterior; o objeto novo fica órfão.
    console.error("[mercado] falha ao descartar a foto nova:", error)
  }
}

export async function replaceListingPhoto(
  previousPath: string | null,
  steps: ListingPhotoReplacementSteps,
): Promise<ListingPhotoReplacementResult> {
  const uploaded = await steps.uploadNewPhoto()
  if ("error" in uploaded) return { ok: false, message: REPLACE_ERROR }
  const newPath = uploaded.path

  // A linha nova é o que faz o anúncio apontar para a foto. Só enquanto ela
  // não existe é seguro desfazer o objeto recém-enviado.
  const cleared = await steps.clearPhotoRows()
  if (cleared.error !== null) {
    await discardNewPhoto(newPath, steps)
    return { ok: false, message: REPLACE_ERROR }
  }

  const inserted = await steps.insertNewPhotoRow(newPath)
  if (inserted.error !== null) {
    await discardNewPhoto(newPath, steps)
    return { ok: false, message: REPLACE_ERROR }
  }

  // Daqui em diante a troca está consumada: o banco aponta para a foto nova.
  // Falhar ao apagar a antiga só deixa um objeto órfão no bucket e não pode
  // desfazer nada nem mentir sobre o estado da tela.
  let previousCleanupFailed = false
  if (previousPath !== null && previousPath !== newPath) {
    try {
      const removed = await steps.deletePhotoObject(previousPath)
      previousCleanupFailed = !removed.ok
    } catch (error) {
      previousCleanupFailed = true
      console.error("[mercado] falha ao remover a foto anterior:", error)
    }
  }

  return { ok: true, path: newPath, previousCleanupFailed }
}
