import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { deriveEditedPost } from "web/lib/composer/post-attachment"

describe("deriveEditedPost", () => {
  it("remover a foto de um post de foto volta para texto, sem caminho", () => {
    expect(deriveEditedPost("photo", "texto", "")).toEqual({
      content: "texto",
      post_type: "text",
      photo_path: null,
    })
  })

  it("trocar ou manter a foto grava photo com o caminho limpo", () => {
    expect(deriveEditedPost("photo", "texto", " u/novo.jpg ")).toEqual({
      content: "texto",
      post_type: "photo",
      photo_path: "u/novo.jpg",
    })
  })

  it("anexar foto a um post de texto promove para photo", () => {
    expect(deriveEditedPost("text", "texto", "u/a.jpg")).toEqual({
      content: "texto",
      post_type: "photo",
      photo_path: "u/a.jpg",
    })
  })

  it("texto sem foto não toca em photo_path", () => {
    expect(deriveEditedPost("text", "texto", "")).toEqual({ content: "texto", post_type: "text" })
  })

  it("link mantém tipo e não ganha coluna de foto", () => {
    expect(deriveEditedPost("link", "texto", "u/a.jpg")).toEqual({
      content: "texto",
      post_type: "link",
    })
  })
})

describe("a edição só anuncia sucesso quando o banco alterou a linha", () => {
  const root = join(process.cwd(), "apps", "web", "app")
  const editor = readFileSync(join(root, "components", "bivaque", "feed-post-edit.tsx"), "utf8")
  const route = readFileSync(
    join(root, "(shell)", "publicacoes", "[id]", "editar", "page.tsx"),
    "utf8",
  )
  const card = readFileSync(join(root, "components", "bivaque", "feed-post-card.tsx"), "utf8")

  it("o UPDATE devolve as linhas alteradas e zero linhas é falha", () => {
    expect(editor).toContain('.select("id")')
    expect(editor).toContain("data.length === 0")
    expect(editor).toContain("deriveEditedPost(post.post_type, composed, photoPath)")
  })

  it("a edição volta para a tela de origem, validada pela allowlist", () => {
    expect(card).toContain("?origem=")
    expect(card).toContain("window.location.pathname")
    expect(card).toContain("window.location.search")
    expect(route).toContain('resolvePostLoginDestination([searchParams.get("origem")])')
    expect(route).not.toContain('router.push("/community")')
  })
})
