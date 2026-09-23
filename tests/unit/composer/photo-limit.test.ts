import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const photoField = readFileSync(
  join(root, "apps/web/app/components/bivaque/feed-post-photo.tsx"),
  "utf8",
)
const uploadAction = readFileSync(
  join(root, "apps/web/app/(shell)/events/upload-photo-action.ts"),
  "utf8",
)

describe("limite de foto da publicação", () => {
  it("a copy do campo coincide com o limite real do servidor", () => {
    expect(photoField).toContain("const MAX_PHOTO_BYTES = 5 * 1024 * 1024")
    expect(photoField).toContain("até 5MB")
    expect(photoField).not.toContain("até 10MB")
    expect(uploadAction).toContain("const MAX_SIZE = 5 * 1024 * 1024")
  })
})
