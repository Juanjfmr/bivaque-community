import { suggestCategory, titleProblem } from "../indications/indications"

/** A mesma régua do compositor antigo, sem aceitar autoria ou alcance do navegador. */
export function lerNovaPergunta(corpo: Record<string, unknown>) {
  const titulo = corpo["titulo"]
  const assunto = corpo["assunto"] ?? ""
  if (typeof titulo !== "string" || typeof assunto !== "string" || assunto.length > 60) {
    return null
  }
  if (titleProblem(titulo.trim())) return null
  return {
    title: titulo.trim(),
    body: assunto.trim(),
    category: suggestCategory(`${titulo} ${assunto}`) ?? "outros",
  }
}
