import { expect, it } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  corpoDoGrupo,
  errosDoGrupo,
  foiAbortada,
  grupoValido,
  mensagemDaCriacao,
  type RascunhoDoGrupo,
} from "@/src/grupos/novo"

const rascunho: RascunhoDoGrupo = {
  nome: "Famílias do Norte",
  descricao: "Encontros da família",
  regras: "Respeito",
  fechado: false,
}

it.each([
  ["nome", { ...rascunho, nome: "ab" }],
  ["nome", { ...rascunho, nome: "x".repeat(81) }],
  ["descricao", { ...rascunho, descricao: "x".repeat(501) }],
  ["regras", { ...rascunho, regras: "x".repeat(601) }],
])("o erro de %s fica no campo que o originou", (campo, entrada) => {
  const erros = errosDoGrupo(entrada)
  expect(Object.keys(erros)).toEqual([campo])
  expect(grupoValido(entrada)).toBe(false)
})

it("o rascunho válido envia sem espaço sobrando e com a escolha de entrada", () => {
  const entrada = { ...rascunho, nome: "  Famílias  ", descricao: " ", fechado: true }
  expect(grupoValido(entrada)).toBe(true)
  expect(corpoDoGrupo(entrada)).toEqual({
    nome: "Famílias",
    descricao: "",
    regras: "Respeito",
    fechado: true,
  })
})

const EM_USO = "Já existe um grupo com esse nome. Busque e entre nele."
const PADRAO = "Não foi possível criar o grupo. Tente de novo."

it.each([
  [new FalhaDaApi("sem-sessao", 401), "Sua sessão expirou. Entre de novo para continuar."],
  [new FalhaDaApi("limite", 429), "Muitas tentativas seguidas. Espere um pouco."],
  [new FalhaDaApi("recusado", 403, "sem-cidade"), "Escolha a sua cidade antes de criar um grupo."],
  [new FalhaDaApi("conflito", 409, "nome-em-uso", EM_USO), EM_USO],
  [new FalhaDaApi("recusado", 403), "Sua conta não pode criar grupos nesta cidade."],
  [new FalhaDaApi("indisponivel", 503), PADRAO],
])("a frase do servidor vem antes da frase padrão", (falha, esperada) => {
  expect(mensagemDaCriacao(falha)).toBe(esperada)
})

it("falha que não é da API e chamada cancelada", () => {
  expect(mensagemDaCriacao(new Error("boom"))).toBe(PADRAO)
  expect(foiAbortada(new DOMException("Cancelado", "AbortError"))).toBe(true)
  expect(foiAbortada(new FalhaDaApi("rede", 0))).toBe(false)
})
