import { Button, Checkbox } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../../../../lib/supabase/server"
import {
  approveCommunityMemberAction,
  approveCommunityMembersBatchAction,
  removeCommunityMemberAction,
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
//   - Step 2: o limit(30) original — virou limit(50) — sai. A vila que chega
//     inteira tem centenas de pedidos; paginação com total count visível é
//     trabalho de UI desta task. Aqui o cap sobe para 500 e o total real é
//     exibido no cabeçalho; paginação numérica fica como follow-up.
//   - Step 4: a fila mostra só nome + data do pedido. SEM afiliação (força,
//     OM, posto, turma) — o ADR-20260811-om-declarada segue "proposed" e a
//     proibição é o contrato. Se alguém ler §5.2 daqui a três meses e achar
//     que falta implementar afiliação, este comentário é a primeira coisa
//     que deve aparecer.
//
// Onda T Task 5: list_community_pending_arrivals (20260820051230) substitui
// a leitura direta de community_memberships + profiles por uma RPC que já
// junta o sinal de transferência declarada — "chegando de <cidade> em
// <data>" quando o requerente tem uma linha kind='leaving'. Continua sendo
// SÓ nome, datas e a cidade de origem: nada de força/OM/posto/turma, e o
// pgTAP em supabase/tests/declared-arrivals.sql prova isso lendo a própria
// assinatura da função.

const QUEUE_FETCH_LIMIT = 500

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
  for (const row of pending) {
    memberNames.set(row.user_id, row.display_name ?? "Membro")
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Pedidos de entrada</h1>
        <p className="mt-1 text-sm text-muted">
          Aprovar ou recusar candidatos antes que entrem no feed da comunidade.
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
        <>
          {/* Ações de lote — uma única <form> envolve toda a fila. Cada linha
              contribui com um input hidden "userIds"; o server action itera
              item a item, sem afrouxar authz (a checagem é da RPC, não da
              ação). */}
          <form
            action={approveCommunityMembersBatchAction}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="communityId" value={communityId} />
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
          </form>

          <ul className="space-y-2">
            {pending.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    name="userIds"
                    value={member.user_id}
                    aria-label={`Selecionar ${memberNames.get(member.user_id) ?? "membro"}`}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                  <div>
                    <div>{memberNames.get(member.user_id) ?? "Membro"}</div>
                    <div className="text-xs text-muted">
                      Pedido em {new Date(member.requested_at).toLocaleDateString("pt-BR")}
                    </div>
                    {member.arriving_from_locality_name && member.arriving_at && (
                      <div className="text-xs text-[var(--accent)]">
                        Transferência declarada de {member.arriving_from_locality_name} — chegando
                        em {new Date(`${member.arriving_at}T00:00:00`).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveCommunityMemberAction}>
                    <input type="hidden" name="communityId" value={communityId} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <Button type="submit" size="sm" variant="primary">
                      Aprovar
                    </Button>
                  </form>
                  <form action={removeCommunityMemberAction}>
                    <input type="hidden" name="communityId" value={communityId} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <Button type="submit" size="sm" variant="tertiary">
                      Recusar
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
