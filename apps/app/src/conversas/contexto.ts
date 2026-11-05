import type { OrigemDaConversa } from "@/lib/contexto-conversa"

export function contexto(tipo: string): OrigemDaConversa | null {
  const nomes: Record<string, [string, OrigemDaConversa["tipo"]]> = {
    listing: ["Anúncio", "anuncio"],
    provider: ["Serviço", "negocio"],
    service_request: ["Pedido de serviço", "negocio"],
    event_question: ["Pergunta sobre evento", "texto"],
    shared_event: ["Evento em comum", "texto"],
    shared_group: ["Grupo em comum", "texto"],
    recommendation_thread: ["Indicação da comunidade", "texto"],
    accepted_family: ["Família", "texto"],
  }
  const item = nomes[tipo]
  return item ? { titulo: item[0], tipo: item[1], id: null, detalhe: "Contexto da conversa" } : null
}
