import { describe, expect, it } from "vitest"
import { classifyPortalResponse } from "web/lib/portal/classify"
import type { PortalApiResponse, VerificationResult } from "web/lib/portal/types"

function militaryRecord(overrides: Record<string, unknown>): PortalApiResponse {
  const servidor = {
    id: 1000,
    pessoa: { nome: "FULANO DE TAL", cpfFormatado: "***.123.456-**" },
    situacao: "Ativo",
    tipoServidor: "Militar",
    orgaoServidorLotacao: {
      codigo: "21000",
      nome: "Comando da Aeronáutica",
      sigla: "C.AER",
    },
    orgaoServidorExercicio: {
      codigo: "21000",
      nome: "Comando da Aeronáutica",
      sigla: "C.AER",
    },
    estadoExercicio: { sigla: "AM", nome: "Amazonas" },
    fichasCargoEfetivo: [],
    fichasFuncao: [],
    fichasMilitar: [
      {
        orgao: "Comando da Aeronáutica",
        orgaoServidorLotacao: "Comando da Aeronáutica",
        situacaoServidor: "MILITAR DA ATIVA",
      },
    ],
    fichasDemaisSituacoes: [],
    fichasAposentadoria: [],
    fichasReformado: [],
    fichasPensaoCivil: [],
    fichasPensaoMilitar: [],
    ...overrides,
  }

  return [{ servidor }]
}

describe("classifyPortalResponse with the real Portal /servidores shape", () => {
  it("classifies a nested active federal military record", () => {
    const result = classifyPortalResponse(militaryRecord({}))

    expect(result).toEqual<VerificationResult>({
      status: "verified",
      eligibilityClass: "active_federal_military",
      // P0 Task 5: o nome civil atravessa em memória, para preencher o campo.
      suggestedName: "FULANO DE TAL",
    })
  })

  it("classifies a nested reformado record as veteran", () => {
    const result = classifyPortalResponse(
      militaryRecord({
        situacao: "Reformado",
        fichasMilitar: [],
        fichasReformado: [{ orgao: "Comando da Aeronáutica" }],
      }),
    )

    expect(result).toEqual<VerificationResult>({
      status: "verified",
      eligibilityClass: "veteran",
      suggestedName: "FULANO DE TAL",
    })
  })

  it("classifies a nested military pensioner record", () => {
    const result = classifyPortalResponse(
      militaryRecord({
        situacao: "Pensionista",
        fichasMilitar: [],
        fichasPensaoMilitar: [{ orgao: "Comando da Aeronáutica" }],
      }),
    )

    expect(result).toEqual<VerificationResult>({
      status: "verified",
      eligibilityClass: "military_pensioner",
      suggestedName: "FULANO DE TAL",
    })
  })

  it("rejects a nested civilian record", () => {
    const result = classifyPortalResponse(
      militaryRecord({
        tipoServidor: "Servidor",
        orgaoServidorLotacao: {
          codigo: "26000",
          nome: "Ministério da Educação",
          sigla: "MEC",
        },
        orgaoServidorExercicio: {
          codigo: "26000",
          nome: "Ministério da Educação",
          sigla: "MEC",
        },
        fichasMilitar: [],
      }),
    )

    expect(result).toEqual<VerificationResult>({ status: "rejected" })
  })

  it("rejects a nested state military police record", () => {
    const result = classifyPortalResponse(
      militaryRecord({
        orgaoServidorLotacao: {
          codigo: "1",
          nome: "Polícia Militar do Estado do Amazonas",
          sigla: "PMAM",
        },
        orgaoServidorExercicio: {
          codigo: "1",
          nome: "Polícia Militar do Estado do Amazonas",
          sigla: "PMAM",
        },
        fichasMilitar: [
          {
            orgao: "Polícia Militar do Estado do Amazonas",
            orgaoServidorLotacao: "Polícia Militar do Estado do Amazonas",
            situacaoServidor: "MILITAR DA ATIVA",
          },
        ],
      }),
    )

    expect(result).toEqual<VerificationResult>({ status: "rejected" })
  })
})
