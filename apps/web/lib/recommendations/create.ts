import {
  INDICATION_CATEGORIES,
  type IndicationCategory,
  suggestCategory,
  titleProblem,
} from "../indications/indications"

/** A lista fechada é o enum do banco (ADR-20261107 item 5): fora dela, recusa. */
const TOPICOS = new Set<string>(INDICATION_CATEGORIES.map((item) => item.id))

/**
 * A mesma régua do compositor antigo, sem aceitar autoria ou alcance do navegador.
 * `topico` é a escolha de quem pergunta, sempre um id da lista fechada; tópico
 * livre não entra no banco. Sem tópico, vale a sugestão do texto (comportamento
 * antigo, e é o que a web sem seletor manda).
 */
export function lerNovaPergunta(corpo: Record<string, unknown>) {
  const titulo = corpo["titulo"]
  const assunto = corpo["assunto"] ?? ""
  const brutoTopico = corpo["topico"]
  if (typeof titulo !== "string" || typeof assunto !== "string" || assunto.length > 60) {
    return null
  }
  if (brutoTopico !== undefined && brutoTopico !== null && typeof brutoTopico !== "string") {
    return null
  }
  const topico = typeof brutoTopico === "string" && brutoTopico !== "" ? brutoTopico : null
  if (topico !== null && !TOPICOS.has(topico)) return null
  if (titleProblem(titulo.trim())) return null
  return {
    title: titulo.trim(),
    body: assunto.trim(),
    category:
      (topico as IndicationCategory | null) ?? suggestCategory(`${titulo} ${assunto}`) ?? "outros",
  }
}
