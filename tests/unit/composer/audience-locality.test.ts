import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  join(import.meta.dirname, "../../../apps/web/app/components/bivaque/feed-post-audience.tsx"),
  "utf8",
)

describe("audiência da publicação respeita a cidade atual", () => {
  it("filtra comunidades pela mesma localidade do post", () => {
    expect(source).toContain('.from("communities")')
    expect(source).toContain('.eq("locality_id", localityId)')
  })

  it("limpa listas antigas e não transforma erro de sessão em cidade implícita", () => {
    expect(source).toContain("setCommunities([])")
    expect(source).toContain("setGroups([])")
    expect(source).toContain("if (userError)")
    expect(source).toContain("Nenhum destino foi assumido")
    expect(source).toContain(".catch(() =>")
  })
})
