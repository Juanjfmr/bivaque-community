import { dadosDoApp } from "./dados"

const URL_ABSOLUTA = /^https?:\/\//

/**
 * Mesmo resolver do protótipo: imagem embutida, chave local ou ausência.
 * URL absoluta já assinada pelo servidor (foto real de negócio) passa como está.
 */
export function assetUrl(ref: string | null | undefined): string {
  if (typeof ref !== "string" || ref === "") return ""
  if (URL_ABSOLUTA.test(ref)) return ref
  return dadosDoApp.imagem(ref)
}
