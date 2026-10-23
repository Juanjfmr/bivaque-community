import { describe, expect, it } from "vitest"
import { provisionErrorMessage, welcomeBlocks } from "web/lib/onboarding/entry-moment"

// PORT-005 (lote 4 da entrada): o que as boas-vindas dizem em cada momento e a
// tradução dos códigos do `provision`. As frases são as do protótipo
// (`renderEntryWelcome` e `entryFinish`); o teste é o que impede que elas
// derivem sem alguém decidir — inclusive a única exceção deliberada: o lead de
// "Chegando" e de "Saindo" não promete mais um plano pronto, porque a Início
// ainda não mostra o plano (divergência registrada no contrato PORT-005).

describe("welcomeBlocks", () => {
  it("chegando: a chegada declarada, sem prometer plano que a Início não mostra", () => {
    const blocks = welcomeBlocks({ destinationCity: null, homeCity: "Manaus", moment: "arriving" })
    expect(blocks.lead).toBe("Você marcou sua chegada a Manaus.")
    expect(blocks.lead).not.toMatch(/plano .* pronto/)
    expect(blocks.tiles).toEqual([
      {
        description: "Moradia, escola, saúde e mudança, na ordem.",
        href: "/inicio",
        icon: "map",
        title: "Ver o plano de chegada",
      },
    ])
  })

  it("saindo: a saída declarada para a cidade de destino", () => {
    const blocks = welcomeBlocks({
      destinationCity: "Brasília",
      homeCity: "Manaus",
      moment: "leaving",
    })
    expect(blocks.lead).toBe("Você marcou sua saída para Brasília.")
    expect(blocks.lead).not.toMatch(/plano .* pronto/)
    expect(blocks.tiles[0]?.title).toBe("Ver o plano de saída")
    expect(blocks.tiles[0]?.href).toBe("/inicio")
  })

  it("moro aqui: o guia da cidade", () => {
    const blocks = welcomeBlocks({ destinationCity: null, homeCity: "Manaus", moment: "resident" })
    expect(blocks.lead).toBe("O que a comunidade de Manaus indica já está à sua espera.")
    expect(blocks.tiles).toEqual([
      {
        description: "O que a comunidade indica, por assunto.",
        href: "/guide",
        icon: "map",
        title: "Conhecer Manaus",
      },
    ])
  })

  it("saindo sem destino legível cai em moro aqui, sem prometer plano para lugar nenhum", () => {
    // O CHECK do banco exige o destino em `leaving`; este caso é o da leitura
    // em que a cidade de destino não veio.
    const blocks = welcomeBlocks({ destinationCity: null, homeCity: "Manaus", moment: "leaving" })
    expect(blocks.lead).toBe("O que a comunidade de Manaus indica já está à sua espera.")
    expect(blocks.tiles[0]?.href).toBe("/guide")
  })
})

describe("provisionErrorMessage", () => {
  it("traduz os códigos de validação do servidor", () => {
    expect(provisionErrorMessage("locality is unknown")).toBe("Escolha sua cidade.")
    expect(provisionErrorMessage("arrival_date is required")).toBe("Informe a data de chegada.")
    expect(provisionErrorMessage("departure_date is required")).toBe("Informe a data da saída.")
    expect(provisionErrorMessage("destination must differ from the current city")).toBe(
      "Escolha um destino diferente da sua cidade atual.",
    )
    expect(provisionErrorMessage("display_name is required")).toBe(
      "Informe como você quer ser chamado.",
    )
  })

  it("código desconhecido ou ausente não ecoa detalhe do servidor", () => {
    const generic = "Não foi possível concluir sua entrada. Tente novamente."
    expect(provisionErrorMessage(undefined)).toBe(generic)
    expect(provisionErrorMessage("relation member_entry_moments does not exist")).toBe(generic)
  })
})
