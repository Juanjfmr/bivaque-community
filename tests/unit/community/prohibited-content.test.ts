import { CreatePostSchema, PostContentSchema } from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("prohibited content boundary", () => {
  it("rejects post content containing 'anonimo'", () => {
    const result = PostContentSchema.safeParse("Post anônimo na comunidade")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'video'", () => {
    const result = PostContentSchema.safeParse("Assista ao vídeo da semana")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'marketplace'", () => {
    const result = PostContentSchema.safeParse("Ofertas do marketplace local")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'gerado por IA'", () => {
    const result = PostContentSchema.safeParse("Conteudo gerado por IA")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'inteligencia artificial'", () => {
    const result = PostContentSchema.safeParse("Texto com inteligência artificial")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'OM' as a standalone term", () => {
    const result = PostContentSchema.safeParse("Minha OM e o batalhao")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'patente'", () => {
    const result = PostContentSchema.safeParse("Qual a sua patente?")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'posto militar'", () => {
    const result = PostContentSchema.safeParse("Meu posto militar e oficial")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'graduacao militar'", () => {
    const result = PostContentSchema.safeParse("Minha graduação militar")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'endereco residencial'", () => {
    const result = PostContentSchema.safeParse("Meu endereco residencial fica na rua X")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'CEP'", () => {
    const result = PostContentSchema.safeParse("Meu CEP e 69000-000")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'CPF'", () => {
    const result = PostContentSchema.safeParse("Meu CPF foi bloqueado")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'selo de verificacao'", () => {
    const result = PostContentSchema.safeParse("Selo de verificacao para membros")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'verificado publicamente'", () => {
    const result = PostContentSchema.safeParse("Usuario verificado publicamente")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'comercial'", () => {
    const result = PostContentSchema.safeParse("Anuncio comercial")
    expect(result.success).toBe(false)
  })

  it("rejects post content containing 'venda'", () => {
    const result = PostContentSchema.safeParse("Produtos a venda")
    expect(result.success).toBe(false)
  })

  it("rejects a create-post with video-like content in the payload", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "text",
      content: "Assista ao vídeo da comunidade",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a create-post with CPF in content", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "text",
      content: "CPF para contato",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a create-post with OM and rank references", () => {
    const result = CreatePostSchema.safeParse({
      localityId: "00000000-0000-4000-8000-000000000001",
      postType: "text",
      content: "Minha OM tem patente alta",
    })
    expect(result.success).toBe(false)
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
