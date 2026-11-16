import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { ContagensDoPerfil, PerfilDaConta } from "@/lib/dados/voce"
import { Contadores } from "@/src/telas/Voce"

/**
 * RUN-174: leitura da conta que falha não vira zero na tela. `conta` nula é a
 * falha da leitura (a mesma que abre o painel de erro do perfil); zero só
 * aparece quando a leitura de verdade devolveu zero.
 */

const PERFIL: PerfilDaConta["perfil"] = {
  nome: "Ana Verificada",
  bio: null,
  cidade: { id: "00000000-0000-4000-8000-000000000001", nome: "Manaus" },
  outbound: null,
  localizacao: { cep: null, definida: false },
  distanciaDisponivel: false,
}

function conta(contagens: ContagensDoPerfil): PerfilDaConta {
  return { perfil: PERFIL, contagens, conta: { exclusaoPendente: false } }
}

function desenhar(perfilDaConta: PerfilDaConta | null): string {
  return renderToStaticMarkup(createElement(Contadores, { conta: perfilDaConta }))
}

const INDISPONIVEL = "Contagem indisponível agora"

function ocorrencias(texto: string, trecho: string): number {
  return texto.split(trecho).length - 1
}

describe("contadores do Você", () => {
  it("leitura em falha não mostra zero: cada contador diz que a contagem está indisponível", () => {
    const desenho = desenhar(null)
    expect(ocorrencias(desenho, ">0<")).toBe(0)
    // O nome acessível de cada contador sem leitura, e o traço que a pessoa vê.
    expect(ocorrencias(desenho, `${INDISPONIVEL}</span>`)).toBe(4)
    expect(ocorrencias(desenho, "—</span>")).toBe(4)
    for (const rotulo of ["salvos", "anúncios", "perguntas", "grupos"]) {
      expect(desenho).toContain(rotulo)
    }
  })

  it("leitura em sucesso com zero mostra zero de verdade", () => {
    const desenho = desenhar(conta({ salvos: 0, anuncios: 0, perguntas: 0, grupos: 0 }))
    expect(ocorrencias(desenho, ">0<")).toBe(4)
    expect(desenho).not.toContain(INDISPONIVEL)
  })

  it("leitura em sucesso com números mostra os números", () => {
    const desenho = desenhar(conta({ salvos: 2, anuncios: 3, perguntas: 2, grupos: 1 }))
    expect(ocorrencias(desenho, ">2<")).toBe(2)
    expect(ocorrencias(desenho, ">3<")).toBe(1)
    expect(ocorrencias(desenho, ">1<")).toBe(1)
    expect(desenho).not.toContain(INDISPONIVEL)
  })
})
