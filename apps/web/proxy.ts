import { CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { cspDasPaginas } from "./lib/security/csp"
import { isPublicPath } from "./lib/security/route-surface"

// A superfície pública mora em `lib/security/route-surface.ts` — uma lista, três
// modos (`exata`, `pasta`, `ativos`) e comparação por fronteira. Este arquivo não
// decide mais quem é público por prefixo solto; só consulta e roteia.
const CONSENT_COOKIE = "bivaque-consent-version"

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

// Atalho de desenvolvimento: `BIVAQUE_AUTH_BYPASS=true` em apps/web/.env.local
// (gitignored) desliga o portão para desenvolver/QA. Só vale com
// NODE_ENV=development. Em test/production — ou em qualquer ambiente em que a
// variável apareça ligada sem ser desenvolvimento — a resposta é 503 com log,
// nunca `NextResponse.next()`: uma configuração que abriria o portão não pode
// ser ignorada em silêncio. ADR-20261110-superficie-publica-do-proxy.
const AUTH_BYPASS = process.env["BIVAQUE_AUTH_BYPASS"] === "true"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (/^\/(?:app|api)(?:\/|$)/.test(pathname)) {
    return encaminhar(request, new Headers(request.headers))
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = cspDasPaginas(nonce)
  const headers = new Headers(request.headers)
  headers.set("x-nonce", nonce)
  headers.set("Content-Security-Policy", csp)
  const response = await encaminhar(request, headers)
  response.headers.set("Content-Security-Policy", csp)
  return response
}

async function encaminhar(request: NextRequest, headers: Headers) {
  const { pathname } = request.nextUrl

  if (AUTH_BYPASS) {
    if (process.env["NODE_ENV"] !== "development") {
      console.error("[proxy] BIVAQUE_AUTH_BYPASS=true fora de development: portão fechado (503).")
      return new NextResponse("O bypass de autenticação só existe em development.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    }
    return NextResponse.next({ request: { headers } })
  }

  // Public paths bypass all checks — no session round-trip needed.
  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: { headers } })
  }

  // Build a Supabase server client wired to the request cookies so
  // getUser() can read the session token the browser sent. Any
  // Set-Cookie headers emitted by Supabase (token refresh, etc.) are
  // forwarded onto the response.
  const supabaseResponse = NextResponse.next({ request: { headers } })

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set")
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 400,
      path: "/",
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
    },
  })

  // Verify the session. An AuthError (expired / tampered / missing token)
  // is treated as unauthenticated — user stays null and the redirect logic
  // below handles it.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // no-op — user remains null
  }

  // Root redirect — session-aware. The marketing landing lives at "/" and
  // stays public for acquisition; authenticated visitors continue into the app.
  if (pathname === "/" || pathname === "") {
    if (user) {
      const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === String(CONSENT_VERSION)
      return NextResponse.redirect(new URL(hasConsent ? "/app/inicio" : "/app/entrar", request.url))
    }
    return supabaseResponse
  }

  // Protected paths: session gate.

  // O portão de consentimento saiu daqui em 2026-09-07
  // (ADR-20260907-consentimento-no-cadastro). O aceite passou a ser uma linha do
  // formulário de cadastro, gravada no servidor na criação da conta. Um portão
  // que reaparece a cada cookie limpo, expirado ou de versão antiga era o
  // defeito do RUN-001, e nenhuma das plataformas que este público usa
  // interrompe quem já aceitou.

  if (!user) {
    const entryUrl = new URL("/app/entrar", request.url)
    entryUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(entryUrl)
  }

  // Onda G — Task 1: a conta de prestador civil existe e precisa de
  // roteamento próprio, senão o middleware empurra o prestador para o
  // funil de admissão de membro (que pede CPF). D37: prestador é
  // usuário do Auth com papel e SEM membership — daí a leitura única
  // "qual é o tipo da minha conta" via my_account_kind() (uma ida só ao
  // banco, em vez de duas).
  const { data: kindRows, error: kindError } = await supabase.rpc("my_account_kind")
  if (kindError) {
    return NextResponse.redirect(new URL("/app/entrar", request.url))
  }
  // `my_account_kind()` devolve um ESCALAR (`returns text`), e o PostgREST
  // responde com o valor cru — a string "member", nao uma lista de linhas.
  // Ler como `kindRows?.[0]?.my_account_kind` faz `[0]` indexar a string ("m")
  // e a propriedade sair `undefined`: `kind` virava SEMPRE null, e todo membro
  // autenticado — com localidade, vila e perfil — caia no ramo do estado
  // desconhecido e era despejado em /onboarding/locality. O produto inteiro
  // ficava atras do formulario de cadastro.
  //
  // Nao ha tipo nem lint que pegue isso: o formato e decidido pelo PostgREST em
  // runtime. Foi a auditoria visual que revelou, ao capturar a MESMA tela de
  // onboarding em 21 rotas distintas.
  const kind = (kindRows ?? null) as "member" | "provider" | null

  if (kind === "provider") {
    return NextResponse.redirect(new URL("/app/meu-negocio", request.url))
  }

  if (kind === null) {
    // TROCA-005: o roteamento por estado de verificação (nunca verificou →
    // /onboarding, pending/rejected → /onboarding/status, verified sem vínculo →
    // /onboarding/locality) saiu daqui com as telas do funil. Quem não é membro
    // nem prestador vai para a entrada do app, que lê `/api/app/entry/verification`
    // e `/api/app/entry/progress` e decide o passo. Não reintroduza um segundo
    // roteador de funil neste arquivo: os dois divergem.
    return NextResponse.redirect(new URL("/app/entrar", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/health).*)"],
}
