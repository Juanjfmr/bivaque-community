import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Onda E Task 4 Step 3 — guard for the audience-selector privacy bug.
//
// The composer resetForm used to call setCommunityId(null), which made the
// SECOND post in a session publish to city-wide reach by default — exactly
// the leak-by-inattention the plan §Task 4 step 3 calls out ("isso é bug de
// privacidade, não de UX"). The fix is to keep the audience the person was
// already on. This test fails the build if a future refactor re-introduces
// the reset-to-city behaviour.
//
// Reapontado na RECON-014: feed-post.tsx passou a ser barril e o composer
// mora em feed-post-create.tsx. O mecanismo também mudou — o seletor deixou
// de guardar `communityId` solto e passou a guardar uma `audienceKey`, com a
// cidade como uma chave entre outras. A propriedade trancada é a mesma e
// continua sendo a que importa: sair do envio NÃO pode empurrar a próxima
// publicação para a cidade inteira sem a pessoa ter escolhido.
//
// O teste lê o texto-fonte de propósito. É frágil a refatoração — foi o que
// aconteceu aqui — mas é o que consegue afirmar "esta linha nunca volta"
// sobre um componente que só se comporta em navegador.

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

describe("audience selector keeps the vila on reset (E4 Step 3)", () => {
  it("resetForm does not zero the audience back to city-wide", () => {
    const body = resetFormBody()

    // O bug original, no mecanismo antigo.
    expect(body).not.toMatch(/setCommunityId\(\s*null\s*\)/)

    // O mesmo bug escrito no mecanismo novo: forçar a chave da cidade sem
    // olhar o que a pessoa tinha escolhido.
    expect(body).not.toMatch(/setAudienceKey\(\s*CITY_AUDIENCE_KEY\s*\)/)
  })

  it("resetForm preserves the audience the member was already on", () => {
    const body = resetFormBody()

    // A audiência tem que ser derivada do valor anterior. Um set com valor
    // constante — qualquer que seja — perde a escolha da pessoa; o que
    // preserva é a forma funcional, que recebe o estado anterior.
    expect(body).toMatch(/setAudienceKey\(\s*\(\s*prev\s*\)\s*=>/)
    expect(body).toMatch(/\bprev\b/)
  })
})
