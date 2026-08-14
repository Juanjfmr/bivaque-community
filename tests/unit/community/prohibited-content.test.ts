import { CreatePostSchema, PostContentSchema } from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("post content validation", () => {
  it("accepts vocabulary the filter used to block (D21)", () => {
    const phrases = [
      "Ofertas do marketplace local",
      "Qual a sua patente?",
      "Cuidado com golpe pedindo CPF",
      "Procuro plano de saúde para dependente",
      "Alguém tem o telefone do despachante?",
    ]
    for (const phrase of phrases) {
      expect(PostContentSchema.safeParse(phrase).success).toBe(true)
    }
  })

  it("accepts a valid text post", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "text",
      content: "Ola comunidade! Vamos nos encontrar?",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a valid photo post with photo path", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "photo",
      content: "Foto da reuniao de ontem",
      photoPath: "event-photos/abc123/foto.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a valid link post with URL", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "link",
      content: "Noticia sobre a cidade",
      linkUrl: "https://example.com/noticia",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a valid poll post with options", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "poll",
      content: "Qual o melhor dia?",
      pollOptions: ["Segunda", "Quarta", "Sexta"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects a photo post without photoPath", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "photo",
      content: "Foto da comunidade",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a link post without linkUrl", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "link",
      content: "Confira este link",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a text post that carries a photoPath", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "text",
      content: "Post normal",
      photoPath: "event-photos/fake.jpg",
    })
    expect(result.success).toBe(false)
  })

  it("rejects poll with fewer than 2 options", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "poll",
      content: "Enquete invalida",
      pollOptions: ["So uma opcao"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = PostContentSchema.safeParse("")
    expect(result.success).toBe(false)
  })

  it("rejects content exceeding maximum length", () => {
    const result = PostContentSchema.safeParse("a".repeat(2001))
    expect(result.success).toBe(false)
  })
})
