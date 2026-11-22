import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")

// TROCA-005: a resposta mora num módulo só (web e app), e a conversa sai do pedido
// no banco, nunca do formulário.
const pedidos = readFileSync(
  join(root, "apps", "web", "lib", "service-requests", "app-pedidos.ts"),
  "utf8",
)
describe("resposta do prestador ao pedido (RECON-044)", () => {
  // TROCA-005: as telas antigas do prestador saíram; a regra que continua viva é
  // a do módulo chamado pela porta do app (e pela rota da conversa do pedido).
  it("usa o RPC canonico send_conversation_message, nao o nome morto do RECON-024", () => {
    expect(pedidos).toMatch(/rpc\("send_conversation_message"/)
    expect(pedidos).toContain("p_conversation_id: pedido.conversaId")
    expect(pedidos).not.toMatch(/rpc\("respond_to_service_request"/)
  })
})
