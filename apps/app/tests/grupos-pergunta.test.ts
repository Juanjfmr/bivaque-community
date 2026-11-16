import { afterEach, describe, expect, it, vi } from "vitest"
import {
  AVISO_DA_CIDADE,
  corpoDaPergunta,
  errosDaPerguntaDoGrupo,
  perguntaValida,
  podePerguntar,
} from "@/src/grupos/pergunta"

// RUN-178 — modo Pergunta do compositor do grupo. A opção só existe em grupo
// Aberto (o banco também veta), o aviso da cidade aparece antes de publicar e o
// corpo do POST não carrega cidade, grupo nem autoria.

afterEach(() => vi.unstubAllGlobals())

describe("modo pergunta do compositor do grupo", () => {
  it("só grupo aberto oferece perguntar à cidade", () => {
    expect(podePerguntar({ fechado: false })).toBe(true)
    expect(podePerguntar({ fechado: true })).toBe(false)
  })

  it("o aviso prometido desde o protótipo está na tela", () => {
    expect(AVISO_DA_CIDADE).toBe("Sua pergunta aparecerá na cidade com o nome do grupo.")
  })

  it("o título segue a régua do banco: 8 a 300 caracteres", () => {
    expect(errosDaPerguntaDoGrupo({ titulo: "curto", assunto: "" }).titulo).toContain("8")
    expect(errosDaPerguntaDoGrupo({ titulo: "a".repeat(301), assunto: "" }).titulo).toContain("300")
    expect(perguntaValida({ titulo: "Alguém indica veterinário?", assunto: "" })).toBe(true)
  })

  it("o assunto opcional cabe no limite que o servidor aceita", () => {
    expect(
      errosDaPerguntaDoGrupo({ titulo: "Alguém indica veterinário?", assunto: "a".repeat(61) })
        .assunto,
    ).toContain("60")
    expect(
      errosDaPerguntaDoGrupo({ titulo: "Alguém indica veterinário?", assunto: "Pets" }).assunto,
    ).toBeUndefined()
  })

  it("o corpo leva só o texto: origem e autoria nunca saem do navegador", () => {
    expect(corpoDaPergunta({ titulo: "  Alguém indica veterinário?  ", assunto: " Pet " })).toEqual(
      { titulo: "Alguém indica veterinário?", assunto: "Pet" },
    )
  })
})
