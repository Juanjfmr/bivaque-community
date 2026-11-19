import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// A Comunidade depois do lote 5, tarefa N2 (ADR-20261023): sem feed, sem a
// vista "Conversa" e sem linha de publicar. LIMITE: leitura de fonte; o
// comportamento em navegador é provado pelos e2e (inicio-sem-feed,
// audience-selector, empty-locality, two-localities) e pela captura da tela.

const root = join(import.meta.dirname, "..", "..", "..")
const homeLoaders = stripComments(
  readFileSync(join(root, "apps", "web", "lib", "inicio", "home-loaders.ts"), "utf8"),
)
describe("o Início não lê feed", () => {
  it("nenhuma leitura de publicações da cidade no Início", () => {
    // Lote 5, N2: a leitura `feed_locality` que a versão anterior usava nem
    // chegou ao banco — a migration 20261024100000 passou a recusar publicação
    // sem grupo, e sem publicação de cidade não há feed de cidade.
    expect(homeLoaders).not.toContain("feed_locality")
    expect(homeLoaders).not.toContain("feed_community")
    expect(homeLoaders).not.toContain("feed_following")
    expect(homeLoaders).not.toContain("loadCityFeed")
  })
})
