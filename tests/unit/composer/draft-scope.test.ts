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
  storage.removeItem("bivaque.post-draft.v3:user-a:locality-a")
  storage.removeItem("bivaque.post-draft.v3:user-a:locality-b")
  storage.removeItem("bivaque.post-draft.v3:user-b:locality-a")
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

  it("mantém rascunhos simultâneos de duas localidades", () => {
    savePostDraftFields(fields, {
      ownerId: "user-a",
      localityId: "locality-a",
      audienceKey: "community:community-a",
    })
    savePostDraftFields(
      { ...fields, content: "Mensagem da outra cidade" },
      {
        ownerId: "user-a",
        localityId: "locality-b",
        audienceKey: "city",
      },
    )

    expect(loadPostDraft("user-a", "locality-a")?.content).toBe("Mensagem privada")
    expect(loadPostDraft("user-a", "locality-b")?.content).toBe("Mensagem da outra cidade")
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

  it("não importa formatos antigos sem escopo de locality", () => {
    storage.setItem(
      "bivaque.post-draft.v1",
      JSON.stringify({ ...fields, postType: "text", savedAt: Date.now() }),
    )
    storage.setItem(
      "bivaque.post-draft.v2:user-a",
      JSON.stringify({
        ...fields,
        ownerId: "user-a",
        localityId: "locality-a",
        audienceKey: "city",
      }),
    )

    expect(loadPostDraft("user-a", "locality-a")).toBeNull()
  })

  it("limpa somente o rascunho do membro e locality atuais", () => {
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
    savePostDraftFields(
      { ...fields, content: "Outra cidade" },
      {
        ownerId: "user-a",
        localityId: "locality-b",
        audienceKey: "city",
      },
    )

    clearPostDraft("user-a", "locality-a")

    expect(loadPostDraft("user-a", "locality-a")).toBeNull()
    expect(loadPostDraft("user-b", "locality-a")?.content).toBe("Outra conta")
    expect(loadPostDraft("user-a", "locality-b")?.content).toBe("Outra cidade")
  })

  it("mantém a audiência como preferência local do mesmo contexto", () => {
    expect(savePostAudience("user-a", "locality-a", "group:group-a")).toBe(true)
    expect(loadPostAudience("user-a", "locality-a")).toBe("group:group-a")
    expect(loadPostAudience("user-b", "locality-a")).toBeNull()
    expect(loadPostAudience("user-a", "locality-b")).toBeNull()
  })

  it("reinicia o formulário e protege autosave quando o escopo muda", () => {
    expect(composerSource).toContain("loadPostDraft(ownerId, localityId)")
    expect(composerSource).toContain("loadedDraftScopeRef.current = null")
    expect(composerSource).toContain("setDraftReady(false)")
    expect(composerSource).toContain("scopeIsCurrent")
    expect(composerSource).toContain("suppressDraftFlushRef")
    expect(composerSource).toContain("clearPostDraft(ownerId, localityId)")
    expect(composerSource).toContain("availableAudienceKeys.has(audienceKey)")
  })

  it("não apaga rascunho quando os campos ficam vazios", () => {
    const persistBlock = composerSource.slice(
      composerSource.indexOf("const persistDraft"),
      composerSource.indexOf("const draftFields"),
    )
    expect(persistBlock).toContain("if (!hasDraftContent")
    expect(persistBlock).not.toContain("clearPostDraft")
  })
})
