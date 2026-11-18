import { existsSync } from "node:fs"
import { join } from "node:path"
import { getRedirectStatus } from "next/dist/lib/redirect-status"
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match"
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import nextConfig from "../../../apps/web/next.config"
import { isPublicPath } from "../../../apps/web/lib/security/route-surface"

// SEC-017 (ADR-20261118-convite-familiar-so-no-app): a tela antiga /convite saiu
// da web. O link antigo leva o código para a porta do app, que aceita o convite
// sem senha e sem CPF; nada mais da web atende o convite de familiar.

const ORIGEM = "https://bivaque.example.invalid"

// Mesmos matchers do resolve-routes do Next, sem servidor (molde do
// lan-troca-redirect.test.ts).
async function resolver(caminho: string) {
  const url = new URL(caminho, ORIGEM)
  const query = Object.fromEntries(url.searchParams)
  for (const regra of (await nextConfig.redirects?.()) ?? []) {
    const parametros = getPathMatch(regra.source)(url.pathname)
    if (!parametros) continue
    const condicoes = matchHas(new NextRequest(url), query, regra.has, regra.missing)
    if (!condicoes) continue
    const { newUrl, parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: regra.destination,
      params: { ...parametros, ...condicoes },
      query,
    })
    const destino = new URL(newUrl, ORIGEM)
    for (const [chave, valor] of Object.entries(parsedDestination.query)) {
      for (const item of Array.isArray(valor) ? valor : [valor]) {
        if (item !== undefined && !destino.searchParams.has(chave)) {
          destino.searchParams.append(chave, item)
        }
      }
    }
    return Response.redirect(destino, getRedirectStatus(regra))
  }
  return new Response()
}

async function destinoDe(caminho: string) {
  const resposta = await resolver(caminho)
  expect(resposta.status, caminho).toBe(307)
  return new URL(resposta.headers.get("location") ?? "", ORIGEM)
}

describe("o convite antigo de familiar vai para a porta do app", () => {
  it("/convite?codigo=X leva o código em ?convite=", async () => {
    const destino = await destinoDe("/convite?codigo=7K4M9QRT")
    expect(destino.pathname).toBe("/app/entrar")
    expect(destino.searchParams.get("convite")).toBe("7K4M9QRT")
  })

  it("o código com hífen e minúsculas chega intacto (a porta normaliza)", async () => {
    const destino = await destinoDe("/convite?codigo=7k4m-9qrt")
    expect(destino.searchParams.get("convite")).toBe("7k4m-9qrt")
  })

  it.each(["/convite", "/convite?legado=1", "/convite?codigo="])(
    "%s sem código cai na porta crua",
    async (caminho) => {
      const destino = await destinoDe(caminho)
      expect(destino.pathname).toBe("/app/entrar")
      expect(destino.searchParams.get("convite")).toBeNull()
    },
  )

  it("o destino não redireciona de novo (sem ciclo)", async () => {
    const destino = await destinoDe("/convite?codigo=7K4M9QRT")
    const segunda = await resolver(`${destino.pathname}${destino.search}`)
    expect(segunda.headers.get("location")).toBeNull()
  })

  it("/convite/x não casa a regra exata e não é público no proxy", async () => {
    expect((await resolver("/convite/ABCD1234")).headers.get("location")).toBeNull()
    expect(isPublicPath("/convite/ABCD1234")).toBe(false)
    expect(isPublicPath("/convite")).toBe(false)
  })

  it("a tela, as ações com senha e o cliente de serviço saíram da web", () => {
    const pasta = join(process.cwd(), "apps/web/app/(preauth)/convite")
    expect(existsSync(pasta)).toBe(false)
    expect(existsSync(join(process.cwd(), "apps/web/lib/convite/form-error.ts"))).toBe(false)
  })
})
