import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Onda E Task 4 Step 3 — guard for the audience-selector privacy bug, kept
// through the lote 5 N2 change (publicar só dentro de um grupo).
//
// The composer resetForm used to call setCommunityId(null), which made the
// SECOND post in a session publish to city-wide reach by default — exactly
// the leak-by-inattention the plan §Task 4 step 3 calls out ("isso é bug de
// privacidade, não de UX"). RECON-014 turned that into an audienceKey that fell
// back to the city key, and the lote 5 N2 pulled city and vila out of the
// selector altogether: the group the person chooses is the only destination,
// and the reset must not touch it at all. What is locked is the same property
// in all three mechanisms: leaving the submit never moves the next publication
// to an audience the person did not choose.
//
// The test reads the source text on purpose. It is fragile to refactoring —
// that has already happened here twice — but it is the only way to assert "this
// line never comes back" about a component that only behaves in a browser.

const root = join(import.meta.dirname, "..", "..", "..")
const composerPath = join(
  root,
  "apps",
  "web",
  "app",
  "components",
  "bivaque",
  "feed-post-create.tsx",
)

function resetFormBody(): string {
  const source = readFileSync(composerPath, "utf8")
  const match = source.match(
    /const resetForm = useCallback\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\n {2}\},/,
  )
  expect(match).not.toBeNull()
  return match ? match[1] : ""
}

describe("o reset do compositor não escolhe destino pela pessoa (E4 Step 3)", () => {
  it("resetForm não força a chave da cidade", () => {
    const body = resetFormBody()

    // O bug original, no mecanismo antigo.
    expect(body).not.toMatch(/setCommunityId\(\s*null\s*\)/)

    // O mesmo bug escrito no mecanismo novo: forçar a chave da cidade sem
    // olhar o que a pessoa tinha escolhido.
    expect(body).not.toMatch(/setAudienceKey\(\s*CITY_AUDIENCE_KEY\s*\)/)
  })

  it("resetForm não toca na audiência: quem escolhe o grupo é a pessoa", () => {
    const body = resetFormBody()

    // Com a cidade e a vila fora do seletor, qualquer set de audiência aqui só
    // pode perder a escolha dela. O que preserva é não escrever nada.
    expect(body).not.toMatch(/setAudienceKey\(/)
  })
})
