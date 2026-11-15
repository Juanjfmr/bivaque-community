import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// O `@supabase/ssr` é trocado por um cliente que, como o real, chama `setAll`
// quando o GoTrue pede a remoção dos cookies no `signOut`. Tudo o mais —
// resolvedor, `exigirSessao`, `conferirEscrita`, `responder` — é o código de
// produção. É o único jeito de provar, sem GoTrue, que a remoção chega à
// resposta: o app não tem cliente Supabase para sair por conta própria
// (ADR-20261105).

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))

import { createServerClient } from "@supabase/ssr"
import { OPTIONS, POST } from "web/app/api/app/voce/sair/route"

const criarClienteDoCookie = vi.mocked(createServerClient)

const ORIGEM = "http://localhost:3000"
const COOKIE = "sb-projeto-auth-token=valor-da-sessao"
const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }

const CABECALHOS = { origin: ORIGEM, "x-bivaque-app": "bivaque-spa", cookie: COOKIE }

type ConfiguracaoDoSsr = {
  cookies: { setAll: (cookies: readonly Record<string, unknown>[]) => void }
}

const sessoesEncerradas: number[] = []
const escoposDeSaida: (string | undefined)[] = []
let respostaDoGoTrue: { error: { message: string } | null } = { error: null }

function requisicao(cabecalhos: Record<string, string> = CABECALHOS) {
  return new NextRequest(`${ORIGEM}/api/app/voce/sair`, { method: "POST", headers: cabecalhos })
}

beforeEach(() => {
  vi.clearAllMocks()
  sessoesEncerradas.length = 0
  escoposDeSaida.length = 0
  respostaDoGoTrue = { error: null }
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anonima")
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  vi.stubEnv("NODE_ENV", "test")

  criarClienteDoCookie.mockImplementation(((_url: string, _chave: string, opcoes: never) => {
    const configuracao = opcoes as unknown as ConfiguracaoDoSsr
    return {
      auth: {
        getUser: async () => ({ data: { user: PESSOA }, error: null }),
        signOut: async (opcoes?: { scope?: string }) => {
          sessoesEncerradas.push(Date.now())
          escoposDeSaida.push(opcoes?.scope)
          if (respostaDoGoTrue.error === null) {
            // O que o `@supabase/ssr` pede ao encerrar: os cookies do pacote de
            // sessão com valor vazio e `maxAge: 0`.
            configuracao.cookies.setAll([
              { name: "sb-projeto-auth-token", value: "", options: { path: "/", maxAge: 0 } },
            ])
          }
          return respostaDoGoTrue
        },
      },
    }
  }) as never)
})

describe("POST /api/app/voce/sair", () => {
  it("encerra a sessão e devolve os cookies de remoção na resposta", async () => {
    const resposta = await POST(requisicao())

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(sessoesEncerradas).toHaveLength(1)
    const removidos = resposta.headers.get("set-cookie") ?? ""
    expect(removidos).toContain("sb-projeto-auth-token=;")
    expect(removidos).toMatch(/Max-Age=0/i)
    expect(resposta.headers.get("cache-control")).toBe("no-store")
  })

  it("encerra a sessão só neste aparelho (escopo local), como o subtítulo promete", async () => {
    const resposta = await POST(requisicao())

    expect(resposta.status).toBe(200)
    expect(escoposDeSaida, "sem escopo o GoTrue desloga a pessoa de todos os aparelhos").toEqual([
      "local",
    ])
  })

  it("sem sessão é 401 e não chega ao GoTrue", async () => {
    const resposta = await POST(requisicao({ origin: ORIGEM, "x-bivaque-app": "bivaque-spa" }))

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toMatchObject({ autenticado: false })
    expect(sessoesEncerradas).toHaveLength(0)
    expect(resposta.headers.get("set-cookie")).toBeNull()
  })

  it.each([
    ["sem o cabeçalho do app", { origin: ORIGEM, cookie: COOKIE }],
    ["com origem fora da lista", { ...CABECALHOS, origin: "https://fora.example" }],
  ])("escrita %s é 403 (CSRF), e a sessão continua", async (_, cabecalhos) => {
    const resposta = await POST(requisicao(cabecalhos))

    expect(resposta.status).toBe(403)
    expect(sessoesEncerradas).toHaveLength(0)
  })

  it("GoTrue fora é 503, nunca saída silenciosa", async () => {
    respostaDoGoTrue = { error: { message: "segredo do GoTrue" } }
    const resposta = await POST(requisicao())

    const corpo = await resposta.text()
    expect(resposta.status).toBe(503)
    expect(JSON.parse(corpo)).toEqual({ erro: "saida-indisponivel" })
    expect(corpo).not.toContain("segredo do GoTrue")
  })

  it("preflight da origem do app responde 204 e a de fora 403", async () => {
    const permitida = OPTIONS(
      new NextRequest(`${ORIGEM}/api/app/voce/sair`, {
        method: "OPTIONS",
        headers: { origin: ORIGEM },
      }),
    )
    expect(permitida.status).toBe(204)
    expect(permitida.headers.get("access-control-allow-headers")).toContain("x-bivaque-app")
    expect(permitida.headers.get("access-control-allow-methods")).toContain("POST")

    const fora = OPTIONS(
      new NextRequest(`${ORIGEM}/api/app/voce/sair`, {
        method: "OPTIONS",
        headers: { origin: "https://fora.example" },
      }),
    )
    expect(fora.status).toBe(403)
    expect(fora.headers.get("access-control-allow-origin")).toBeNull()
  })
})
