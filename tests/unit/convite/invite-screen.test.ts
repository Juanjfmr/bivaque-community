import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// PORT-006 (lote 4 da entrada): a tela /convite por contrato de fonte, como as
// demais varreduras de tests/unit/ui (o vitest não monta .tsx de apps/web). O
// que se prova aqui é o que é contrato de arquivo: a casca da PORT-002 e o
// texto que a tela mostra.
//
// As decisões de COMPORTAMENTO saíram daqui na correção da revisão
// independente: a ordem das chamadas ao banco é provada em
// invite-actions.test.ts e invite-provision.test.ts, e o lugar do erro é
// provado em invite-form.test.ts. Procurar "NO_LINK" ou comparar posição de
// texto no arquivo não provava nenhuma das duas.
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
  it("grava o aceite no servidor e não aceita consentimento só do cliente", () => {
    expect(actions).toContain("record_consent_acceptance")
    expect(actions).toContain("p_user_id: userId")
    // O id nunca vem do formulário.
    expect(actions).not.toMatch(/formData\.get\("user/)
  })

  it("quem volta do link de confirmação aceita sem criar outra conta", () => {
    expect(actions).toContain("currentEmail === email")
    expect(actions).toContain("/auth/callback?next=")
    expect(actions).toContain("/convite?codigo=${code}")
  })

  it("o vínculo é o mesmo do convite por link", () => {
    expect(provision).toContain('rpc("family_invite_code_accept"')
    expect(provision).toContain("p_display_name")
    expect(provision).toContain("p_consent_version")
  })

  it("não provisiona em TypeScript: vínculo, localidade e perfil são uma transação", () => {
    // Terceira correção: estas duas chamadas eram o segundo request, e a falha
    // entre ele e o vínculo deixava o convite consumido sem acesso.
    expect(provision).not.toContain("family_accept_holder_locality")
    expect(provision).not.toContain("provisionMember")
    expect(provision).not.toContain("provision_member_locality")
  })

  it("lê o status do banco, não o código de erro de uma exceção", () => {
    // Correção da revisão (22/10): uma exceção desfaz a transação — e o insert
    // da tentativa —, então o limite só contaria quem acertou.
    expect(provision).toContain("asFamilyInviteCodeStatus(row.status)")
    expect(actions).toContain('preview.status !== "ok"')
    expect(actions).toContain('acceptance.status !== "ok"')
    expect(actions).not.toContain("P0005")
  })
})

const familiaPage = readFileSync(
  join(process.cwd(), "apps", "web", "app", "(shell)", "configuracoes", "familia", "page.tsx"),
  "utf8",
)

describe("tela de quem convida", () => {
  it("mostra o código ao lado do link e copia a tela do convite já preenchida", () => {
    expect(familiaPage).toContain("setInviteCode(result.code")
    // O "copiar" leva a tela do convite já com o código, e não o link antigo.
    expect(familiaPage).toContain("new URL(`/convite?codigo=")
  })

  it("avisa que o código também foi para o e-mail e que não volta ao recarregar", () => {
    // O banco guarda só o hash: o código em claro existe na resposta do envio e
    // do reenvio, e em nenhum outro lugar. A tela diz isso sem falar do banco
    // (tests/unit/ui/copy-fala-com-a-pessoa.test.ts).
    expect(familiaPage).toContain("O código também foi enviado por e-mail")
    expect(familiaPage).toContain("se sair desta")
    expect(familiaPage).toContain("Se perder, use Reenviar.")
  })
})
