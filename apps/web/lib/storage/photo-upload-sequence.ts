// SEC-006 (revisão M2) — envio de fotos em chamadas separadas.
//
// O limite `bodySizeLimit` do Next vale para o corpo inteiro da Server Action,
// não por arquivo. Moradia (até 12 fotos) e Pedido (até 6) mandavam tudo numa
// chamada só, então duas fotos de 7 MiB já estouravam os 12 MB antes da action
// rodar. Aqui cada foto vira uma chamada própria — a mesma forma que o Mercado
// já usava — e o envio de uma foto nunca derruba as seguintes.

export interface PhotoUploadFailure {
  index: number
  message: string
  /** O envio pode ter sido concluído; os bytes foram preservados. */
  indeterminate?: boolean
}

export interface SequentialPhotoUploadResult {
  uploaded: number
  failures: PhotoUploadFailure[]
}

export type PhotoUploadOutcome =
  | { error?: string; path?: string; ok?: boolean; indeterminate?: boolean }
  | undefined

const DEFAULT_UPLOAD_ERROR = "Não foi possível enviar a foto."

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== "") return error.message
  return fallback
}

export async function uploadPhotosOneByOne(
  files: File[],
  upload: (file: File, index: number) => Promise<PhotoUploadOutcome>,
): Promise<SequentialPhotoUploadResult> {
  const failures: PhotoUploadFailure[] = []
  let uploaded = 0

  for (const [index, file] of files.entries()) {
    try {
      const result = await upload(file, index)
      if (result !== undefined && "error" in result && typeof result.error === "string") {
        failures.push({
          index,
          message: result.error,
          ...(result.indeterminate === true ? { indeterminate: true } : {}),
        })
        continue
      }
      uploaded += 1
    } catch (error) {
      failures.push({ index, message: errorMessage(error, DEFAULT_UPLOAD_ERROR) })
    }
  }

  return { uploaded, failures }
}

/**
 * Roda a submissão inteira mantendo o estado `pending` ligado e o desliga em
 * qualquer saída — inclusive quando a Server Action rejeita (corpo grande,
 * rede, exceção do servidor). Sem o `finally`, a rejeição deixava o botão
 * travado em "Enviando…" para sempre.
 */
export async function runWithPending<T>(
  setPending: (pending: boolean) => void,
  task: () => Promise<T>,
  fallbackMessage: string,
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  setPending(true)
  try {
    return { ok: true, value: await task() }
  } catch (error) {
    console.error("[fotos] envio interrompido:", error)
    return { ok: false, message: fallbackMessage }
  } finally {
    setPending(false)
  }
}
