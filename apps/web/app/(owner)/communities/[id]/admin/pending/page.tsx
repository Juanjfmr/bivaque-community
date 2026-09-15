import { Button, Checkbox } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../../../../lib/supabase/server"
import {
  approveCommunityMemberByIdAction,
  approveCommunityMembersBatchAction,
  removeCommunityMemberByIdAction,
  removeCommunityMembersBatchAction,
} from "../../../actions"

type ArrivalRow = {
  user_id: string
  display_name: string | null
  requested_at: string
  arriving_from_locality_name: string | null
  arriving_at: string | null
}

// Onda E Task 5:
//   - Step 1: checkboxes por linha + "selecionar todos" + duas ações de lote.
//   - Step 2: o limit(30) original — virou limit(50) — sai. Aqui o cap sobe
//     para 500 e o total real é exibido no cabeçalho; paginação numérica fica
//     como follow-up.
//   - Step 4: a fila mostra só nome + data do pedido. SEM afiliação (força,
//     OM, posto, turma) — o ADR-20260811-om-declarada segue "proposed" e a
//     proibição é o contrato.
//
// RECON-049 (par 73, prancha 43): "Ver pedido" abre o detalhe na própria fila
// — nome, "Pediu há N dias", o motivo opcional (community_join_reasons, lido
// só por autor e moderador/dono) e as ações "Aprovar entrada"/"Recusar". O
// rail "Sobre a comunidade" mostra o que a moderação real pode ler: nome,
// cidade, criada em e contagem de membros — sem vagas (não há coluna de
// limite no schema; a prancha desenha exemplo) e sem afiliação.

const QUEUE_FETCH_LIMIT = 500

function requestedRelative(requestedAt: string): string {
  const days = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 86_400_000)
  if (days <= 0) return "Pediu hoje"
  return days === 1 ? "Pediu há 1 dia" : `Pediu há ${days} dias`
}

function formatCreatedAt(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function CommunityPendingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: communityId } = await params

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
      setAll() {
        // Server component, no writes.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return null
  }

  const serviceClient = createServiceClient()

  // Total real da fila, sem cap. O cap só vale para a lista renderizada.
  const { count: totalPending, error: totalError } = await serviceClient
    .from("community_memberships")
    .select("*", { count: "exact", head: true })
    .eq("community_id", communityId)
    .eq("status", "pending")

  if (totalError) {
    throw new Error(`Falha ao contar a fila: ${totalError.message}`)
  }

  const { data: arrivalsData, error: pendingError } = await serviceClient.rpc(
    "list_community_pending_arrivals",
    { p_community_id: communityId, p_user_id: user.id, p_limit: QUEUE_FETCH_LIMIT },
  )

  if (pendingError) {
    throw new Error(`Falha ao ler a fila de aprovação: ${pendingError.message}`)
  }

  const pending = (arrivalsData as ArrivalRow[] | null) ?? []
  const memberNames = new Map<string, string>()
  const pendingIds: string[] = []
  for (const row of pending) {
    memberNames.set(row.user_id, row.display_name ?? "Membro")
    pendingIds.push(row.user_id)
  }

  // Motivo opcional do pedido — só autor e quem modera podem ler (policy
  // própria); o dono da página sempre pode. Sem linha, o pedido não tem motivo.
  const reasonByUser = new Map<string, string>()
  if (pendingIds.length > 0) {
    const { data: reasons, error: reasonsError } = await serviceClient
      .from("community_join_reasons")
      .select("user_id, reason")
      .eq("community_id", communityId)
      .in("user_id", pendingIds)
    if (!reasonsError) {
      for (const row of (reasons as { user_id: string; reason: string }[] | null) ?? []) {
        reasonByUser.set(row.user_id, row.reason)
      }
    }
  }

  // Rail "Sobre a comunidade": o que a moderação pode ler com lastro.
  const [{ data: community }, { count: memberCount }] = await Promise.all([
    serviceClient
      .from("communities")
      .select("name, locality_id, created_at")
      .eq("id", communityId)
      .maybeSingle(),
    serviceClient
      .from("community_memberships")
      .select("*", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "approved"),
  ])
  const communityRow = community as {
    name: string
    locality_id: string
    created_at: string
  } | null
  let localityName: string | null = null
  if (communityRow) {
    const { data: locality } = await serviceClient
      .from("localities")
      .select("name")
      .eq("id", communityRow.locality_id)
      .maybeSingle()
    localityName = (locality as { name: string } | null)?.name ?? null
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Pedidos de entrada</h1>
        <p className="mt-1 text-sm text-muted">
          {totalPending !== null
            ? `${totalPending} ${totalPending === 1 ? "pedido aguardando" : "pedidos aguardando"}.`
            : "Aprovar ou recusar candidatos antes que entrem no feed da comunidade."}
          {totalPending !== null && totalPending > pending.length ? (
            <>
              {" "}
              Mostrando os primeiros {pending.length} de <strong>{totalPending}</strong> pedidos.
            </>
          ) : null}
        </p>
      </header>

      {pending.length === 0 ? (
        <p className="text-sm text-muted">Nenhum pedido pendente.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <form action={approveCommunityMembersBatchAction} className="space-y-4">
            <input type="hidden" name="communityId" value={communityId} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" variant="primary">
                Aprovar selecionados
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="tertiary"
                formAction={removeCommunityMembersBatchAction}
              >
                Recusar selecionados
              </Button>
            </div>

            <ul className="space-y-2">
              {pending.map((member) => {
                const reason = reasonByUser.get(member.user_id)
                return (
                  <details
                    key={member.user_id}
                    className="group rounded-md border border-border p-3 text-sm open:bg-[var(--semantic-surface-sunken)]"
                  >
                    <summary className="flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          name="userIds"
                          value={member.user_id}
                          aria-label={`Selecionar ${memberNames.get(member.user_id) ?? "membro"}`}
                          className="[&_input]:transition-colors"
                        >
                          <Checkbox.Content className="min-h-11 min-w-11 items-center justify-center">
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                        <div className="min-w-0">
                          <div>{memberNames.get(member.user_id) ?? "Membro"}</div>
                          <div className="text-xs text-muted">
                            {requestedRelative(member.requested_at)}
                          </div>
                          {member.arriving_from_locality_name && member.arriving_at && (
                            <div className="text-xs text-[var(--accent)]">
                              Transferência declarada de {member.arriving_from_locality_name} —
                              chegando em{" "}
                              {new Date(`${member.arriving_at}T00:00:00`).toLocaleDateString(
                                "pt-BR",
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="ml-auto shrink-0 select-none text-xs font-medium text-accent group-open:hidden">
                        Ver pedido
                      </span>
                      <span className="ml-auto shrink-0 select-none text-xs font-medium text-muted hidden group-open:inline">
                        Recolher
                      </span>
                    </summary>
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Motivo do pedido
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed">
                          {reason ?? "Sem motivo informado."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          formAction={approveCommunityMemberByIdAction.bind(null, member.user_id)}
                        >
                          Aprovar entrada
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          variant="tertiary"
                          formAction={removeCommunityMemberByIdAction.bind(null, member.user_id)}
                        >
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </details>
                )
              })}
            </ul>
          </form>

          <aside aria-label="Sobre a comunidade" className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
              <h2 className="text-base font-semibold tracking-tight">Sobre a comunidade</h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                {communityRow ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Nome</dt>
                      <dd className="font-medium">{communityRow.name}</dd>
                    </div>
                    {localityName ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Local</dt>
                        <dd className="font-medium">{localityName}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Membros</dt>
                      <dd className="font-medium">{memberCount ?? 0}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Criada em</dt>
                      <dd className="font-medium">
                        {formatCreatedAt(communityRow.created_at) ?? "—"}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
