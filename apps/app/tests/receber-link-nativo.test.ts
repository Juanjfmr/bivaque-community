import { describe, expect, it, vi } from "vitest"

const testes = vi.hoisted(() => ({
  abrir: undefined as ((evento: { url: string }) => void) | undefined,
  destinos: [] as string[],
}))
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (_nome: string, abrir: (evento: { url: string }) => void) => {
      testes.abrir = abrir
    }),
    getLaunchUrl: vi.fn(async () => ({ url: "bivaque://app/entrar" })),
  },
}))
vi.mock("@/src/roteador", () => ({
  roteador: { history: { push: (rota: string) => testes.destinos.push(rota) } },
}))

import { ouvirLinksNativos } from "../src/nativo/links"

describe("recepção de links nativos", () => {
  it("abre o link inicial e eventos válidos, ignorando outros hosts", async () => {
    await ouvirLinksNativos()
    testes.abrir?.({ url: "bivaque://app/pergunta/123" })
    testes.abrir?.({ url: "bivaque://outro/entrar" })
    expect(testes.destinos).toEqual(["/app/entrar", "/app/pergunta/123"])
  })
})
