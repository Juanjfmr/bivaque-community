import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearPostDraft,
  loadPostAudience,
  loadPostDraft,
  savePostAudience,
  savePostDraftFields,
} from "web/app/components/bivaque/feed-post-draft"

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

const storage = new MemoryStorage()
const composerSource = readFileSync(
  join(import.meta.dirname, "../../../apps/web/app/components/bivaque/feed-post-create.tsx"),
  "utf8",
)
const fields = {
  postType: "text",
  content: "Mensagem privada",
  details: "",
  linkUrl: "",
  pollOptions: [],
  photoPath: "",
}

beforeEach(() => {
  storage.removeItem("bivaque.post-draft.v2:user-a")
  storage.removeItem("bivaque.post-draft.v2:user-b")
  storage.removeItem("bivaque.post-audience.v1:user-a:locality-a")
  storage.removeItem("bivaque.post-audience.v1:user-a:locality-b")
  vi.stubGlobal("window", { localStorage: storage })
})

describe("rascunho de publicação isolado por membro e locality", () => {
  it("salva e recupera para o mesmo membro e contexto", () => {
    expect(
      savePostDraftFields(fields, {
        ownerId: "user-a",
        localityId: "locality-a",
        audienceKey: "community:community-a",
      }),
    ).toBe(true)

    expect(loadPostDraft("user-a", "locality-a")).toMatchObject({
      ownerId: "user-a",
      localityId: "locality-a",
      audienceKey: "community:community-a",
      content: "Mensagem privada",
    })
  })

  it("não expõe o mesmo texto para outra conta ou outra cidade", () => {
    savePostDraftFields(fields, {
      ownerId: "user-a",
      localityId: "locality-a",
      audienceKey: "community:community-a",
    })

    expect(loadPostDraft("user-b", "locality-a")).toBeNull()
    expect(loadPostDraft("user-a", "locality-b")).toBeNull()
  })

  it("não importa o formato global antigo", () => {
    storage.setItem(
      "bivaque.post-draft.v1",
      JSON.stringify({ ...fields, postType: "text", savedAt: Date.now() }),
    )

    expect(loadPostDraft("user-a", "locality-a")).toBeNull()
  })

  it("limpa apenas o rascunho do membro atual", () => {
    savePostDraftFields(fields, {
      ownerId: "user-a",
      localityId: "locality-a",
      audienceKey: "community:community-a",
    })
    savePostDraftFields(
      { ...fields, content: "Outra conta" },
      {
        ownerId: "user-b",
        localityId: "locality-a",
        audienceKey: "community:community-b",
      },
    )

    clearPostDraft("user-a")

    expect(loadPostDraft("user-a", "locality-a")).toBeNull()
    expect(loadPostDraft("user-b", "locality-a")?.content).toBe("Outra conta")
  })

  it("mantém a audiência como preferência local do mesmo contexto", () => {
    expect(savePostAudience("user-a", "locality-a", "group:group-a")).toBe(true)
    expect(loadPostAudience("user-a", "locality-a")).toBe("group:group-a")
    expect(loadPostAudience("user-b", "locality-a")).toBeNull()
    expect(loadPostAudience("user-a", "locality-b")).toBeNull()
  })

  it("o compositor só restaura e salva depois do contexto estar resolvido", () => {
    expect(composerSource).toContain("loadPostDraft(ownerId, localityId)")
    expect(composerSource).toContain("clearPostDraft(ownerId)")
    expect(composerSource).toContain("!draftReady || audience.loading || audience.error")
    expect(composerSource).toContain("availableAudienceKeys.has(audienceKey)")
  })
})
