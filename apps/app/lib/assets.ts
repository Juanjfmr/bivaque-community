import { dadosDoApp } from "./dados"

/** Mesmo resolver do protótipo: imagem embutida, chave local ou ausência. */
export function assetUrl(ref: string | null | undefined): string {
  return typeof ref === "string" && ref !== "" ? dadosDoApp.imagem(ref) : ""
}
