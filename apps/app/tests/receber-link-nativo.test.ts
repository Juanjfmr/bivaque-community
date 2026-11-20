import { describe, expect, it, vi } from "vitest"

const testes = vi.hoisted(() => ({
  abrir: undefined as ((evento: { url: string }) => void) | undefined,
  destinos: [] as { href: string; state: { bivaqueEntrada: { chave: string } } }[],
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
  roteador: {
    navigate: (destino: (typeof testes.destinos)[number]) => testes.destinos.push(destino),
  },
}))

import { ouvirLinksNativos } from "../src/nativo/links"

describe("recepção de links nativos", () => {
  it("abre o link inicial e eventos válidos, ignorando outros hosts", async () => {
    await ouvirLinksNativos()
    testes.abrir?.({ url: "bivaque://app/pergunta/123" })
    testes.abrir?.({ url: "bivaque://outro/entrar" })
    expect(testes.destinos.map((destino) => destino.href)).toEqual([
      "/app/entrar",
      "/app/pergunta/123",
    ])
    expect(testes.destinos[0]?.state.bivaqueEntrada.chave).toBeTruthy()
    expect(testes.destinos[1]?.state.bivaqueEntrada.chave).not.toBe(
      testes.destinos[0]?.state.bivaqueEntrada.chave,
    )
  })
})
