import { describe, expect, it } from "vitest"

import { AVISO_SEM_ORIGEM, avisoDaOrdem, ordemDe } from "@/src/negocios/ordem"

describe("ordem da lista de negócios", () => {
  it("'mais recentes' não tem o que explicar", () => {
    expect(avisoDaOrdem("recentes", false)).toBeNull()
    expect(avisoDaOrdem("recentes", true)).toBeNull()
  })

  it("'mais próximos' sem origem cai para as recentes e diz por quê", () => {
    expect(avisoDaOrdem("proximos", false)).toBe(AVISO_SEM_ORIGEM)
  })

  it("com origem a distância ordena e não há aviso", () => {
    expect(avisoDaOrdem("proximos", true)).toBeNull()
  })

  it("valor estranho da seleção vira a ordem padrão, nunca um terceiro estado", () => {
    expect(ordemDe("proximos")).toBe("proximos")
    expect(ordemDe("recentes")).toBe("recentes")
    expect(ordemDe("")).toBe("recentes")
    expect(ordemDe(null)).toBe("recentes")
    expect(ordemDe(undefined)).toBe("recentes")
  })
})
