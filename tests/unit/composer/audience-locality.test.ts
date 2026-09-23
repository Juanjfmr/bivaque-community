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
})
