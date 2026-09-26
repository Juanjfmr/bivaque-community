// Endereços antigos das indicações (ADR-20260925-memoria-de-indicacoes). As
// indicações moram na vista Indicações da Comunidade; /indicacoes e
// /recommendations continuam existindo só para que link salvo, compartilhado ou
// enviado por notificação antiga ainda chegue ao lugar certo.

import type { Route } from "next"
import { ASK_INDICATION_HREF, INDICATIONS_HREF, indicationHref } from "./indications"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Params = Record<string, string | string[] | undefined>

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null
}

/** /indicacoes?pedir=1 → a caixa de pedir; sem parâmetro → a vista. */
export function indicacoesRedirect(params: Params): Route {
  return (single(params["pedir"]) === "1" ? ASK_INDICATION_HREF : INDICATIONS_HREF) as Route
}

/**
 * /recommendations tinha quatro abas. Pedido em foco vai ao próprio pedido;
 * "Pedir indicação" vai à caixa de pedir; "Salvas" vai aos salvos do tipo; o
 * resto (Explorar, Pedidos) vai à vista Indicações.
 */
export function recommendationsRedirect(params: Params): Route {
  return recommendationsTarget(params) as Route
}

function recommendationsTarget(params: Params): string {
  const focus = single(params["focus"])
  if (focus && UUID.test(focus)) return indicationHref(focus)
  const tab = single(params["aba"])
  if (tab === "request") return ASK_INDICATION_HREF
  if (tab === "saved") return "/salvos?aba=indicacao"
  return INDICATIONS_HREF
}
