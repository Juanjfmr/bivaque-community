import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import type { Database } from "supabase/database.generated"
import { Card } from "../../../components/bivaque/card"
import { ProviderInvitationAcceptance } from "./acceptance"

// Prancha 79, painel 2: a tela do convite nomeia a comunidade que indicou e
// oferece o caminho de volta para ela. Quem lê é o próprio token do convite —
// `read_provider_invitation` é executável por `anon` porque quem abre o link
// ainda não tem conta, e devolve só o nome/id da comunidade e o status.
const STATUS_COPY: Record<string, string> = {
  accepted: "Este convite já foi aceito. Entre com a conta de prestador para continuar.",
  revoked: "Este convite foi revogado pela comunidade que indicou você.",
  expired: "Este convite expirou. Peça um novo à comunidade que indicou você.",
}

export default async function ProviderInvitationAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Falha de backend NÃO é convite inexistente: se a leitura quebrar, a tela
  // precisa dizer que não foi possível verificar (e o erro sobe para a
  // fronteira da rota). Antes, qualquer erro da RPC caía no mesmo texto de token
  // desconhecido — o defeito que o revisor independente mediu.
  const { data, error: readError } = await supabase.rpc("read_provider_invitation", {
    p_token: token,
  })
  if (readError) {
    throw new Error(`Falha ao ler o convite de prestador: ${readError.message}`)
  }
  const invitation = Array.isArray(data) ? data[0] : undefined
  const open = invitation !== undefined && invitation.status === "pending"

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full space-y-5 p-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-accent-strong">Convite de prestador</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ofereça seus serviços no Bivaque
          </h1>
          <p className="text-sm text-muted">
            {invitation
              ? `${invitation.community_name} indicou você para atender a comunidade.`
              : "Uma comunidade indicou você. Sua conta será civil e separada dos membros: ela não dá acesso a feed, perfis, grupos, eventos ou listas da comunidade."}
          </p>
        </header>

        {invitation === undefined ? (
          // Sem linha: token malformado, desconhecido ou de comunidade apagada.
          // A leitura não distingue os casos de propósito (não vira oráculo de
          // existência), então a tela também não distingue.
          <p className="text-sm text-muted">
            Não encontramos este convite. Confira o link recebido ou peça um novo à comunidade.
          </p>
        ) : open ? (
          <ProviderInvitationAcceptance token={token} authenticatedEmail={user?.email ?? null} />
        ) : (
          <p className="text-sm text-muted">
            {STATUS_COPY[invitation.status] ??
              "Este convite não está mais disponível. Peça um novo à comunidade."}
          </p>
        )}

        {invitation ? (
          <Link
            href={`/communities/${invitation.community_id}` as Route}
            className="inline-flex min-h-11 w-fit items-center rounded-md text-sm text-accent underline-offset-4 transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
          >
            Voltar para a comunidade
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-11 w-fit items-center rounded-md text-sm text-accent underline-offset-4 transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
          >
            Voltar para o login
          </Link>
        )}
      </Card>
    </main>
  )
}
