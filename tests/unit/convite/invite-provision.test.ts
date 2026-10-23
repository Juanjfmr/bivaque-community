import { describe, expect, it } from "vitest"
import { acceptFamilyInviteCode, previewFamilyInviteCode } from "web/lib/convite/provision"

// PORT-006 (lote 4 da entrada) — o comportamento do lado servidor do convite,
// com o cliente Supabase simulado. A revisão independente apontou que provar a
// ordem por posição de texto no arquivo não prova nada: o que precisa ser
// provado é a sequência de chamadas ao banco e o que acontece em cada falha.
//
// A ordem do aceite é o contrato do provisionamento:
//   family_invite_code_accept → family_accept_holder_locality →
//   (membership corrente?) → provision_member_locality → profiles.upsert
//
// E a conclusão é retomável: quando a localidade ou o provisionamento falha, a
// nova tentativa recebe o MESMO vínculo do banco (`ok`) e conclui o que faltou,
// sem mover quem já tem localidade corrente.

type RpcReply = { data: unknown; error: { message: string; code?: string } | null }

const CODE_HASH = "a".repeat(64)
const ORIGIN_DIGEST = "b".repeat(64)
const LINK_ID = "40000000-0000-4000-8000-000000000001"
const LOCALITY_ID = "20000000-0000-4000-8000-000000000010"
const USER_ID = "10000000-0000-4000-8000-000000000002"

function fakeClient(options: {
  membership?: string[]
  onRpc?: (name: string) => RpcReply | undefined
}) {
  const calls: string[] = []
  const rpcArgs: Record<string, Record<string, unknown>> = {}

  const replies: Record<string, RpcReply> = {
    family_invite_code_accept: {
      data: [{ status: "ok", link_id: LINK_ID }],
      error: null,
    },
    family_accept_holder_locality: { data: LOCALITY_ID, error: null },
    provision_member_locality: { data: null, error: null },
    record_consent_acceptance: { data: null, error: null },
  }

  const client = {
    calls,
    rpcArgs,
    async rpc(name: string, args: Record<string, unknown> = {}) {
      calls.push(`rpc:${name}`)
      rpcArgs[name] = args
      const override = options.onRpc?.(name)
      if (override) return override
      return replies[name] ?? { data: null, error: { message: `unexpected rpc ${name}` } }
    },
    from(table: string) {
      const builder = {
        select() {
          calls.push(`select:${table}`)
          return builder
        },
        eq() {
          return builder
        },
        limit() {
          return Promise.resolve({
            data: (options.membership ?? []).map((localityId) => ({ locality_id: localityId })),
            error: null,
          })
        },
        async upsert() {
          calls.push(`upsert:${table}`)
          return { data: null, error: null }
        },
      }
      return builder
    },
  }

  return client
}

const ACCEPT_INPUT = {
  codeHash: CODE_HASH,
  displayName: "Maria da Silva",
  originDigest: ORIGIN_DIGEST,
  userId: USER_ID,
} as const

describe("preview do convite por código", () => {
  it("devolve só o que a tela mostra quando o banco aprova, com os digests embrulhados", async () => {
    const client = fakeClient({
      onRpc: (name) =>
        name === "family_invite_code_preview"
          ? {
              data: [
                {
                  status: "ok",
                  inviter_name: "Member One",
                  invitee_email_hint: "me***@ex***.invalid",
                  expires_at: "2026-10-30T12:00:00+00:00",
                },
              ],
              error: null,
            }
          : undefined,
    })

    const result = await previewFamilyInviteCode(client as never, {
      codeHash: CODE_HASH,
      emailDigest: "c".repeat(64),
      originDigest: ORIGIN_DIGEST,
    })

    expect(result).toEqual({
      status: "ok",
      expiresAt: "2026-10-30T12:00:00+00:00",
      inviteeEmailHint: "me***@ex***.invalid",
      inviterName: "Member One",
    })
    expect(client.calls).toEqual(["rpc:family_invite_code_preview"])
    expect(client.rpcArgs["family_invite_code_preview"]).toEqual({
      p_code_hash: `\\x${CODE_HASH}`,
      p_origin_digest: `\\x${ORIGIN_DIGEST}`,
      p_email_digest: `\\x${"c".repeat(64)}`,
    })
  })

  it("sem e-mail, não manda p_email_digest e devolve o status que o banco deu", async () => {
    const client = fakeClient({
      onRpc: () => ({ data: [{ status: "rate_limited" }], error: null }),
    })

    const result = await previewFamilyInviteCode(client as never, {
      codeHash: CODE_HASH,
      originDigest: ORIGIN_DIGEST,
    })

    expect(result).toEqual({ status: "rate_limited" })
    expect(client.rpcArgs["family_invite_code_preview"]).not.toHaveProperty("p_email_digest")
  })

  it("resposta sem linha é falha de infraestrutura, não convite válido vazio", async () => {
    const client = fakeClient({ onRpc: () => ({ data: [], error: null }) })

    await expect(
      previewFamilyInviteCode(client as never, {
        codeHash: CODE_HASH,
        originDigest: ORIGIN_DIGEST,
      }),
    ).rejects.toThrow("family invite preview returned no row")
  })
})

describe("aceite do convite por código", () => {
  it("vínculo, localidade do titular, membership e perfil — nesta ordem", async () => {
    const client = fakeClient({})

    const result = await acceptFamilyInviteCode(client as never, ACCEPT_INPUT)

    expect(result).toEqual({ status: "ok", linkId: LINK_ID, localityMember: true })
    expect(client.calls).toEqual([
      "rpc:family_invite_code_accept",
      "rpc:family_accept_holder_locality",
      "select:locality_memberships",
      "rpc:provision_member_locality",
      "upsert:profiles",
    ])
    // A localidade é resolvida pelo vínculo, nunca pelo formulário.
    expect(client.rpcArgs["family_accept_holder_locality"]).toEqual({ p_link_id: LINK_ID })
    expect(client.rpcArgs["provision_member_locality"]).toEqual({
      p_user_id: USER_ID,
      p_locality_id: LOCALITY_ID,
    })
  })

  it("código recusado para antes de qualquer provisionamento", async () => {
    const client = fakeClient({
      onRpc: () => ({ data: [{ status: "unavailable", link_id: null }], error: null }),
    })

    const result = await acceptFamilyInviteCode(client as never, ACCEPT_INPUT)

    expect(result).toEqual({ status: "unavailable" })
    expect(client.calls).toEqual(["rpc:family_invite_code_accept"])
  })

  it("limite devolve rate_limited e não provisiona", async () => {
    const client = fakeClient({
      onRpc: () => ({ data: [{ status: "rate_limited", link_id: null }], error: null }),
    })

    const result = await acceptFamilyInviteCode(client as never, ACCEPT_INPUT)

    expect(result).toEqual({ status: "rate_limited" })
    expect(client.calls).toEqual(["rpc:family_invite_code_accept"])
  })

  it("erro do banco no aceite é exceção, com o código preservado", async () => {
    const client = fakeClient({
      onRpc: () => ({ data: null, error: { message: "boom", code: "XX000" } }),
    })

    await expect(acceptFamilyInviteCode(client as never, ACCEPT_INPUT)).rejects.toMatchObject({
      code: "XX000",
    })
  })

  it("falha na localidade do titular não grava nada e a nova tentativa conclui", async () => {
    // Reprodução do P2 da revisão: o convite fica `accepted` (o vínculo existe
    // no banco), a consulta da localidade falha e a pessoa fica sem acesso.
    // Aqui o banco simulado responde `ok` com o MESMO vínculo na segunda
    // tentativa — é a retomada de 20261023120000.
    let localityCalls = 0
    const client = fakeClient({
      onRpc: (name) => {
        if (name !== "family_accept_holder_locality") return undefined
        localityCalls += 1
        return localityCalls === 1
          ? { data: null, error: { message: "connection reset" } }
          : { data: LOCALITY_ID, error: null }
      },
    })

    await expect(acceptFamilyInviteCode(client as never, ACCEPT_INPUT)).rejects.toThrow(
      "Failed to resolve the holder locality",
    )
    expect(client.calls).toEqual([
      "rpc:family_invite_code_accept",
      "rpc:family_accept_holder_locality",
    ])

    const retry = await acceptFamilyInviteCode(client as never, ACCEPT_INPUT)

    expect(retry).toEqual({ status: "ok", linkId: LINK_ID, localityMember: true })
    // A retomada reapresenta o mesmo código e recebe o mesmo vínculo: não
    // consome outro código nem grava tentativa (o banco devolve `ok`).
    expect(client.calls).toEqual([
      "rpc:family_invite_code_accept",
      "rpc:family_accept_holder_locality",
      "rpc:family_invite_code_accept",
      "rpc:family_accept_holder_locality",
      "select:locality_memberships",
      "rpc:provision_member_locality",
      "upsert:profiles",
    ])
    expect(client.rpcArgs["family_invite_code_accept"]).toEqual({
      p_accepted_by_user_id: USER_ID,
      p_code_hash: `\\x${CODE_HASH}`,
      p_origin_digest: `\\x${ORIGIN_DIGEST}`,
    })
  })

  it("na retomada, quem já tem localidade corrente não é movido de volta", async () => {
    // `provision_member_locality` fecha a corrente e insere a nova; repetir o
    // caminho numa retomada moveria a pessoa (e, na mesma localidade, a
    // deixaria sem corrente). O perfil, esse sim, é garantido.
    const client = fakeClient({ membership: [LOCALITY_ID] })

    const result = await acceptFamilyInviteCode(client as never, ACCEPT_INPUT)

    expect(result).toEqual({ status: "ok", linkId: LINK_ID, localityMember: true })
    expect(client.calls).toEqual([
      "rpc:family_invite_code_accept",
      "rpc:family_accept_holder_locality",
      "select:locality_memberships",
      "upsert:profiles",
    ])
    expect(client.calls).not.toContain("rpc:provision_member_locality")
  })
})
