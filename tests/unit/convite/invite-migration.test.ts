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

  it("errado, vencido e usado têm o mesmo erro; limite tem outro", () => {
    expect(MIGRATION).toContain("family_invite_code_unavailable")
    expect(MIGRATION).toContain("errcode = 'P0001'")
    expect(MIGRATION).toContain("using errcode = '54000'")
    // A função de aceite não pode deixar vazar o erro específico do
    // accept_family_invitation (vencido P0002, usado P0003, revogado P0004).
    expect(MIGRATION).toMatch(/when sqlstate 'P0001' or sqlstate 'P0002'/)
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
