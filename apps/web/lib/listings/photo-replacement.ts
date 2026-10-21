// SEC-006 (reparo 2026-10-19, tentativa 2) — troca da foto de um anúncio.
//
// A Server Action é a ÚNICA responsável por limpar objetos do Storage:
//   * recusa SQL definitiva -> limpa o objeto novo (não referenciado);
//   * commit confirmado -> limpa os objetos antigos;
//   * resultado ambíguo -> não limpa nada.
//
// O cliente só apresenta o resultado. Ele não pode apagar o objeto novo com
// base em erro genérico: a RPC pode ter comitado e a resposta se perdido.

export interface ListingPhotoReplacementSteps {
  uploadNewPhoto: () => Promise<{ path: string } | { error: string }>
  commitReplacement: (
    path: string,
  ) => Promise<
    | { error: null; previousPaths?: string[]; cleanupFailed?: boolean }
    | { error: string; definite: boolean; cleanupFailed: boolean }
  >
}

export type ListingPhotoReplacementResult =
  | { ok: true; path: string; previousCleanupFailed: boolean }
  | { ok: false; indeterminate: boolean; message: string }

const DEFINITE_ERROR = "Não foi possível trocar a foto. A foto anterior continua aqui."
const INDETERMINATE_ERROR =
  "Não foi possível confirmar a troca. A foto nova pode estar no anúncio; recarregue antes de tentar novamente."

export async function replaceListingPhoto(
  _previousPath: string | null,
  steps: ListingPhotoReplacementSteps,
): Promise<ListingPhotoReplacementResult> {
  let uploaded: { path: string } | { error: string }
  try {
    uploaded = await steps.uploadNewPhoto()
  } catch (error) {
    // createImageBitmap, compressão ou a Server Action podem rejeitar. A tela
    // precisa receber uma saída, não uma promessa pendente.
    console.error("[mercado] falha ao enviar a foto nova:", error)
    return { ok: false, indeterminate: false, message: DEFINITE_ERROR }
  }
  if ("error" in uploaded) {
    return { ok: false, indeterminate: false, message: DEFINITE_ERROR }
  }
  const newPath = uploaded.path

  let committed: Awaited<ReturnType<ListingPhotoReplacementSteps["commitReplacement"]>>
  try {
    committed = await steps.commitReplacement(newPath)
  } catch (error) {
    // Erro de transporte: o commit pode ter acontecido. Não apague a foto nova.
    console.error("[mercado] falha ambígua ao trocar a linha da foto:", error)
    return { ok: false, indeterminate: true, message: INDETERMINATE_ERROR }
  }

  if (committed.error !== null) {
    if (!committed.definite) {
      return { ok: false, indeterminate: true, message: INDETERMINATE_ERROR }
    }
    // Recusa SQL definitiva: a Server Action já descartou o objeto novo, porque
    // a transação não commitou e o caminho é exclusivo desta chamada.
    return { ok: false, indeterminate: false, message: DEFINITE_ERROR }
  }

  return {
    ok: true,
    path: newPath,
    previousCleanupFailed: committed.cleanupFailed === true,
  }
}
