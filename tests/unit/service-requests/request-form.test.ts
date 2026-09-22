import { describe, expect, it } from "vitest"
import {
  firstFailure,
  SERVICE_REQUEST_DESCRIPTION_MAX,
  SERVICE_REQUEST_MAX_PHOTOS,
  SERVICE_REQUEST_PHOTO_MAX_BYTES,
  SERVICE_REQUEST_WHEN_MAX,
  validateRequestDescription,
  validateRequestPhotos,
  validateRequestWhen,
} from "../../../apps/web/lib/service-requests/request-form"

// RECON-022 — os limites da borda exatamente como os `check`s da migration
// 20260911032309_service_requests. O servidor valida ANTES de tocar o banco;
// estes testes provam os limites sem precisar do banco.

describe("validação do formulário de pedido", () => {
  it("descrição exige entre 1 e 500 caracteres", () => {
    expect(validateRequestDescription("")).not.toHaveProperty("ok", true)
    expect(validateRequestDescription("   ")).not.toHaveProperty("ok", true)
    expect(validateRequestDescription("Preciso instalar duas luminárias")).toHaveProperty(
      "ok",
      true,
    )
    expect(validateRequestDescription("x".repeat(SERVICE_REQUEST_DESCRIPTION_MAX))).toHaveProperty(
      "ok",
      true,
    )
    expect(
      validateRequestDescription("x".repeat(SERVICE_REQUEST_DESCRIPTION_MAX + 1)),
    ).not.toHaveProperty("ok", true)
  })

  it("prazo desejado é opcional e tem teto de 120", () => {
    expect(validateRequestWhen(null)).toHaveProperty("ok", true)
    expect(validateRequestWhen("   ")).toHaveProperty("ok", true)
    expect(validateRequestWhen("A combinar")).toHaveProperty("ok", true)
    expect(validateRequestWhen("x".repeat(SERVICE_REQUEST_WHEN_MAX))).toHaveProperty("ok", true)
    expect(validateRequestWhen("x".repeat(SERVICE_REQUEST_WHEN_MAX + 1))).not.toHaveProperty(
      "ok",
      true,
    )
  })

  it("fotos aceitam até o limite, somente imagem aprovada e 10 MB cada", () => {
    expect(validateRequestPhotos([])).toHaveProperty("ok", true)
    expect(
      validateRequestPhotos(
        Array.from({ length: SERVICE_REQUEST_MAX_PHOTOS }, () => ({
          size: 1024,
          type: "image/jpeg",
        })),
      ),
    ).toHaveProperty("ok", true)
    expect(
      validateRequestPhotos(
        Array.from({ length: SERVICE_REQUEST_MAX_PHOTOS + 1 }, () => ({
          size: 1024,
          type: "image/png",
        })),
      ),
    ).not.toHaveProperty("ok", true)
    expect(validateRequestPhotos([{ size: 1024, type: "application/pdf" }])).not.toHaveProperty(
      "ok",
      true,
    )
    expect(
      validateRequestPhotos([{ size: SERVICE_REQUEST_PHOTO_MAX_BYTES, type: "image/webp" }]),
    ).toHaveProperty("ok", true)
    expect(
      validateRequestPhotos([{ size: SERVICE_REQUEST_PHOTO_MAX_BYTES + 1, type: "image/webp" }]),
    ).not.toHaveProperty("ok", true)
  })

  it("firstFailure devolve a primeira falha e ok quando tudo passa", () => {
    expect(
      firstFailure(validateRequestWhen(null), validateRequestDescription("Tudo certo")),
    ).toEqual({ ok: true })
    expect(
      firstFailure(validateRequestDescription(""), validateRequestWhen("A combinar")),
    ).toMatchObject({ ok: false, field: "description" })
  })
})
