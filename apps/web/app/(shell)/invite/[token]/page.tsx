// Onda E Task 6, Step 3 — the accept page.
//
// Server Component: reads session, calls accept_community_invitation via the
// service client. Three outcomes:
//   1. not logged in → /app/entrar (a porta do app; nada de senha)
//   2. logged in but not verified → /app/entrar (a entrada do app decide a etapa)
//      (D15 gate; the verification is mandatory)
//
// O token do convite de comunidade NÃO é preservado nesse desvio: o app não tem
// rota para ele e o convite continua pendente. O card LAN-F01 registra o desvio
// (RUN-004 rodada 2); a tela antiga de senha deixou de ser destino.
//   3. verified → success: redirect to the community
//   4. expired / already-used / not-found → render the friendly error UI
//
// The D14 / D15 invariant is enforced by the RPC: the server component
// only redirects; it never inserts state outside the verified path.

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { callCommunityInviteRpc } from "../../../../lib/community-invite-rpcs"
import { byteaDigestParam } from "../../../../lib/invites-bytea"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

interface InviteAcceptPageProps {
  params: Promise<{ token: string }>
}

export default async function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  const { token } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    // Link de comunidade não carrega código de família; a pessoa entra pela
    // porta do app. O token não é preservado: o convite continua pendente e o
    // card registra o desvio.
    redirect("/app/entrar")
  }

  const supabase = createServiceClient()

  // D15 gate — before the RPC, so a non-existent token still preserves ?next=.
  const { data: userIsVerified } = await supabase.rpc("is_verified_holder", {
    p_user_id: user.id,
  })
  if (userIsVerified !== true) {
    redirect("/app/entrar")
  }

  // Compute the digest locally — the RPC receives the digest, not the raw
  // token. This keeps the token out of the database entirely.
  const { createHash } = await import("node:crypto")
  const tokenDigest = createHash("sha256").update(Buffer.from(token, "hex")).digest()

  const { data: communityId, error } = await callCommunityInviteRpc(
    supabase,
    "accept_community_invitation",
    {
      p_token_digest: byteaDigestParam(tokenDigest.toString("hex")),
      p_user_id: user.id,
    },
  )

  if (error) {
    if (error.message.includes("verification required")) {
      // D15 gate. The invite stays pending; the app entry is where the person
      // continues. NOTHING is created here without verification.
      redirect("/app/entrar")
    }
    return <InviteError message={friendlyError(error.message)} />
  }

  redirect(`/communities/${communityId}`)
}

function friendlyError(message: string): string {
  if (message.includes("not found")) {
    return "Este convite não foi encontrado. Verifique o link."
  }
  if (message.includes("already")) {
    return "Este convite já foi usado."
  }
  if (message.includes("expired")) {
    return "Este convite expirou. Peça um novo ao dono da vila."
  }
  return "Não foi possível aceitar o convite. Tente novamente."
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-8">
      <h1 className="text-lg font-semibold tracking-tight">Convite</h1>
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}
