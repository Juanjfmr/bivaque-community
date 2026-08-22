import { describe, expect, it } from "vitest"
import {
  parseContract,
  readElevationTerms,
  requiredRiskLevel,
  validateContract,
} from "../../../scripts/agents/task-contract"

// O contrato é a unidade de execução do harness: se o validador afrouxar, volta a ser
// possível mandar um agente executar uma tarefa sem fronteira, sem baseline e sem prova.
// Cada recusa aqui corresponde a uma linha de docs/agents/TASK_CONTRACT.md §"as sete recusas".

const validContract = `
task_id: DS-021
objective: >
  Restaurar a semântica de teclado do seletor de localidade.
authority:
  - docs/agents/DESIGN_SPEC.md
baseline:
  status: FAIL-EVIDENCED
  evidence: .visual/run-1/report.json
allowed_paths:
  - apps/web/app/components/
forbidden:
  - redesenhar navegação
acceptance:
  - a relação semântica correta vale
proof:
  - npx pnpm@11.18.0 gate
risk: acessibilidade
risk_level: R1
reviewer_must_differ_from_executor: true
retry_budget: 3
on_budget_exhausted: HUMAN_DECISION
closure:
  requires_runtime_evidence: true
`

const contractWith = (overrides: string) => `${validContract}${overrides}\n`

describe("parser de contrato", () => {
  it("lê mapa, lista, escalar folded e ignora comentário", () => {
    const parsed = parseContract(`
# comentário de linha inteira
task_id: HRN-001
objective: >
  Uma frase
  quebrada em duas linhas.
authority:
  - um
  - dois
closure:
  requires_runtime_evidence: true
retry_budget: 3
`)

    expect(parsed.task_id).toBe("HRN-001")
    expect(parsed.objective).toBe("Uma frase quebrada em duas linhas.")
    expect(parsed.authority).toEqual(["um", "dois"])
    expect(parsed.closure).toEqual({ requires_runtime_evidence: true })
    expect(parsed.retry_budget).toBe(3)
  })

  it("falha alto, com o número da linha, em vez de adivinhar", () => {
    expect(() => parseContract("task_id: X\nisto não é chave: valor\n")).toThrow(/linha 2/)
  })
})

describe("contrato completo", () => {
  it("aceita um contrato válido", () => {
    const result = validateContract(parseContract(validContract))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("cobra todo campo obrigatório de um contrato vazio", () => {
    const result = validateContract({})
    expect(result.valid).toBe(false)
    for (const field of ["objective", "baseline", "allowed_paths", "proof", "closure"]) {
      expect(result.errors.join(" ")).toContain(field)
    }
  })

  it("exige task_id no formato PREFIXO-NNN", () => {
    const result = validateContract(parseContract(validContract.replace("DS-021", "tabs")))
    expect(result.errors.join(" ")).toMatch(/task_id/)
  })
})

describe("as recusas que dão dentes ao contrato", () => {
  it("recusa baseline não medido", () => {
    const result = validateContract(
      parseContract(validContract.replace("FAIL-EVIDENCED", "UNKNOWN")),
    )
    expect(result.errors.join(" ")).toMatch(/baseline\.status/)
  })

  it("recusa allowed_paths sem fronteira", () => {
    const result = validateContract(
      parseContract(validContract.replace("- apps/web/app/components/", '- "**"')),
    )
    expect(result.errors.join(" ")).toMatch(/blast radius/)
  })

  it("recusa prova que não é executável", () => {
    const result = validateContract(
      parseContract(validContract.replace("- npx pnpm@11.18.0 gate", "- li o código")),
    )
    expect(result.errors.join(" ")).toMatch(/existir no código não é evidência/)
  })

  it("recusa revisor não independente fora de R0", () => {
    const source = validContract.replace(
      "reviewer_must_differ_from_executor: true",
      "reviewer_must_differ_from_executor: false",
    )
    expect(validateContract(parseContract(source)).errors.join(" ")).toMatch(/revisor independente/)
  })

  it("aceita revisor não independente em R0", () => {
    const source = validContract
      .replace(
        "reviewer_must_differ_from_executor: true",
        "reviewer_must_differ_from_executor: false",
      )
      .replace("risk_level: R1", "risk_level: R0")
    expect(validateContract(parseContract(source)).errors.join(" ")).not.toMatch(
      /revisor independente/,
    )
  })

  it("recusa fechamento sem evidência de runtime", () => {
    const source = validContract.replace(
      "requires_runtime_evidence: true",
      "requires_runtime_evidence: false",
    )
    expect(validateContract(parseContract(source)).errors.join(" ")).toMatch(
      /requires_runtime_evidence/,
    )
  })

  it("recusa orçamento de tentativa fora de 1..5", () => {
    const source = validContract.replace("retry_budget: 3", "retry_budget: 99")
    expect(validateContract(parseContract(source)).errors.join(" ")).toMatch(/retry_budget/)
  })

  it("recusa PASS como saída de orçamento esgotado", () => {
    const source = validContract.replace(
      "on_budget_exhausted: HUMAN_DECISION",
      "on_budget_exhausted: PASS",
    )
    expect(validateContract(parseContract(source)).errors.join(" ")).toMatch(/nunca vira PASS/)
  })
})

describe("elevação automática de risco", () => {
  it("eleva a R3 o que toca a fronteira de confiança", () => {
    const contract = parseContract(
      validContract.replace(
        "Restaurar a semântica de teclado do seletor de localidade.",
        "Ajustar as policies de RLS do perfil.",
      ),
    )
    expect(requiredRiskLevel(contract)).toBe("R3")

    const result = validateContract(contract)
    expect(result.effectiveRiskLevel).toBe("R3")
    expect(result.errors.join(" ")).toMatch(/elevação automática/)
    expect(result.errors.join(" ")).toMatch(/ADR/)
  })

  it("lê o vocabulário da RISK_MATRIX em vez de duplicá-lo", () => {
    // Duplicar a lista em código cria drift entre a régua e o validador — e faz o
    // scanner de privacidade acusar termo comercial proibido em código, com razão.
    const terms = readElevationTerms()
    expect(terms).toContain("onboarding")
    expect(terms).toContain("privacidade")
    expect(terms.length).toBeGreaterThan(10)
  })

  it("eleva a R2 o vocabulário da RISK_MATRIX", () => {
    const contract = parseContract(
      validContract.replace(
        "Restaurar a semântica de teclado do seletor de localidade.",
        "Mudar o fluxo de onboarding do convite.",
      ),
    )
    expect(requiredRiskLevel(contract)).toBe("R2")
  })

  it("não eleva pelo que a tarefa proíbe — cerca não é superfície", () => {
    const contract = parseContract(
      validContract.replace(
        "- redesenhar navegação",
        "- tocar em supabase/migrations ou em qualquer policy de RLS",
      ),
    )
    expect(requiredRiskLevel(contract)).toBe("R0")
    expect(validateContract(contract).valid).toBe(true)
  })

  it("aceita R3 declarado com ADR", () => {
    const source = contractWith("adr: docs/decisions/ADR-20260811-om-declarada.md").replace(
      "risk_level: R1",
      "risk_level: R3",
    )
    expect(validateContract(parseContract(source)).errors).toEqual([])
  })
})
