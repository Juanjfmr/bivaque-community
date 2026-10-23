import { CONSENT_VERSION } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import { acceptFamilyInviteCode, previewFamilyInviteCode } from "web/lib/convite/provision"

// PORT-006 (lote 4 da entrada) — o comportamento do lado servidor do convite,
// com o cliente Supabase simulado.
//
// Terceira correção (22/10): o aceite passou a ser UMA chamada. Vínculo,
// localidade do titular, membership e perfil acontecem dentro de
// `private.family_invite_code_accept`, na mesma transação — nada de
// provisionamento em TypeScript. O contrato que este arquivo prova é, então:
//
//   * o aceite chama a RPC uma vez, com o nome e a versão do aceite;
//   * `ok` devolve o vínculo, e nada mais é chamado depois;
//   * falha de contrato (titular sem localidade corrente, por exemplo) é
//     exceção com o código preservado, nunca sucesso silencioso;
//   * status de recusa não provisiona nada.

type RpcReply = { data: unknown; error: { message: string; code?: string } | null }

const CODE_HASH = "a".repeat(64)
const ORIGIN_DIGEST = "b".repeat(64)
const LINK_ID = "40000000-0000-4000-8000-000000000001"
const USER_ID = "10000000-0000-4000-8000-000000000002"

function fakeClient(options: { onRpc?: (name: string) => RpcReply | undefined }) {
  const calls: string[] = []
  const rpcArgs: Record<string, Record<string, unknown>> = {}

  const replies: Record<string, RpcReply> = {
    family_invite_code_accept: {
      data: [{ status: "ok", link_id: LINK_ID }],
      error: null,
    },
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
  it("é uma chamada só: o banco faz vínculo, localidade, membership e perfil", async () => {
    const client = fakeClient({})

    const result = await acceptFamilyInviteCode(client as never, ACCEPT_INPUT)

    expect(result).toEqual({ status: "ok", linkId: LINK_ID, localityMember: true })
    // Nada de `family_accept_holder_locality`, `provision_member_locality` ou
    // upsert de perfil aqui: eram exatamente as chamadas que deixavam a pessoa
    // com convite consumido e sem acesso quando a segunda falhava.
    expect(client.calls).toEqual(["rpc:family_invite_code_accept"])
    expect(client.rpcArgs["family_invite_code_accept"]).toEqual({
      p_accepted_by_user_id: USER_ID,
      p_code_hash: `\\x${CODE_HASH}`,
      p_consent_version: CONSENT_VERSION,
      p_display_name: "Maria da Silva",
      p_origin_digest: `\\x${ORIGIN_DIGEST}`,
    })
  })

  it("código recusado devolve o status e não provisiona", async () => {
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

  it("titular sem localidade corrente vira exceção, nunca sucesso sem acesso", async () => {
    // O aceite inteiro roda numa transação: o P0005 desfaz o vínculo e o
    // convite volta a `pending`. O que o servidor não pode fazer é engolir o
    // erro e responder `ok` para quem não tem membership.
    const client = fakeClient({
      onRpc: () => ({
        data: null,
        error: { message: "the inviting holder has no current locality", code: "P0005" },
      }),
    })

    await expect(acceptFamilyInviteCode(client as never, ACCEPT_INPUT)).rejects.toMatchObject({
      code: "P0005",
    })
  })

  it("resposta sem linha é falha de infraestrutura", async () => {
    const client = fakeClient({ onRpc: () => ({ data: [], error: null }) })

    await expect(acceptFamilyInviteCode(client as never, ACCEPT_INPUT)).rejects.toThrow(
      "family invite acceptance returned no row",
    )
  })
})
