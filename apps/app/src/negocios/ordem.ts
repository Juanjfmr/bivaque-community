/**
 * A ordem da lista de negócios (F07, correção de 12/11).
 *
 * "Mais próximos" exige uma origem de localização e coordenadas nos negócios, e
 * o resumo que a lista recebe (`lib/dados/negocios.ts`) não traz nem uma coisa
 * nem outra: a origem da própria pessoa existe só para o cálculo dela
 * (`lib/dados/voce.ts`). Sem eles a lista continua na ordem do servidor e a tela
 * diz por quê — inventar distância seria pior que não ordenar.
 *
 * shortcut: `recentes` é a ordem do próprio endpoint (`order("id")`, cursor pelo
 * `id`), porque a resposta não traz data; quando o resumo trouxer `criadoEm` ou
 * distância, ordenar aqui e apagar este aviso.
 */
export type OrdemDosNegocios = "recentes" | "proximos"

export const AVISO_SEM_ORIGEM =
  "Ainda não sabemos onde você está, então os mais recentes vêm primeiro."

/** O recado que a linha de ordenação mostra, ou `null` quando não há o que dizer. */
export function avisoDaOrdem(pedida: OrdemDosNegocios, temOrigem: boolean): string | null {
  return pedida === "proximos" && !temOrigem ? AVISO_SEM_ORIGEM : null
}

/** Valor cru que veio da seleção, reduzido às duas ordens que existem. */
export function ordemDe(valor: string | null | undefined): OrdemDosNegocios {
  return valor === "proximos" ? "proximos" : "recentes"
}
