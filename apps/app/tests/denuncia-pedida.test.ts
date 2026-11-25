import { describe, expect, it } from "vitest"
import { pedirDenuncia, tomarDenunciaPedida } from "@/src/conversas/denunciaPedida"

describe("pedido de denúncia vindo do perfil", () => {
  it("vale uma única vez e só para a conversa pedida", () => {
    pedirDenuncia("c-1")
    expect(tomarDenunciaPedida("c-2")).toBe(false)
    expect(tomarDenunciaPedida("c-1")).toBe(true)
    expect(tomarDenunciaPedida("c-1")).toBe(false)
  })

  it("sem pedido, nenhuma conversa abre a folha sozinha", () => {
    expect(tomarDenunciaPedida("c-1")).toBe(false)
  })
})
