import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { avatarFallbackVisible } from "web/app/api/avatar/avatar-fallback"

// RECON-048, defeito 1. A peca grande do cabecalho de /profile aparecia vazia
// em 375 e 1440, enquanto as pequenas mostravam a inicial. Causa medida no DOM:
// o <Avatar.Image> do HeroUI v3 e o Radix por baixo, e o Radix so monta o <img>
// depois que o proprio pre-carregamento reporta "loaded". Num 404 o status vai
// para "error" e nenhum <img> existe — entao o onError nativo do wrapper
// (RUN-022) nunca disparava, a origem nunca era limpa, e o recuo, montado so
// quando a origem era nula, nunca aparecia.
//
// A cobranca e o caminho de ERRO (origem presente que falha), nao a origem
// nula, que ja funcionava: o status "error" da foto tem de manter a inicial
// visivel, e o wrapper tem de decidir o recuo por esse status — nunca pelo
// evento de erro que a biblioteca nao repassa.
const root = join(import.meta.dirname, "..", "..", "..")
const avatarFile = join(root, "apps", "web", "app", "components", "bivaque", "avatar.tsx")

describe("RECON-048 — recuo do avatar quando a origem falha", () => {
  it("o status de erro da foto mantem a inicial visivel", () => {
    // O caminho que quebrou: origem presente, carregamento falhou.
    expect(avatarFallbackVisible("error")).toBe(true)
    // Enquanto a biblioteca nao confirmou o carregamento, a inicial tambem fica.
    expect(avatarFallbackVisible("idle")).toBe(true)
    expect(avatarFallbackVisible("loading")).toBe(true)
    // So a foto carregada esconde a inicial.
    expect(avatarFallbackVisible("loaded")).toBe(false)
  })

  it("o wrapper decide o recuo pelo status e nao pelo evento de erro da imagem", () => {
    const source = readFileSync(avatarFile, "utf8")
    expect(source).toContain("avatarFallbackVisible(status)")
    // O mecanismo morto do RUN-022 nao pode voltar: o Radix nao monta o <img>
    // no 404, entao um onError no <Avatar.Image> nunca dispara.
    expect(source).not.toMatch(/\bonError=/)
  })
})
