import { dadosDoApp } from "./dados"

/** Mesmo resolver do protótipo: imagem embutida, URL assinada real, chave local ou ausência. */
export function assetUrl(ref: string | null | undefined): string {
  if (typeof ref !== "string" || ref === "") return ""
  if (/^https?:\/\//.test(ref)) return ref
  return dadosDoApp.imagem(ref)
}
