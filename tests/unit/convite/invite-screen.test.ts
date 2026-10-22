import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// PORT-006 (lote 4 da entrada): a tela /convite por contrato de fonte, como as
// demais varreduras de tests/unit/ui (o vitest não monta .tsx de apps/web). O
// que se prova aqui é a decisão que quebra em silêncio: a ordem código → conta,
// os textos do protótipo e o fato de a conta não nascer no navegador.
const DIR = join(process.cwd(), "apps", "web", "app", "(preauth)", "convite")
const page = readFileSync(join(DIR, "page.tsx"), "utf8")
const form = readFileSync(join(DIR, "invite-form.tsx"), "utf8")
const actions = readFileSync(join(DIR, "actions.ts"), "utf8")
const provision = readFileSync(
  join(process.cwd(), "apps", "web", "lib", "convite", "provision.ts"),
  "utf8",
)

describe("página do convite", () => {
  it("é a casca da entrada e recebe o código do link antigo", () => {
    expect(page).toContain("<EntryShell")
    expect(page).toContain('params["codigo"]')
    expect(page).toContain("initialCode")
  })

  it("não monta a casca própria: a pele é a da PORT-002", () => {
    expect(page).toContain("components/entry/entry-shell")
    expect(page).not.toContain("HeroUI")
  })
})

describe("formulário", () => {
  it("tem os dois estados do protótipo, com os textos dele", () => {
    expect(form).toContain("Entre pelo convite.")
    expect(form).toContain("Cônjuges e dependentes entram pelo convite de quem é militar, sem CPF.")
    expect(form).toContain("Crie sua conta.")
    expect(form).toContain("Quem convidou já foi verificado. Você não precisa de CPF.")
    expect(form).toContain("Aceitar convite")
  })

  it("o e-mail do convite é conferido, não inventado pela tela", () => {
    // O banco guarda só o digest: a tela mostra o rótulo mascarado e pede o
    // endereço, que a Server Action compara antes de criar a conta.
    expect(form).toContain("inviteeEmailHint")
    expect(form).toContain("O convite vale só para este e-mail")
    expect(form).toContain('label="E-mail do convite"')
  })

  it("usa os adaptadores da base e exige o aceite", () => {
    expect(form).toContain("MaterialOutlinedTextField")
    expect(form).toContain("MaterialPasswordField")
    expect(form).toContain("MaterialCheckbox")
    expect(form).toContain("MaterialFilledButton")
    expect(form).toContain("/privacidade")
    expect(form).toContain("/codigo-de-conduta")
  })

  it("depois de aceitar, navega por documento (o cookie nasce na ação)", () => {
    expect(form).toContain('window.location.assign("/inicio")')
  })
})

describe("ações do servidor", () => {
  it("valida o convite antes de criar a conta", () => {
    const previewIndex = actions.indexOf("previewFamilyInviteCode")
    const signUpIndex = actions.indexOf("signUp")
    expect(previewIndex).toBeGreaterThan(-1)
    expect(signUpIndex).toBeGreaterThan(previewIndex)
  })

  it("grava o aceite no servidor e não aceita consentimento só do cliente", () => {
    expect(actions).toContain("record_consent_acceptance")
    expect(actions).toContain("p_user_id: userId")
    // O id nunca vem do formulário.
    expect(actions).not.toMatch(/formData\.get\("user/)
  })

  it("fracasso depois do cadastro não vira conta órfã silenciosa", () => {
    // A conta nasce antes do vínculo: quando o aceite falha, a tela diz que a
    // conta existe, em vez de fingir que nada aconteceu.
    expect(actions).toContain("NO_LINK")
  })

  it("quem volta do link de confirmação aceita sem criar outra conta", () => {
    expect(actions).toContain("currentEmail === email")
    expect(actions).toContain("/auth/callback?next=")
    expect(actions).toContain("/convite?codigo=${code}")
  })

  it("o vínculo é o mesmo do convite por link", () => {
    expect(provision).toContain('rpc("family_invite_code_accept"')
    expect(provision).toContain('"family_accept_holder_locality"')
    expect(provision).toContain("provisionMember")
  })

  it("todo digest vai embrulhado para o PostgREST", () => {
    expect(provision).toContain("byteaDigestParam(input.codeHash)")
    expect(provision).toContain("byteaDigestParam(input.originDigest)")
    expect(actions).toContain("inviteCodeHash(code)")
  })
})
