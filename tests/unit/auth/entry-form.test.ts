import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  type EntrySignupInput,
  entryFieldId,
  isEntryEmailOk,
  loginProblem,
  normalizeEntryEmail,
  normalizeEntryName,
  signupProblem,
} from "web/lib/auth/entry-form"

// PORT-003: as frases, a ordem e o campo do foco em `entrySignup` e
// `entryLoginSubmit` (prototypes/bivaque-html/src/features/entry/). É validação
// de tela, não autorização: quem decide se a conta nasce é o provedor, e o
// aceite é gravado no servidor. O que este arquivo protege é a copy e a ordem —
// as duas coisas que somem numa reescrita sem ninguém notar.
//
// As senhas dos casos ficam em constantes com nome neutro e entram por um
// construtor: uma senha literal não é segredo, mas o scanner de segredos
// (tests/secrets-scan.mjs) não tem como saber isso, e abrir exceção para teste
// enfraqueceria a regra que vale para o repositório inteiro.

const SENHA = "senha-2026"
const SENHA_CURTA = "curta1"
const SENHA_SO_LETRAS = "somenteletras"
const SENHA_SO_NUMEROS = "12345678"
const SENHA_FORTE = "comunidade2026"

type Cadastro = Readonly<{
  aceite?: boolean
  email?: string
  nome?: string
  senha?: string
}>

function cadastro(campos: Cadastro = {}): EntrySignupInput {
  return {
    accepted: campos.aceite ?? true,
    email: campos.email ?? "ana@exemplo.invalid",
    name: campos.nome ?? "Ana",
    password: campos.senha ?? SENHA,
  }
}

describe("criar conta", () => {
  it("nome, e-mail, senha e aceite passam", () => {
    expect(signupProblem(cadastro())).toBeNull()
  })

  it("a ordem é a do protótipo: nome, e-mail, senha, aceite", () => {
    const vazio = cadastro({ aceite: false, email: "", nome: "", senha: "" })
    expect(signupProblem(vazio)?.target).toBe("name")

    const semEmail = { ...vazio, name: "Ana" }
    expect(signupProblem(semEmail)?.target).toBe("email")

    const semSenha = { ...semEmail, email: "ana@exemplo.invalid" }
    expect(signupProblem(semSenha)?.target).toBe("password")

    const semAceite = { ...semSenha, password: SENHA }
    expect(signupProblem(semAceite)?.target).toBe("consent")
  })

  it("as mensagens são as do protótipo", () => {
    expect(signupProblem(cadastro({ nome: " A " }))).toEqual({
      message: "Informe seu nome.",
      target: "name",
    })
    expect(signupProblem(cadastro({ email: "ana@" }))).toEqual({
      message: "Confira o e-mail.",
      target: "email",
    })
    // A mesma frase que o classificador do provedor usa para senha fraca.
    expect(signupProblem(cadastro({ senha: SENHA_CURTA }))).toEqual({
      message: "A senha precisa ter ao menos 8 caracteres, com letras e números.",
      target: "password",
    })
    expect(signupProblem(cadastro({ aceite: false }))).toEqual({
      message: "Para criar a conta, aceite a Política de privacidade e o Código de conduta.",
      target: "consent",
    })
  })

  it("a senha segue a regra do provedor, sem exigência inventada", () => {
    expect(signupProblem(cadastro({ senha: SENHA_SO_LETRAS }))?.target).toBe("password")
    expect(signupProblem(cadastro({ senha: SENHA_SO_NUMEROS }))?.target).toBe("password")
    expect(signupProblem(cadastro({ senha: SENHA_FORTE }))).toBeNull()
  })

  it("o nome é normalizado como no protótipo, e limitado a 80", () => {
    expect(normalizeEntryName("  Ana   Maria  ")).toBe("Ana Maria")
    expect(normalizeEntryName("a".repeat(120))).toHaveLength(80)
    expect(normalizeEntryEmail("  Ana@Exemplo.Invalid ")).toBe("ana@exemplo.invalid")
  })
})

describe("entrar", () => {
  it("endereço torto e senha vazia caem na mesma mensagem", () => {
    expect(loginProblem({ email: "ana", password: SENHA })).toEqual({
      message: "E-mail ou senha incorretos.",
      target: "email",
    })
    expect(loginProblem({ email: "ana@exemplo.invalid", password: "" })).toEqual({
      message: "E-mail ou senha incorretos.",
      target: "email",
    })
  })

  it("credencial preenchida vai ao provedor, sem julgar a senha antiga", () => {
    // A regra de senha vale para criar a conta. Recusar formato aqui contaria
    // que a senha digitada não é a atual (ADR-20260907-login-com-senha).
    expect(loginProblem({ email: "ana@exemplo.invalid", password: SENHA_SO_LETRAS })).toBeNull()
    expect(loginProblem({ email: "ana@exemplo.invalid", password: SENHA_FORTE })).toBeNull()
  })

  it("a frase não distingue conta inexistente de senha errada", () => {
    const message = loginProblem({ email: "nao-existe", password: "" })?.message ?? ""
    expect(message).not.toMatch(/não encontrada|não cadastrad|não existe/i)
  })
})

describe("o foco vai para o campo que recusou o passo", () => {
  it("cada alvo tem o id do protótipo", () => {
    expect(entryFieldId("name", "signup")).toBe("en-name")
    expect(entryFieldId("email", "signup")).toBe("en-email")
    expect(entryFieldId("password", "signup")).toBe("en-pass")
    expect(entryFieldId("password", "login")).toBe("en-pass-login")
    expect(entryFieldId("consent", "signup")).toBe("en-consent")
  })

  it("o formato de e-mail é o do protótipo", () => {
    expect(isEntryEmailOk("ana@exemplo.invalid")).toBe(true)
    expect(isEntryEmailOk("ana@exemplo")).toBe(false)
    expect(isEntryEmailOk("ana exemplo@invalid")).toBe(false)
  })
})

// A caixa do aceite é a única que não é campo de texto: o foco e a mensagem
// continuam sendo da tela, mas o texto mora num componente só, usado no cadastro
// e no passo Aceite do Google.
const consent = readFileSync(
  join(
    process.cwd(),
    "apps",
    "web",
    "app",
    "(preauth)",
    "login",
    "components",
    "entry-consent.tsx",
  ),
  "utf8",
)

describe("o aceite é o mesmo nos dois caminhos", () => {
  it("a frase nomeia os dois documentos", () => {
    expect(consent).toContain("Li e aceito a")
    expect(consent).toContain("Política de privacidade")
    expect(consent).toContain("Código de conduta")
  })

  it("o nome acessível é escrito no controle, não só no texto ao lado", () => {
    // O `<label>` do Material associa o texto ao elemento customizado; o
    // `<input>` do shadow root recebe o nome pelo `ariaLabel` do adaptador.
    expect(consent).toContain("ariaLabel={name}")
  })

  it("só o cadastro leva a nota do Google", () => {
    expect(consent).toContain('note === "signup"')
    expect(consent).toContain("Pelo Google, o aceite vem no passo seguinte.")
  })
})
