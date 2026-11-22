import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")

const actions = readFileSync(
  join(root, "apps", "web", "app", "(provider)", "prestador", "actions.ts"),
  "utf8",
)
// TROCA-005: a resposta mora num módulo só (web e app), e a conversa sai do pedido
// no banco, nunca do formulário.
const pedidos = readFileSync(
  join(root, "apps", "web", "lib", "service-requests", "app-pedidos.ts"),
  "utf8",
)
const detailPage = readFileSync(
  join(root, "apps", "web", "app", "(provider)", "prestador", "pedidos", "[id]", "page.tsx"),
  "utf8",
)

describe("resposta do prestador ao pedido (RECON-044)", () => {
  it("usa o RPC canonico send_conversation_message, nao o nome morto do RECON-024", () => {
    expect(actions).toContain("responderPedido(client, userId, requestId, content)")
    expect(pedidos).toMatch(/rpc\("send_conversation_message"/)
    expect(pedidos).toContain("p_conversation_id: pedido.conversaId")
    expect(actions).not.toMatch(/rpc\("respond_to_service_request"/)
    expect(pedidos).not.toMatch(/rpc\("respond_to_service_request"/)
  })

  it("o formulario envia a conversa do proprio pedido", () => {
    expect(detailPage).toContain('name="conversationId"')
    expect(detailPage).toContain("value={request.conversation_id}")
  })
})
