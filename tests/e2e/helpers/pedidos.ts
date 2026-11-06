// Devolve a vaga do teto de pedidos abertos (ADR-20260923): no máximo cinco em
// aberto entre a mesma pessoa e o mesmo prestador, e o seed já ocupa uma delas.
// Sem encerrar o pedido que o spec abriu, a execução stateful soma uma vaga por
// largura e a terceira persona recebe 429 no lugar do 201.
//
// O caminho é o do produto: o mesmo RPC que a ação do servidor chama
// (apps/web/app/(shell)/pedidos/[id]/actions.ts), com a sessão de quem pediu,
// sob RLS — nada de cliente administrativo.
import { type BrowserContext, expect } from "@playwright/test"
import { apiForSession } from "./session"

export async function encerrarPedidoAberto(
  context: BrowserContext,
  requestId: string,
): Promise<void> {
  const api = await apiForSession(context)
  try {
    const resposta = await api.post("/rest/v1/rpc/close_service_request", {
      data: { p_request_id: requestId },
    })
    expect(resposta.status(), "encerrar o pedido do spec").toBe(200)
    expect(await resposta.json()).toMatchObject({ id: requestId, status: "closed" })
  } finally {
    await api.dispose()
  }
}
