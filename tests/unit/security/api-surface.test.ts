import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { API_SURFACE, POSTURAS, TOTAL_DE_ROTAS } from "web/lib/security/api-surface"

// O manifesto só vale se o disco concordar com ele: rota nova sem classificação,
// classificação sem arquivo (órfã) e marcador que não existe no handler são
// falhas fechadas, não avisos.

vi.mock("server-only", () => ({}))
// O avatar resolve a sessão pelo cookie e desiste antes de tocar no banco.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], setAll: () => {} }),
}))

const RAIZ = process.cwd()
const BASE_DA_API = join(RAIZ, "apps", "web", "app", "api")

function rotasNoDisco(dir: string, encontradas: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      rotasNoDisco(caminho, encontradas)
    } else if (entrada.name === "route.ts") {
      const pasta = relative(BASE_DA_API, dir).replaceAll("\\", "/")
      encontradas.push(`/api/${pasta}`)
    }
  }
  return encontradas.sort()
}

function arquivoDaRota(rota: string): string {
  return join(RAIZ, "apps", "web", "app", rota, "route.ts")
}

const POSTURAS_PUBLICAS = new Set([
  "porta-sem-sessao",
  "catalogo-publico",
  "descadastro-por-token",
  "infraestrutura-sem-guarda",
])

describe("manifesto da superfície de /api", () => {
  it("classifica exatamente as 84 rotas do disco, sem órfã", () => {
    const disco = rotasNoDisco(BASE_DA_API)
    const manifesto = API_SURFACE.map((linha) => linha.rota).sort()
    expect(disco).toHaveLength(TOTAL_DE_ROTAS)
    expect(manifesto).toEqual(disco)
  })

  it("não repete rota e usa só as oito posturas declaradas", () => {
    const rotas = API_SURFACE.map((linha) => linha.rota)
    expect(new Set(rotas).size).toBe(rotas.length)
    const validas = new Set(POSTURAS.map((postura) => postura.id))
    for (const linha of API_SURFACE) expect(validas.has(linha.postura)).toBe(true)
    expect(new Set(API_SURFACE.map((linha) => linha.postura)).size).toBe(POSTURAS.length)
  })

  it("encontra o marcador de guarda no arquivo de cada rota", () => {
    for (const linha of API_SURFACE) {
      const arquivo = arquivoDaRota(linha.rota)
      expect(existsSync(arquivo), `rota sem arquivo: ${linha.rota}`).toBe(true)
      expect(readFileSync(arquivo, "utf8"), `marcador ausente: ${linha.rota}`).toContain(
        linha.marcador,
      )
    }
  })

  it("cita prova que existe, ou motivo explícito de ser pública", () => {
    for (const linha of API_SURFACE) {
      if (linha.prova.tipo === "teste") {
        expect(
          existsSync(join(RAIZ, linha.prova.arquivo)),
          `prova inexistente: ${linha.prova.arquivo}`,
        ).toBe(true)
        expect(linha.prova.caso.length).toBeGreaterThan(10)
        expect(POSTURAS_PUBLICAS.has(linha.postura)).toBe(false)
      } else {
        expect(POSTURAS_PUBLICAS.has(linha.postura)).toBe(true)
        expect(linha.prova.motivo.length).toBeGreaterThan(20)
      }
    }
  })
})

describe("negação sem credencial nas rotas sem prova própria", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("GET /api/avatar sem cookie responde 401", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anonima")
    const { GET } = await import("web/app/api/avatar/[userId]/route")
    const resposta = await GET(new Request("http://localhost:3000/api/avatar/pessoa"), {
      params: Promise.resolve({ userId: "00000000-0000-4000-8000-000000000001" }),
    })
    expect(resposta.status).toBe(401)
  })

  it("GET /api/admin/admissions sem Bearer responde 401", async () => {
    const { GET } = await import("web/app/api/admin/admissions/route")
    expect((await GET(new Request("http://localhost:3000/api/admin/admissions"))).status).toBe(401)
  })

  it("GET /api/admin/portal-health sem Bearer responde 401", async () => {
    const { GET } = await import("web/app/api/admin/portal-health/route")
    expect((await GET(new Request("http://localhost:3000/api/admin/portal-health"))).status).toBe(
      401,
    )
  })

  it("GET /api/admin/rls-health sem Bearer responde 401", async () => {
    const { GET } = await import("web/app/api/admin/rls-health/route")
    expect((await GET(new Request("http://localhost:3000/api/admin/rls-health"))).status).toBe(401)
  })

  it("POST /api/consent sem Bearer responde 401", async () => {
    const { POST } = await import("web/app/api/consent/route")
    const resposta = await POST(
      new Request("http://localhost:3000/api/consent", { method: "POST" }),
    )
    expect(resposta.status).toBe(401)
  })

  it("POST /api/onboarding sem Bearer responde 401", async () => {
    const { POST } = await import("web/app/api/onboarding/route")
    const resposta = await POST(
      new Request("http://localhost:3000/api/onboarding", { method: "POST" }),
    )
    expect(resposta.status).toBe(401)
  })

  it("GET /api/onboarding/status sem Bearer responde 401", async () => {
    const { GET } = await import("web/app/api/onboarding/status/route")
    expect((await GET(new Request("http://localhost:3000/api/onboarding/status"))).status).toBe(401)
  })

  it("POST /api/internal/outbox sem segredo responde 401", async () => {
    vi.stubEnv("OUTBOX_WORKER_SECRET", "segredo-de-teste")
    const { POST } = await import("web/app/api/internal/outbox/route")
    const resposta = await POST(
      new Request("http://localhost:3000/api/internal/outbox", { method: "POST" }),
    )
    expect(resposta.status).toBe(401)
  })
})
