import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// SEC-007: o portão do proxy abre `/app` (a porta do app) por pasta — o caminho
// exato ou `/app/…` —, não por prefixo solto. Com `startsWith("/app")` qualquer
// rota que começasse por essas três letras (`/application`, `/approve`, uma
// rota futura) passava sem sessão. O teste roda o `proxy` de verdade, com o
// cliente do Supabase trocado por um que não tem sessão nenhuma.

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  })),
}))

type Proxy = (request: NextRequest) => Promise<Response>

async function carregarProxy(): Promise<Proxy> {
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anonima")
  vi.stubEnv("BIVAQUE_AUTH_BYPASS", "")
  const modulo = await import("web/proxy")
  return modulo.proxy as Proxy
}

const pedir = (proxy: Proxy, caminho: string) =>
  proxy(new NextRequest(`http://localhost:3000${caminho}`))

const passou = (resposta: Response) => resposta.headers.get("x-middleware-next") === "1"
const foiParaLogin = (resposta: Response) =>
  resposta.status === 307 && new URL(resposta.headers.get("location") ?? "").pathname === "/login"

describe("portão do proxy para /app", () => {
  let proxy: Proxy

  beforeEach(async () => {
    proxy = await carregarProxy()
  })

  it.each(["/app", "/app/", "/app/entrar", "/app/assets/index-abc.js"])(
    "%s é a porta do app e passa sem sessão",
    async (caminho) => {
      expect(passou(await pedir(proxy, caminho))).toBe(true)
    },
  )

  it.each([
    "/app/conversas",
    "/app/conversa/41000000-0000-4000-8000-000000000051",
    "/app/anuncio/41000000-0000-4000-8000-000000000051",
    "/app/pergunta/41000000-0000-4000-8000-000000000051",
    "/app/pedidos",
    "/app/pedido/41000000-0000-4000-8000-000000000051",
    "/app/negocio/41000000-0000-4000-8000-000000000051",
    "/app/bloqueados",
    "/app/voce",
    "/app/inicio",
    "/app/busca",
  ])("LAN-TROCA: %s chega ao portão do app sem voltar à web", async (caminho) => {
    expect(passou(await pedir(proxy, caminho))).toBe(true)
  })

  it.each(["/application", "/approve", "/apple-touch", "/app-secreto", "/appx/entrar"])(
    "%s NÃO é o app: segue para o login sem sessão",
    async (caminho) => {
      const resposta = await pedir(proxy, caminho)
      expect(passou(resposta)).toBe(false)
      expect(foiParaLogin(resposta)).toBe(true)
    },
  )

  it("os outros caminhos públicos continuam abertos (a mudança é só do /app)", async () => {
    for (const caminho of [
      "/login",
      "/api/app/entry/otp",
      "/auth/callback-error",
      "/convite/ABC",
    ]) {
      expect(passou(await pedir(proxy, caminho)), caminho).toBe(true)
    }
  })
})
