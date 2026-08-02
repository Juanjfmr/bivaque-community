import { describe, expect, it } from "vitest"
import { classifyPortalResponse } from "web/lib/portal/classify"
import type { PortalApiResponse, VerificationResult } from "web/lib/portal/types"

const activeFederalRecord: PortalApiResponse = [
  {
    orgao_servidor: "Comando do Exército",
    situacao_funcional: "ATIVO PERMANENTE",
  },
]

const veteranReformadoRecord: PortalApiResponse = [
  {
    orgao_servidor: "Comando da Aeronáutica",
    situacao_funcional: "reformado",
  },
]

const militaryPensionerRecord: PortalApiResponse = [
  {
    orgao_servidor: "Comando da Marinha",
    situacao_funcional: "PENSIONISTA MILITAR",
  },
]

const civilianRecord: PortalApiResponse = [
  {
    orgao_servidor: "Ministério da Educação",
    situacao_funcional: "ATIVO PERMANENTE",
  },
]

const nonFederalMilitaryRecord: PortalApiResponse = [
  {
    orgao_servidor: "Polícia Militar do Estado de São Paulo",
    situacao_funcional: "ATIVO",
  },
]

const nonMilitaryPensionerRecord: PortalApiResponse = [
  {
    orgao_servidor: "Ministério da Previdência",
    situacao_funcional: "PENSIONISTA",
  },
]

const ambiguousRecord: PortalApiResponse = [
  {
    orgao_servidor: "Comando do Exército",
    situacao_funcional: "CEDIDO",
  },
]

const multipleMatchResponse: PortalApiResponse = [
  {
    orgao_servidor: "Comando do Exército",
    situacao_funcional: "ATIVO PERMANENTE",
  },
  {
    orgao_servidor: "Comando da Marinha",
    situacao_funcional: "ATIVO PERMANENTE",
  },
]

const emptyResponse: PortalApiResponse = []

describe("classifyPortalResponse", () => {
  describe("positive classifications", () => {
    it("classifies federal active military as verified", () => {
      // Given a single federal active military Portal record
      // When the classifier processes the response
      const result = classifyPortalResponse(activeFederalRecord)

      // Then the holder is verified as active_federal_military
      expect(result).toEqual<VerificationResult>({
        status: "verified",
        eligibilityClass: "active_federal_military",
      })
    })

    it("classifies reformado (federal) as veteran", () => {
      // Given a single federal reformado Portal record
      // When the classifier processes the response
      const result = classifyPortalResponse(veteranReformadoRecord)

      // Then the reformado source label maps to internal veteran
      expect(result).toEqual<VerificationResult>({
        status: "verified",
        eligibilityClass: "veteran",
      })
    })

    it("classifies federal military pensioner as verified", () => {
      // Given a single federal military pensioner Portal record
      // When the classifier processes the response
      const result = classifyPortalResponse(militaryPensionerRecord)

      // Then the holder is verified as military_pensioner
      expect(result).toEqual<VerificationResult>({
        status: "verified",
        eligibilityClass: "military_pensioner",
      })
    })
  })

  describe("rejections", () => {
    it("rejects a civilian public servant", () => {
      // Given a civilian record
      // When the classifier processes it
      const result = classifyPortalResponse(civilianRecord)

      // Then it is rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })

    it("rejects non-federal military (state police)", () => {
      // Given a state military police record
      // When the classifier processes it
      const result = classifyPortalResponse(nonFederalMilitaryRecord)

      // Then non-federal military is rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })

    it("rejects a non-military pensioner", () => {
      // Given a civilian pensioner record
      // When the classifier processes it
      const result = classifyPortalResponse(nonMilitaryPensionerRecord)

      // Then non-military pensioner is rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })

    it("rejects ambiguous status (cedido)", () => {
      // Given an active-but-ceded record
      // When the classifier processes it
      const result = classifyPortalResponse(ambiguousRecord)

      // Then ambiguous records are rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })

    it("rejects multiple-match responses", () => {
      // Given a response with multiple records
      // When the classifier processes it
      const result = classifyPortalResponse(multipleMatchResponse)

      // Then multiple records are rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })

    it("rejects an empty response", () => {
      // Given a response with no records
      // When the classifier processes it
      const result = classifyPortalResponse(emptyResponse)

      // Then empty results are rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })
  })

  describe("alternative field names", () => {
    it("uses orgao as fallback for orgao_servidor", () => {
      // Given a record that uses the orgao field instead of orgao_servidor
      const result = classifyPortalResponse([
        {
          orgao: "Comando do Exército",
          situacao_funcional: "ATIVO PERMANENTE",
        },
      ])

      // Then the classifier still resolves correctly
      expect(result).toEqual<VerificationResult>({
        status: "verified",
        eligibilityClass: "active_federal_military",
      })
    })

    it("uses situacao as fallback for situacao_funcional", () => {
      // Given a record that uses the situacao field
      const result = classifyPortalResponse([
        {
          orgao_servidor: "Comando da Aeronáutica",
          situacao: "reformado",
        },
      ])

      // Then the classifier still maps reformado to veteran
      expect(result).toEqual<VerificationResult>({
        status: "verified",
        eligibilityClass: "veteran",
      })
    })

    it("uses orgao_lotacao as another fallback", () => {
      // Given a record that uses orgao_lotacao
      const result = classifyPortalResponse([
        {
          orgao_lotacao: "Ministério da Defesa",
          situacao_funcional: "ATIVO",
        },
      ])

      // Then the classifier resolves via the fallback
      expect(result.status).toBe("verified")
      expect(result.status === "verified" && result.eligibilityClass).toBe(
        "active_federal_military",
      )
    })
  })

  describe("explicitly non-eligible military", () => {
    it("rejects reformado from non-federal military", () => {
      // Given a state-level reformado record
      const result = classifyPortalResponse([
        {
          orgao_servidor: "Polícia Militar do Estado do Rio de Janeiro",
          situacao_funcional: "reformado",
        },
      ])

      // Then non-federal reformado is rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })

    it("rejects pensioner from non-federal military", () => {
      // Given a state-level military pensioner
      const result = classifyPortalResponse([
        {
          orgao_servidor: "Bombeiro Militar do Distrito Federal",
          situacao_funcional: "PENSIONISTA MILITAR",
        },
      ])

      // Then non-federal military pensioner is rejected
      expect(result).toEqual<VerificationResult>({ status: "rejected" })
    })
  })
})
