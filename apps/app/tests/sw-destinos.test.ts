import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RUN-188: o service worker é servido como está (public do Vite), então a lista
// de rotas de destino é uma cópia da de `destinoEmRota`. A cópia já perdeu a
// rota "entrar" uma vez; este teste compara as duas listas para o erro não voltar.

function rotasDoWorker(): string[] {
  const fonte = readFileSync(join(process.cwd(), "public/sw.js"), "utf8")
  const bloco = /const ROTAS_DE_DESTINO = new Set\(\[([\s\S]*?)\]\)/.exec(fonte)
  if (bloco === null) throw new Error("ROTAS_DE_DESTINO não achada em public/sw.js")
  const corpo = bloco[1] ?? ""
  return [...corpo.matchAll(/"([a-z-]+)"/g)].map((m) => m[1] as string)
}

function rotasDoApp(): string[] {
  const fonte = readFileSync(join(process.cwd(), "lib/dados/avisos.ts"), "utf8")
  const bloco = /const ROTAS_DE_DESTINO = new Map[^[]*\[([\s\S]*?)\]\)/.exec(fonte)
  if (bloco === null) throw new Error("ROTAS_DE_DESTINO não achada em lib/dados/avisos.ts")
  const corpo = bloco[1] ?? ""
  return [...corpo.matchAll(/\["([a-z-]+)"/g)].map((m) => m[1] as string)
}

describe("o service worker aceita os mesmos destinos que destinoEmRota", () => {
  it("a lista de rotas do sw é a mesma do app", () => {
    expect([...rotasDoWorker()].sort()).toEqual([...rotasDoApp()].sort())
  })

  it("a rota da entrada está na lista do sw", () => {
    expect(rotasDoWorker()).toContain("entrar")
  })
})
