import type { ActionResult } from "./actions"

export async function uploadPropertyFiles(listingId: string, files: File[]): Promise<ActionResult> {
  if (!files.length) return { ok: false, error: "Escolha ao menos uma foto." }
  for (const file of files) {
    const form = new FormData()
    form.set("photos", file)
    try {
      // A gate redirect is not an upload result. Never forward the multipart
      // mutation to onboarding/login, nor parse an HTML fallback as success.
      const response = await fetch(`/imoveis/${listingId}/fotos`, {
        method: "POST",
        body: form,
        redirect: "error",
      })
      const result = (await response.json()) as ActionResult
      if (!response.ok || result.ok !== true)
        return { ok: false, error: result.error ?? "Não foi possível enviar a foto.", listingId }
    } catch {
      return {
        ok: false,
        error: "Não foi possível enviar a foto. O rascunho foi mantido; tente novamente.",
        listingId,
      }
    }
  }
  return { ok: true, error: null, listingId }
}
