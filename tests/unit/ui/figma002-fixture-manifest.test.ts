import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// FIGMA-002 — a limpeza do lote apaga SOMENTE o que a própria execução criou.
//
// O defeito que esta prova fecha: uma varredura por prefixo de título/conteúdo
// no `beforeAll` apagava fixture de outra execução (ou prova anterior) porque
// prefixo não prova propriedade. O contrato do manifesto é o oposto: nada sai
// sem estar na lista, e a lista só cresce quando ESTA execução cria a linha.
//
// A prova é mecânica e não toca banco: `docker` e a Storage API são mockados, e
// cada statement emitida é conferida. Se alguém reintroduzir `like`, `ilike`,
// `truncate` ou uma busca aberta, o teste quebra.

const fixture = vi.hoisted(() => ({
  statements: [] as string[],
  removedPaths: [] as string[],
  runsDir: "",
}))

vi.mock("node:child_process", () => ({
  execFileSync: (_file: string, args: string[]) => {
    fixture.statements.push(args[args.length - 1] ?? "")
    return ""
  },
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          fixture.removedPaths.push(...paths)
          return { error: null }
        },
      }),
    },
  }),
}))

import {
  assertIsolatedRuntime,
  cleanupRunManifest,
  createRunManifest,
  ISOLATED_RUNTIME_URL,
  track,
} from "../../../tests/e2e/imoveis/run-manifest"

const OWN = "81000000-0000-4000-8000-0000000000a1"
const ALHEIO = "82000000-0000-4000-8000-0000000000b2"

beforeEach(() => {
  fixture.statements = []
  fixture.removedPaths = []
  // A Storage API é mockada; o par de env só precisa existir para o cliente.
  process.env["SUPABASE_URL"] = "http://127.0.0.1:55621"
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = "chave-de-teste-nao--real"
  // O registro do manifesto vai para diretório temporário: um teste do módulo
  // não escreve dentro da pasta de evidências do lote.
  fixture.runsDir = mkdtempSync(join(tmpdir(), "figma002-manifest-"))
  process.env["BIVAQUE_FIGMA002_RUNS_DIR"] = fixture.runsDir
})

afterEach(() => {
  delete process.env["BIVAQUE_FIGMA002_RUNS_DIR"]
  rmSync(fixture.runsDir, { recursive: true, force: true })
})

describe("manifesto de fixtures", () => {
  it("não emite statement alguma quando nada foi criado", async () => {
    const manifest = createRunManifest()
    const report = await cleanupRunManifest(manifest)
    expect(fixture.statements).toEqual([])
    expect(fixture.removedPaths).toEqual([])
    expect(report.skippedBecauseEmpty).toEqual(["reports", "conversations", "listings", "posts"])
  })

  // Fail-closed do stack: fora do 55621 o módulo não executa NADA. As negativas
  // verificam as duas coisas que contariam se o guard falhasse — comando de
  // banco e remoção de objeto.
  it("recusa o stack compartilhado sem rodar psql nem Storage API", async () => {
    process.env["SUPABASE_URL"] = "http://127.0.0.1:55321"
    const manifest = createRunManifest()
    track(manifest, "listings", OWN)
    track(manifest, "objects", `${OWN}/foto-1.jpg`)
    await expect(cleanupRunManifest(manifest)).rejects.toThrow(/BIVAQUE_GUARD/)
    expect(fixture.statements).toEqual([])
    expect(fixture.removedPaths).toEqual([])
  })

  it("recusa URL ausente sem rodar psql nem Storage API", async () => {
    delete process.env["SUPABASE_URL"]
    const manifest = createRunManifest()
    track(manifest, "listings", OWN)
    await expect(cleanupRunManifest(manifest)).rejects.toThrow(/BIVAQUE_GUARD/)
    expect(fixture.statements).toEqual([])
    expect(fixture.removedPaths).toEqual([])
  })

  it("recusa manifesto vazio fora do stack, antes de qualquer comando", async () => {
    process.env["SUPABASE_URL"] = "http://127.0.0.1:55421"
    const manifest = createRunManifest()
    await expect(cleanupRunManifest(manifest)).rejects.toThrow(/BIVAQUE_GUARD/)
    expect(fixture.statements).toEqual([])
    expect(fixture.removedPaths).toEqual([])
  })

  it("aceita o stack isolado do lote", async () => {
    expect(assertIsolatedRuntime()).toBe(ISOLATED_RUNTIME_URL)
    const manifest = createRunManifest()
    track(manifest, "listings", OWN)
    const report = await cleanupRunManifest(manifest)
    expect(report.listings).toBe(1)
    expect(fixture.statements.length).toBeGreaterThan(0)
  })

  it("emite DELETE por id exato e nunca por título, prefixo ou marcador", async () => {
    const manifest = createRunManifest()
    track(manifest, "listings", OWN)
    track(manifest, "reports", "83000000-0000-4000-8000-0000000000c3")
    await cleanupRunManifest(manifest)

    const sql = fixture.statements.join("\n").toLowerCase()
    expect(sql).toContain(OWN)
    expect(sql).not.toContain("like")
    expect(sql).not.toContain("truncate")
    expect(sql).not.toContain(ALHEIO)
    for (const statement of fixture.statements) {
      // Nenhum statement de limpeza pode ser um DELETE sem WHERE por id.
      expect(statement.toLowerCase()).toContain("= any(array[")
    }
  })

  it("não toca fixture de outra execução porque ela não está no manifesto", async () => {
    const meu = createRunManifest()
    const deOutro = createRunManifest()
    track(deOutro, "listings", ALHEIO)
    track(meu, "listings", OWN)

    await cleanupRunManifest(meu)

    const sql = fixture.statements.join("\n")
    expect(sql).toContain(OWN)
    expect(sql).not.toContain(ALHEIO)
    // O manifesto do outro run continua íntegro: ninguém leu o arquivo dele.
    expect(deOutro.listings).toEqual([ALHEIO])
    expect(deOutro.runId).not.toBe(meu.runId)
  })

  it("só passa adiante caminho de objeto com o id do anúncio na frente", async () => {
    const manifest = createRunManifest()
    track(manifest, "objects", `${OWN}/foto-1.jpg`)
    expect(() => track(manifest, "objects", "foto-sem-anunciante.jpg")).toThrow()
    await cleanupRunManifest(manifest)
    expect(fixture.removedPaths).toEqual([`${OWN}/foto-1.jpg`])
  })

  it("recusa id fora do formato de uuid", () => {
    const manifest = createRunManifest()
    expect(() => track(manifest, "listings", "titulo-ou-prefixo")).toThrow()
    expect(manifest.listings).toEqual([])
  })
})
