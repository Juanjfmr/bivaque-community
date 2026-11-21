import { type APIRequestContext, expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { VALOR_DO_CABECALHO_DO_APP } from "../../apps/web/lib/app-api/contrato"
import { chaveAnonimaDoSupabase, MEMBRO_SEMEADO, urlDoSupabase } from "./entrada-real-ajuda"
import { readEnvLocal } from "./helpers/session"

const headers = {
  origin: "https://localhost",
  "x-bivaque-cliente": "loja",
  "x-bivaque-app": VALOR_DO_CABECALHO_DO_APP,
}

async function novaSessao() {
  const url = urlDoSupabase()
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
    throw new Error("A prova exige Supabase local")
  }
  const password = process.env["BIVAQUE_VISUAL_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!password) throw new Error("Senha da persona de teste ausente")
  const client = createClient(url, chaveAnonimaDoSupabase(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email: MEMBRO_SEMEADO, password })
  if (error || !data.session) throw new Error("Falha ao entrar com a persona de teste")
  return data.session
}

function renovar(request: APIRequestContext, refreshToken: string) {
  return request.post("/api/app/sessao/renovar", {
    headers,
    data: { refresh_token: refreshToken },
  })
}

// @stateful: cria e revoga sessões da persona semeada no GoTrue local.
test.describe("sessão nativa contra GoTrue", { tag: "@stateful" }, () => {
  test("reuso fora da janela revoga a família", async ({ request }) => {
    async function rotacionar() {
      const r0 = (await novaSessao()).refresh_token
      const primeira = await renovar(request, r0)
      expect(primeira.status()).toBe(200)
      const r1 = (await primeira.json()).refresh_token as string
      const segunda = await renovar(request, r1)
      expect(segunda.status()).toBe(200)
      const sessaoR2 = await segunda.json()
      return { r0, r2: sessaoR2.refresh_token as string, accessR2: sessaoR2.access_token as string }
    }

    const [sessaoA, sessaoB] = await Promise.all([rotacionar(), rotacionar()])
    await Promise.all([
      new Promise((resolve) => setTimeout(resolve, 11_000)),
      new Promise((resolve) => setTimeout(resolve, 11_000)),
    ])

    const r0A = await renovar(request, sessaoA.r0)
    const corpoR0A = await r0A.json()
    const direta = await request.post(`${urlDoSupabase()}/auth/v1/token?grant_type=refresh_token`, {
      headers: { apikey: chaveAnonimaDoSupabase() },
      data: { refresh_token: sessaoA.r2 },
    })
    const corpoDireta = await direta.json()
    const usuario = await request.get(`${urlDoSupabase()}/auth/v1/user`, {
      headers: { apikey: chaveAnonimaDoSupabase(), authorization: `Bearer ${sessaoA.accessR2}` },
    })
    test.info().annotations.push({
      type: "diagnostico",
      description: JSON.stringify({
        rotaR0: { status: r0A.status(), erro: corpoR0A.erro },
        goTrueR2: {
          status: direta.status(),
          error_code: corpoDireta.error_code,
          error: corpoDireta.error,
        },
        usuarioR2: { status: usuario.status() },
      }),
    })

    expect(r0A.status()).toBe(401)
    expect((await renovar(request, sessaoB.r0)).status()).toBe(401)
    expect((await renovar(request, sessaoB.r2)).status()).toBe(401)
  })

  test("sair revoga acesso e renovação", async ({ request }) => {
    const sessao = await novaSessao()
    const bearer = { ...headers, authorization: `Bearer ${sessao.access_token}` }
    expect((await request.get("/api/app/voce", { headers: bearer })).status()).toBe(200)
    const saida = await request.post("/api/app/voce/sair", { headers: bearer })
    expect(saida.status()).toBe(200)
    expect(saida.headers()["clear-site-data"]).toBeUndefined()
    expect((await request.get("/api/app/voce", { headers: bearer })).status()).toBe(401)
    expect((await renovar(request, sessao.refresh_token)).status()).toBe(401)
  })
})
