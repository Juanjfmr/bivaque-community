import type { Conversa, DadosDaCidade } from "@/lib/dados/contrato"
import { idLocal } from "@/lib/id"
import { registro, texto } from "@/src/telas/comum"

export type OrigemDaConversa = {
  titulo: string
  tipo: "anuncio" | "negocio" | "texto"
  id: string | null
  detalhe: string
}

/** Origem verificada contra os dados da cidade: nunca inventar destino. */
export function origemDaConversa(
  conversa: Conversa,
  dados: DadosDaCidade,
): OrigemDaConversa | null {
  const visual = registro(conversa.apresentacao)
  const sobre = registro(visual["about"])
  const referencia = texto(conversa.context_id, texto(sobre["id"]))
  if (conversa.context_type === "listing" || sobre["type"] === "item") {
    const anuncio = dados.anuncios.find((item) => item.id === referencia)
    if (anuncio)
      return {
        titulo: anuncio.title,
        tipo: "anuncio",
        id: anuncio.id,
        detalhe: "Conversa sobre anúncio",
      }
  }
  if (conversa.context_type === "provider" || sobre["type"] === "biz") {
    const negocio = dados.negocios.find((item) => item.id === referencia)
    if (negocio)
      return {
        titulo: negocio.display_name,
        tipo: "negocio",
        id: negocio.id,
        detalhe: "Conversa sobre serviço",
      }
  }
  const titulo = texto(sobre["t"])
  if (titulo !== "") return { titulo, tipo: "texto", id: null, detalhe: "Indicação da comunidade" }
  return null
}

function chave(cidade: string, id: string): string {
  return `bivaque:mensagens-previa:${cidade.trim().toLowerCase()}:${id}`
}

export type MensagemDePrevia = { id: string; conteudo: string }

export function lerMensagensDePrevia(cidade: string, id: string): MensagemDePrevia[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(chave(cidade, id)) ?? "[]")
    return Array.isArray(parsed)
      ? parsed
          .flatMap((item, indice): MensagemDePrevia[] => {
            if (typeof item === "string") return [{ id: `legado-${indice}`, conteudo: item }]
            if (
              item &&
              typeof item === "object" &&
              typeof item.id === "string" &&
              typeof item.conteudo === "string"
            ) {
              return [{ id: item.id, conteudo: item.conteudo }]
            }
            return []
          })
          .slice(-30)
      : []
  } catch {
    return []
  }
}

export function guardarMensagemDePrevia(
  cidade: string,
  id: string,
  mensagem: string,
): MensagemDePrevia[] | null {
  const limpa = mensagem.trim()
  if (limpa.length === 0 || limpa.length > 2000) return null
  try {
    const mensagens = [
      ...lerMensagensDePrevia(cidade, id),
      { id: idLocal("msg-previa-"), conteudo: limpa },
    ].slice(-30)
    sessionStorage.setItem(chave(cidade, id), JSON.stringify(mensagens))
    return mensagens
  } catch {
    return null
  }
}
