import { describe, expect, it } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  corpoDoEncontro,
  encontroValido,
  errosDoEncontro,
  instanteDoEncontro,
  mensagemDaFalha,
  paraDataEHora,
  type RascunhoDoEncontro,
  rotuloDeDataHora,
} from "@/src/eventos/formulario"

/**
 * A régua do formulário no app. Ela não substitui a do servidor — evita mandar
 * o que já se sabe que volta 400, e mantém os mesmos limites para a mensagem
 * aparecer no campo antes do pedido.
 *
 * Data e hora são digitadas em pt-BR; o campo nativo de data não serve porque
 * segue o idioma do navegador.
 */

const valido: RascunhoDoEncontro = {
  titulo: "Café da manhã",
  descricao: "Encontro aberto.",
  data: "10/11/2026",
  hora: "09:00",
  local: "Praça do centro",
}

describe("erros do encontro, campo por campo", () => {
  it("aceita o formulário completo", () => {
    expect(errosDoEncontro(valido)).toEqual({})
    expect(encontroValido(valido)).toBe(true)
  })

  it("o título curto acusa o título, e só ele", () => {
    expect(errosDoEncontro({ ...valido, titulo: " a " })).toEqual({
      titulo: "O título precisa de pelo menos 2 caracteres.",
    })
  })

  it("recusa título, descrição e local acima do teto do servidor", () => {
    const grande = errosDoEncontro({
      ...valido,
      titulo: "x".repeat(201),
      descricao: "x".repeat(2001),
      local: "x".repeat(201),
    })
    expect(grande.titulo).toContain("200")
    expect(grande.descricao).toContain("2000")
    expect(grande.local).toContain("200")
  })

  it("a data vazia pede o formato brasileiro no próprio campo", () => {
    expect(errosDoEncontro({ ...valido, data: "  " }).data).toBe("Informe a data, como 05/12/2026.")
  })

  it("mês invertido em formato americano é recusado, não adivinhado", () => {
    expect(errosDoEncontro({ ...valido, data: "2026-12-05" }).data).toBe(
      "Data em dia/mês/ano, como 05/12/2026.",
    )
  })

  it("dia que não existe no calendário é recusado", () => {
    expect(errosDoEncontro({ ...valido, data: "31/02/2026" }).data).toBe(
      "Essa data não existe. Confira o dia e o mês.",
    )
  })

  it("a hora é de 24 h: 19:00 passa, 25:00 e 7:00 não", () => {
    expect(errosDoEncontro({ ...valido, hora: "19:00" }).hora).toBeUndefined()
    expect(errosDoEncontro({ ...valido, hora: "25:00" }).hora).toBe("Hora em 24 h, como 19:30.")
    expect(errosDoEncontro({ ...valido, hora: "7:00" }).hora).toBe("Hora em 24 h, como 19:30.")
    expect(errosDoEncontro({ ...valido, hora: "" }).hora).toBe("Informe a hora, como 19:30.")
  })
})

describe("instante do encontro", () => {
  it("data e hora digitadas viram o instante do fuso de quem usa", () => {
    const quando = instanteDoEncontro({ data: "10/11/2026", hora: "09:00" })
    expect(quando).not.toBeNull()
    expect(quando?.getFullYear()).toBe(2026)
    expect(quando?.getMonth()).toBe(10)
    expect(quando?.getDate()).toBe(10)
    expect(quando?.getHours()).toBe(9)
  })

  it("data ou hora que não existem não viram instante", () => {
    expect(instanteDoEncontro({ data: "31/02/2026", hora: "09:00" })).toBeNull()
    expect(instanteDoEncontro({ data: "10/11/2026", hora: "24:00" })).toBeNull()
  })
})

describe("corpo enviado", () => {
  it("tira espaço sobrando e manda o instante em ISO", () => {
    const corpo = corpoDoEncontro({ ...valido, titulo: "  Café  ", local: "  Praça  " })
    expect(corpo).not.toBeNull()
    expect(corpo?.titulo).toBe("Café")
    expect(corpo?.local).toBe("Praça")
    expect(corpo?.comecaEm).toBe(instanteDoEncontro(valido)?.toISOString())
  })

  it("sem data válida, não há corpo", () => {
    expect(corpoDoEncontro({ ...valido, data: "" })).toBeNull()
  })
})

describe("ida e volta da data", () => {
  it("o ISO que o servidor devolve volta como dd/mm/aaaa e HH:MM", () => {
    const iso = new Date(2026, 10, 10, 9, 30).toISOString()
    expect(paraDataEHora(iso)).toEqual({ data: "10/11/2026", hora: "09:30" })
  })

  it("data inválida não vira campo preenchido", () => {
    expect(paraDataEHora("nada")).toEqual({ data: "", hora: "" })
  })
})

describe("exibição da data em português", () => {
  it("dia da semana, dd/mm/aaaa e hora em 24 h", () => {
    expect(rotuloDeDataHora(new Date(2026, 11, 5, 19, 0))).toBe("Sábado, 05/12/2026 · às 19h")
    expect(rotuloDeDataHora(new Date(2026, 11, 5, 19, 30))).toBe("Sábado, 05/12/2026 · às 19h30")
  })

  it("data inválida não vira rótulo", () => {
    expect(rotuloDeDataHora(new Date("nada"))).toBe("")
  })
})

// Item 4 da revisão: cada ação tem a sua frase, e a frase do servidor vem
// primeiro. Antes, todo 403 virava "Só quem organiza…" — inclusive a pergunta.
describe("mensagem de falha por ação", () => {
  const semMensagem = (motivo: string | null) => new FalhaDaApi("recusado", 403, motivo)

  it("403 sem motivo usa a frase da própria ação", () => {
    expect(mensagemDaFalha(semMensagem(null), "pergunta")).toBe(
      "Não foi possível enviar. Seu texto foi mantido.",
    )
    expect(mensagemDaFalha(semMensagem(null), "presenca")).toBe(
      "Não foi possível registrar sua presença. Tente de novo.",
    )
    expect(mensagemDaFalha(semMensagem(null), "criar")).toBe(
      "Não foi possível criar o encontro. Tente de novo.",
    )
  })

  it("a mensagem do servidor vence a frase da ação", () => {
    const falha = new FalhaDaApi(
      "recusado",
      403,
      "recusado",
      "Você já tem conversa com esta pessoa.",
    )
    expect(mensagemDaFalha(falha, "pergunta")).toBe("Você já tem conversa com esta pessoa.")
  })

  it("só a edição por quem não organiza acusa autoria", () => {
    expect(mensagemDaFalha(semMensagem("nao-organiza"), "editar")).toBe(
      "Só quem organiza pode mudar este encontro.",
    )
    expect(mensagemDaFalha(semMensagem(null), "pergunta")).not.toContain("organiza pode mudar")
  })

  it("criar sem cidade e presença de outra cidade têm frase própria", () => {
    expect(mensagemDaFalha(semMensagem("sem-cidade"), "criar")).toBe(
      "Escolha a sua cidade antes de criar um encontro.",
    )
    expect(mensagemDaFalha(semMensagem("de-outra-cidade"), "presenca")).toContain("outra cidade")
  })

  it("sessão vencida pede entrar de novo, em qualquer ação", () => {
    const falha = new FalhaDaApi("sem-sessao", 401)
    expect(mensagemDaFalha(falha, "presenca")).toContain("sessão expirou")
  })

  it("pedido inválido mostra a correção que o servidor apontou", () => {
    const falha = new FalhaDaApi(
      "invalido",
      400,
      "dados-invalidos",
      "O título precisa de 2 caracteres.",
    )
    expect(mensagemDaFalha(falha, "criar")).toBe("O título precisa de 2 caracteres.")
  })

  it("falha que nem é da API cai na frase da ação", () => {
    expect(mensagemDaFalha(new Error("boom"), "encontro")).toBe(
      "Não foi possível carregar o encontro. Tente de novo.",
    )
  })
})
