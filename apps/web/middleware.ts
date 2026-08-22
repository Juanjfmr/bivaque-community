import { CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/consent",
  "/api",
  "/_next",
  "/favicon.ico",
  "/icon.svg",
]
const CONSENT_COOKIE = "bivaque-consent-version"

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

// Test-only escape hatch: set BIVAQUE_AUTH_BYPASS=true in apps/web/.env.local
// (gitignored) to disable the auth/consent gate while developing/QA'ing.
// It is never set in CI or production, so the gate stays enforced there.
const AUTH_BYPASS = process.env["BIVAQUE_AUTH_BYPASS"] === "true"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Test-only: skip every gate when the bypass env var is enabled.
  if (AUTH_BYPASS) {
    return NextResponse.next()
  }

  // Public paths bypass all checks — no session round-trip needed.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Build a Supabase server client wired to the request cookies so
  // getUser() can read the session token the browser sent. Any
  // Set-Cookie headers emitted by Supabase (token refresh, etc.) are
  // forwarded onto the response.
  const supabaseResponse = NextResponse.next({ request })

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

  // Root redirect — session-aware (new behaviour).
  if (pathname === "/" || pathname === "") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === String(CONSENT_VERSION)
    return NextResponse.redirect(new URL(hasConsent ? "/community" : "/consent", request.url))
  }

  // Protected paths: consent gate first (unchanged from original), then
  // the session gate (new).
  const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === String(CONSENT_VERSION)
  if (!hasConsent) {
    const consentUrl = new URL("/consent", request.url)
    consentUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(consentUrl)
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Onboarding keeps its own screen and is not part of the verified shell.
  // /onboarding/locality is the post-eligibility step (P0 Task 5): an
  // eligible-but-not-yet-provisioned member lands there, not on the feed.
  if (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/status") ||
    pathname.startsWith("/onboarding/locality")
  ) {
    return supabaseResponse
  }

  // Onda G — Task 1: a conta de prestador civil existe e precisa de
  // roteamento próprio, senão o middleware empurra o prestador para o
  // funil de admissão de membro (que pede CPF). D37: prestador é
  // usuário do Auth com papel e SEM membership — daí a leitura única
  // "qual é o tipo da minha conta" via my_account_kind() (uma ida só ao
  // banco, em vez de duas).
  const { data: kindRows, error: kindError } = await supabase.rpc("my_account_kind")
  if (kindError) {
    // Não dá para rotear com segurança. Falha fechado em /onboarding é
    // a mesma decisão que o bloco abaixo toma quando o estado é
    // desconhecido: a tela determinística é melhor do que uma meia
    // decisão.
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }
  const kind = (kindRows?.[0]?.my_account_kind ?? null) as "member" | "provider" | null

  if (kind === "provider") {
    // O prestador vive fora do shell do membro (D36; ADR de shells e
    // navegação). Deixa-o passar em /prestador e manda-o de volta para
    // lá em qualquer outra rota — sem membership, toda policy de
    // conteúdo nega; o redirect evita a tela vazia.
    return pathname.startsWith("/prestador")
      ? supabaseResponse
      : NextResponse.redirect(new URL("/prestador", request.url))
  }

  if (kind === null) {
    // D2 Task 1 — a porta agora lê o estado real de verificação, não só
    // a linha de membership. O comportamento anterior era: pending,
    // temporary_error e rejected pareciam o mesmo que "nunca
    // verificou" porque o redirect era o mesmo, e a pessoa gastava uma
    // tentativa de verificação para descobrir isso. O novo caminho
    // roteia cada estado para a tela dele:
    //   - nunca verificou       -> /onboarding
    //   - pending, rejected, temporary_error -> /onboarding/status
    //   - verified, sem membership -> /onboarding/locality
    //     (P0 Task 4 two-phase admission step; verified é o gap entre
    //      elegibilidade e provisionamento)
    //
    // O cookie que consent/page.tsx escreve é atalho de navegação, não
    // a autoridade — /api/onboarding reconfirma com has_accepted_consent.
    // O status de verificação é lido via RPC SECURITY DEFINER que escopa
    // por auth.uid() server-side (sem parâmetro p_user_id para errar).
    // Uma ida extra ao banco só quando falta membership.
    const { data: statusRows, error: statusError } = await supabase.rpc("my_verification_status")
    if (statusError) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
    const status = (statusRows?.[0]?.status ?? null) as string | null
    if (status === "verified") {
      return NextResponse.redirect(new URL("/onboarding/locality", request.url))
    }
    if (status === "pending" || status === "temporary_error" || status === "rejected") {
      return NextResponse.redirect(new URL("/onboarding/status", request.url))
    }
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/health).*)"],
}
