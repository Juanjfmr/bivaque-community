import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")

const actions = readFileSync(
  join(root, "apps", "web", "app", "(provider)", "prestador", "actions.ts"),
  "utf8",
)
const detailPage = readFileSync(
  join(root, "apps", "web", "app", "(provider)", "prestador", "pedidos", "[id]", "page.tsx"),
  "utf8",
)

describe("resposta do prestador ao pedido (RECON-044)", () => {
  it("usa o RPC canonico send_conversation_message, nao o nome morto do RECON-024", () => {
    expect(actions).toMatch(/rpc\("send_conversation_message"/)
    expect(actions).toContain("p_conversation_id: conversationId")
    expect(actions).not.toMatch(/rpc\("respond_to_service_request"/)
  })

  it("o formulario envia a conversa do proprio pedido", () => {
    expect(detailPage).toContain('name="conversationId"')
    expect(detailPage).toContain("value={request.conversation_id}")
  })
})
