import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import { approveJoinRequestAction, rejectJoinRequestAction } from "./join-request-actions"

// COM-005 (B2 do lote 5): a fila de pedidos do grupo, para quem aprova.
//
// É um componente de servidor autocontido: faz as próprias leituras pelo
// cliente autenticado, então a RLS decide o que chega. O motivo só aparece para
// o dono e o moderador (policy própria); para qualquer outro, a lista de
// motivos volta vazia e a seção não é renderizada. Por isso `page.tsx` só
// precisa importar e renderizar, sem passar estado de moderação.
//
// A checagem de quem modera inclui o papel `owner` da participação, e não
// apenas `owner_user_id`: são a mesma pessoa, mas a coluna pode divergir da
// linha de participação num grupo antigo, e quem aprova no banco é
// `private.is_group_moderator` (dono ou moderador).

type MembershipSummary = {
  user_id: string
  role: Database["public"]["Enums"]["group_membership_role"]
  status: Database["public"]["Enums"]["group_membership_status"]
}

export async function GroupJoinRequests({ groupId }: { groupId: string }) {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) return null

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
  if (!user) return null

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_user_id")
    .eq("id", groupId)
    .maybeSingle()
  if (groupError || !group) return null

  const { data: mine, error: mineError } = await supabase
    .from("group_memberships")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (mineError) return null

  const canModerate =
    group.owner_user_id === user.id || mine?.role === "moderator" || mine?.role === "owner"
  if (!canModerate) return null

  const { data: pending, error: pendingError } = await supabase
    .from("group_memberships")
    .select("user_id, role, status")
    .eq("group_id", groupId)
    .eq("status", "pending")
  if (pendingError) return null
  const requests = (pending as MembershipSummary[] | null) ?? []
  if (requests.length === 0) return null

  const ids = requests.map((request) => request.user_id)

  const { data: reasonData } = await supabase
    .from("group_join_reasons")
    .select("user_id, reason")
    .eq("group_id", groupId)
    .in("user_id", ids)
  const reasonByUser = new Map(
    ((reasonData as { user_id: string; reason: string }[] | null) ?? []).map((row) => [
      row.user_id,
      row.reason,
    ]),
  )

  // Sem FK entre group_memberships e profiles (profiles tem chave composta):
  // os nomes vêm numa segunda leitura, igualmente governada pela RLS. Quem não
  // é visível aparece como "Membro", nunca como vazamento.
  const { data: nameData } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", ids)
  const nameByUser = new Map(
    ((nameData as { user_id: string; display_name: string }[] | null) ?? []).map((row) => [
      row.user_id,
      row.display_name,
    ]),
  )

  return (
    <section aria-labelledby="join-requests-heading" className="flex flex-col gap-2">
      <h2 id="join-requests-heading" className="text-sm font-semibold tracking-tight">
        Pedidos de entrada
      </h2>
      <ul className="space-y-2">
        {requests.map((request) => {
          const reason = reasonByUser.get(request.user_id)
          return (
            <li
              key={request.user_id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{nameByUser.get(request.user_id) ?? "Membro"}</p>
                {reason ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted">
                    <span className="text-xs font-medium tracking-wide uppercase">Motivo: </span>
                    {reason}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted italic">Sem motivo.</p>
                )}
              </div>
              <div className="flex gap-2">
                <form action={approveJoinRequestAction}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="targetUserId" value={request.user_id} />
                  <Button type="submit" size="sm" variant="primary">
                    Aprovar
                  </Button>
                </form>
                <form action={rejectJoinRequestAction}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="targetUserId" value={request.user_id} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Recusar
                  </Button>
                </form>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
