import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// PORT-006 (lote 4 da entrada): o contrato que a migration do código de convite
// precisa manter. A prova de comportamento é pgTAP
// (supabase/tests/family-invite-code.sql, que o coordenador roda com o banco);
// aqui ficam as decisões que uma edição futura quebraria em silêncio — e que um
// teste de banco só pegaria depois do reset.
const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20261023120000_family_invite_code.sql"),
  "utf8",
)

describe("código do convite no banco", () => {
  it("guarda só o hash, com 32 bytes, e nunca o código em claro", () => {
    expect(MIGRATION).toContain("add column code_hash bytea")
    expect(MIGRATION).toMatch(/octet_length\(code_hash\) = 32/)
    // Um `code text` seria o código legível no banco: exatamente o que o
    // convite por link evita para o token.
    expect(MIGRATION).not.toMatch(/\bcode\s+text\b/)
    expect(MIGRATION).not.toMatch(/\binvite_code\s+text\b/)
  })

  it("o código é único e o índice ignora convites sem código", () => {
    expect(MIGRATION).toContain("create unique index family_invitations_code_hash_idx")
    expect(MIGRATION).toMatch(/where code_hash is not null/)
  })

  it("o aceite por código delega o vínculo ao accept_family_invitation", () => {
    // A regra familiar (e-mail do aceitante contra o digest do convite, criação
    // de family_account_links) continua num lugar só.
    expect(MIGRATION).toContain("private.accept_family_invitation(")
    expect(MIGRATION).toContain("v_invitation.token_digest")
  })

  it("errado, vencido e usado têm o mesmo status; o limite tem outro", () => {
    // Revisão do coordenador (22/10): a função NÃO lança para o resultado do
    // código. Uma exceção desfaz a transação da chamada — e o insert da
    // tentativa junto —, e o limite passa a contar só quem acertou.
    expect(MIGRATION).toContain("status := 'unavailable'")
    expect(MIGRATION).toContain("status := 'email_mismatch'")
    expect(MIGRATION).toContain("status := 'rate_limited'")
    expect(MIGRATION).not.toContain("family_invite_code_unavailable")
    expect(MIGRATION).not.toContain("using errcode = 'P0001'")
    expect(MIGRATION).not.toContain("using errcode = '54000'")
    // Entrada inválida (digest com tamanho errado) continua sendo exceção.
    expect(MIGRATION).toContain("using errcode = '22023'")
    // A função de aceite não pode deixar vazar o erro específico do
    // accept_family_invitation (vencido P0002, usado P0003, revogado P0004):
    // o bloco é subtransação e o status vira `unavailable`.
    expect(MIGRATION).toMatch(/when sqlstate 'P0001' or sqlstate 'P0002'/)
    expect(MIGRATION).toContain("v_link_id := null")
  })

  it("o teto é checado antes do código e só a falha vira tentativa", () => {
    expect(MIGRATION).toMatch(/returns table \(\s*status text/)
    // O gate devolve texto, não lança: é ele que confere o teto antes de o
    // código ser olhado, para quem estourou continuar barrado até com o código
    // certo.
    expect(MIGRATION).toContain(
      "private.family_invite_code_attempt_gate(p_origin_digest, p_email_digest)",
    )
    expect(MIGRATION).toContain("return 'rate_limited'")
    // A gravação é só da tentativa que falhou: o fluxo certo (preview,
    // validação e aceite) não consome tentativa.
    expect(MIGRATION).toContain("private.record_family_invite_code_failure(")
    expect(MIGRATION).not.toContain("record_family_invite_code_attempt")
  })

  it("contagem e insert ficam sob trava por origem e por e-mail", () => {
    // Duas chamadas simultâneas leem a mesma contagem sem trava e passam as
    // duas pelo teto. A trava é de transação, pela origem e depois pelo e-mail
    // (ordem fixa, para não haver ciclo), como em open_support_ticket.
    expect(MIGRATION).toContain("pg_catalog.pg_advisory_xact_lock(")
    expect(MIGRATION).toContain("pg_catalog.hashtextextended(")
    expect(MIGRATION).toMatch(/family_invite_code:origin:/)
    expect(MIGRATION).toMatch(/family_invite_code:email:/)
    expect(MIGRATION).toContain("perform private.lock_family_invite_code_attempts(")

    const helper = MIGRATION.slice(MIGRATION.indexOf("lock_family_invite_code_attempts("))
    const originLock = helper.indexOf("family_invite_code:origin:")
    const emailLock = helper.indexOf("family_invite_code:email:")
    expect(originLock).toBeGreaterThan(-1)
    expect(emailLock).toBeGreaterThan(originLock)
  })

  it("o aceite retoma o próprio vínculo em vez de recusar quem já aceitou", () => {
    // Sem retomada, uma falha no provisionamento deixa o convite `accepted` e a
    // pessoa sem acesso; a nova tentativa seria recusada como "usado".
    expect(MIGRATION).toMatch(/fi\.status = 'accepted'/)
    expect(MIGRATION).toMatch(/fi\.accepted_by_user_id = p_accepted_by_user_id/)
    expect(MIGRATION).toMatch(/link\.family_user_id = p_accepted_by_user_id/)
  })

  it("a tabela de tentativas é fechada para o cliente", () => {
    expect(MIGRATION).toContain(
      "alter table private.family_invite_code_attempts enable row level security",
    )
    expect(MIGRATION).toContain(
      "alter table private.family_invite_code_attempts force row level security",
    )
    expect(MIGRATION).toContain(
      "revoke all on table private.family_invite_code_attempts from anon, authenticated",
    )
  })

  it("as funções públicas são só do servidor", () => {
    for (const signature of [
      "public.family_invite_code_preview(bytea, bytea, bytea)",
      "public.family_invite_code_accept(bytea, uuid, bytea)",
    ]) {
      expect(MIGRATION).toContain(`revoke all on function ${signature} from authenticated`)
      expect(MIGRATION).toContain(`grant execute on function ${signature} to service_role`)
    }
    // Nenhum grant para authenticated nas funções novas.
    const grantsToAuthenticated = MIGRATION.match(
      /grant execute on function [^\n]*\n?\s*to authenticated/g,
    )
    expect(grantsToAuthenticated).toBeNull()
  })
})
