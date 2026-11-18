import { describe, expect, it } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { tipoDeFalha } from "@/src/eventos/tipo-de-falha"

// F02-001: a Busca e o Início usam a mesma classificação para escolher o estado
// da tela (sessão vencida, acesso negado ou erro com "Tentar de novo").

describe("tipo de falha da Busca e do Início", () => {
  it("401 é sessão vencida", () => {
    expect(tipoDeFalha(new FalhaDaApi("sem-sessao", 401))).toBe("sessao")
  })

  it("403 é acesso negado", () => {
    expect(tipoDeFalha(new FalhaDaApi("recusado", 403))).toBe("negado")
  })

  it("falha de rede não vira sessão vencida nem acesso negado", () => {
    expect(tipoDeFalha(new FalhaDaApi("rede", 0))).toBe("falhou")
    expect(tipoDeFalha(new TypeError("Failed to fetch"))).toBe("falhou")
  })

  it("servidor indisponível fica no estado de tentar de novo", () => {
    expect(tipoDeFalha(new FalhaDaApi("indisponivel", 503))).toBe("falhou")
  })
})
