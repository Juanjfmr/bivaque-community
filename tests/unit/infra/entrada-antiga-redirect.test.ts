import { describe, expect, it } from "vitest"
import nextConfig from "../../../apps/web/next.config"

// ENTRADA-WEB-ANTIGA (ADR-20261105-entrada-enxuta-e-r3-sem-parada): cada tela
// antiga de entrada da web redireciona para a porta do app. O teste lê os
// redirects reais da configuração que o servidor aplica, não o texto do arquivo.

const DESTINO = "/app/entrar"

// Casamento do próprio Next para as duas formas usadas aqui: caminho exato e
// subárvore com `:caminho*` (que também casa a raiz da subárvore).
function casa(origem: string, caminho: string): boolean {
  const sufixo = "/:caminho*"
  if (origem.endsWith(sufixo)) {
    const base = origem.slice(0, -sufixo.length)
    return caminho === base || caminho.startsWith(`${base}/`)
  }
  return origem === caminho
}

async function regras() {
  expect(typeof nextConfig.redirects).toBe("function")
  return (await nextConfig.redirects?.()) ?? []
}

type RegraDeRedirect = {
  source: string
  destination: string
  permanent: boolean
  has?: unknown[]
}

function regraPara(lista: RegraDeRedirect[], caminho: string) {
  return lista.filter((regra) => casa(regra.source, caminho))
}

describe("telas antigas de entrada redirecionam para /app/entrar", () => {
  const antigas = [
    "/login",
    "/signup",
    "/recuperar-senha",
    "/nova-senha",
    "/onboarding",
    "/onboarding/locality",
    "/onboarding/documento",
    "/onboarding/perfil",
    "/onboarding/welcome",
  ]

  for (const caminho of antigas) {
    it(`${caminho} cai em ${DESTINO} por redirect temporário`, async () => {
      const lista = await regras()
      const casadas = regraPara(lista, caminho).filter((regra) => regra.has === undefined)
      expect(casadas.length, `${caminho} precisa de uma regra`).toBeGreaterThan(0)
      for (const regra of casadas) {
        expect(regra.destination).toBe(DESTINO)
        expect(regra.permanent).toBe(false)
      }
    })
  }
})

describe("o login preserva o destino de retorno", () => {
  // O proxy manda quem não tem sessão para /login?redirect=<destino>. A regra com
  // `has` repassa a query para a porta do app; a genérica a descartaria.
  it("/login?redirect=X vai para /app/entrar?redirect=X por redirect temporário", async () => {
    const lista = await regras()
    const comQuery = regraPara(lista, "/login").filter((regra) => regra.has !== undefined)
    expect(comQuery).toHaveLength(1)
    expect(comQuery[0]?.destination).toBe(`${DESTINO}?redirect=:destino`)
    expect(comQuery[0]?.permanent).toBe(false)
    expect(comQuery[0]?.has).toEqual([{ type: "query", key: "redirect", value: "(?<destino>.+)" }])
  })

  it("a regra com query vem antes da genérica, que descartaria a query", async () => {
    const lista = await regras()
    const indiceComQuery = lista.findIndex((regra) => regra.has !== undefined)
    const indiceGenerica = lista.findIndex(
      (regra) => regra.has === undefined && casa(regra.source, "/login"),
    )
    expect(indiceComQuery).toBeGreaterThanOrEqual(0)
    expect(indiceComQuery).toBeLessThan(indiceGenerica)
  })
})

describe("as rotas que continuam fora do redirect", () => {
  it("/consent e /auth/callback não casam com nenhuma regra", async () => {
    const lista = await regras()
    expect(regraPara(lista, "/consent")).toEqual([])
    expect(regraPara(lista, "/auth/callback")).toEqual([])
    expect(regraPara(lista, "/auth/callback?next=/app/entrar")).toEqual([])
  })

  // Falha de link de e-mail e de OAuth: o callback manda para estas duas telas
  // (redirect-plan.ts). Redirecioná-las jogaria a pessoa na entrada crua, sem a
  // mensagem de expirado nem o botão de reenvio.
  it("/auth/confirmar-email e /auth/callback-error seguem com tela própria, sem redirect", async () => {
    const lista = await regras()
    expect(regraPara(lista, "/auth/confirmar-email")).toEqual([])
    expect(regraPara(lista, "/auth/confirmar-email?estado=expirado")).toEqual([])
    expect(regraPara(lista, "/auth/callback-error")).toEqual([])
  })

  it("rotas públicas que não são entrada antiga seguem sem redirect", async () => {
    const lista = await regras()
    for (const caminho of ["/conta-apagada", "/convite", "/ajuda", "/privacidade"]) {
      expect(regraPara(lista, caminho), caminho).toEqual([])
    }
  })

  it("o casamento é exato: nomes parecidos não são arrastados pelo redirect", async () => {
    const lista = await regras()
    expect(regraPara(lista, "/loginx")).toEqual([])
    expect(regraPara(lista, "/onboardingx")).toEqual([])
    expect(regraPara(lista, "/auth/confirmar-email-antigo")).toEqual([])
  })
})
