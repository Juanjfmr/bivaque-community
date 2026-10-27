import type { Pergunta } from "@/lib/dados/contrato"
import { idLocal } from "@/lib/id"

/** Perguntas demonstrativas ficam somente nesta aba do navegador, nunca no servidor. */
function chave(cidade: string): string {
  return `bivaque-demo-perguntas:${cidade.trim().toLocaleLowerCase("pt-BR")}`
}

export function lerPerguntasLocais(cidade: string): Pergunta[] {
  if (typeof window === "undefined") return []
  try {
    const valor: unknown = JSON.parse(sessionStorage.getItem(chave(cidade)) ?? "[]")
    if (!Array.isArray(valor)) return []
    return valor.filter(
      (item): item is Pergunta =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        item.id.startsWith("pergunta-demo-") &&
        typeof item.title === "string" &&
        typeof item.locality_id === "string" &&
        item.apresentacao !== null &&
        typeof item.apresentacao === "object",
    )
  } catch {
    return []
  }
}

export function criarPerguntaLocal(
  cidade: string,
  localidadeId: string,
  titulo: string,
  topico: string,
): Pergunta | "limite" | null {
  const pergunta = titulo.trim()
  if (pergunta.length < 12 || pergunta.length > 300) return null
  const criada: Pergunta = {
    id: idLocal("pergunta-demo-"),
    title: pergunta,
    body: pergunta,
    locality_id: localidadeId,
    is_resolved: false,
    apresentacao: {
      q: pergunta,
      who: "Você",
      topic: topico.trim().slice(0, 60) || "Geral",
      mine: true,
      status: "open",
    },
  }
  try {
    const anteriores = lerPerguntasLocais(cidade)
    if (anteriores.length >= 30) return "limite"
    sessionStorage.setItem(chave(cidade), JSON.stringify([criada, ...anteriores]))
    return criada
  } catch {
    // Sem armazenamento disponível, não alegar que a pergunta foi publicada.
    return null
  }
}
