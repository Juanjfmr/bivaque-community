import { describe, expect, it } from "vitest"
import {
  parseContract,
  readElevationTerms,
  readR3Terms,
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

  it("trata `#` como conteúdo dentro de escalar em bloco", () => {
    // O stripper de comentário truncava `objective: > … issue #42 …` em silêncio, e o
    // contrato truncado ainda passava na validação: o validador aprovava OUTRO
    // contrato. Interpretar errado é o que este parser existe para recusar.
    const parsed = parseContract(`task_id: DS-042
objective: >
  Corrigir o seletor descrito na issue #42 do repositório.
`)
    expect(parsed.objective).toContain("#42")
    expect(parsed.objective).toContain("do repositório.")
  })

  it("mantém o comentário fora do bloco: linha inteira e cauda de chave", () => {
    const parsed = parseContract(`# comentário de linha inteira
task_id: DS-042
risk: acessibilidade  # rótulo, não valor
`)
    expect(parsed.task_id).toBe("DS-042")
    expect(parsed.risk).toBe("acessibilidade")
  })

  it("remove comentário de cauda em valor entre aspas, e preserva `#` dentro delas", () => {
    // O stripper de linha se desliga quando há aspas, então a cauda sobrava DENTRO do
    // valor: `objective: "texto"  # nota` virava o literal com aspas e comentário, e
    // passava calado — o mesmo "interpretar errado" do caso sem aspas.
    const parsed = parseContract(`task_id: DS-042
objective: "Corrigir o seletor"  # comentário de cauda
acceptance:
  - "trata o caso #42"
`)
    expect(parsed.objective).toBe("Corrigir o seletor")
    expect(parsed.acceptance).toEqual(["trata o caso #42"])
  })

  it("para alto em aspas não fechadas, com o número da linha", () => {
    expect(() => parseContract('objective: "sem fechar\n')).toThrow(/linha 1.*mal formado/)
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

  it("aplica o teto padrão quando o contrato não declara orçamento", () => {
    // A tabela do TASK_CONTRACT.md promete "padrão 3". Sem aplicar o default, um
    // contrato sem `retry_budget` passava sem teto nenhum — régua prometendo o que
    // o validador não entregava.
    const source = validContract.replace("retry_budget: 3\n", "")
    const parsed = parseContract(source)
    expect(parsed.retry_budget).toBeUndefined()

    const result = validateContract(parsed)
    expect(result.valid).toBe(true)
    expect(result.effectiveRetryBudget).toBe(3)
  })

  it("preserva o orçamento declarado quando ele existe", () => {
    const source = validContract.replace("retry_budget: 3", "retry_budget: 5")
    expect(validateContract(parseContract(source)).effectiveRetryBudget).toBe(5)
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

describe("contrato bloqueado", () => {
  it("aceita um contrato que declara o que impede a prova", () => {
    const source = contractWith("blocked_by: test:secrets vermelho por achado pré-existente")
    const result = validateContract(parseContract(source))
    expect(result.valid).toBe(true)
    expect(result.blocked).toBe(true)
  })

  it("não marca bloqueio quando o campo está ausente", () => {
    expect(validateContract(parseContract(validContract)).blocked).toBe(false)
  })

  it("recusa blocked_by vazio — bloqueio sem causa não é registro", () => {
    const source = contractWith('blocked_by: ""')
    expect(validateContract(parseContract(source)).errors.join(" ")).toMatch(/blocked_by/)
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

  it("casa termo por palavra, não por pedaço de palavra", () => {
    // `includes` fazia "rls" casar com "urls", "secret" com "secretaria" e "auth" com
    // "author": um contrato R1 falando em URLs de compartilhamento virava R3 e passava
    // a exigir ADR que ninguém precisava assinar.
    expect(requiredRiskLevel({ objective: "Expor URLs de compartilhamento no perfil" })).toBe("R0")
    expect(requiredRiskLevel({ objective: "Ajustar o rótulo da secretaria" })).toBe("R0")
    expect(requiredRiskLevel({ objective: "Mostrar o author do post no card" })).toBe("R0")
  })

  it("eleva o schema private sem exigir o ponto literal", () => {
    // O termo era "private." — com ponto. A forma que o AGENTS.md usa é "schema
    // `private`", então o caso que MAIS precisa de R3 passava como R0.
    expect(requiredRiskLevel({ objective: "Ler uma função do schema private" })).toBe("R3")
    expect(requiredRiskLevel({ objective: "Ajustar as policies de RLS do perfil" })).toBe("R3")
  })

  it("preserva o plural regular ao casar por palavra", () => {
    expect(requiredRiskLevel({ objective: "Refazer o fluxo de convites" })).toBe("R2")
    expect(requiredRiskLevel({ objective: "Revisar os acessos do grupo" })).toBe("R2")
  })

  it("cobre o plural irregular em -ão, que é metade do vocabulário", () => {
    // Sufixo `-s`/`-es` no fim do termo deixava "notificações" escapar enquanto
    // "notificação" subia. O plural é como se escreve objetivo de verdade, então a
    // assimetria deixava trabalho de produto passar com risco abaixo do devido.
    expect(requiredRiskLevel({ objective: "Refazer as notificações de grupo" })).toBe("R2")
    expect(requiredRiskLevel({ objective: "Mudar as retenções dos posts" })).toBe("R2")
    // A flexão vale nos dois níveis: "monetizações" é R3 porque a matriz põe
    // monetização na linha R3, não porque o plural mudou de faixa.
    expect(requiredRiskLevel({ objective: "Discutir as monetizações" })).toBe("R3")
  })

  it("flexiona a cabeça do termo composto, não a cauda", () => {
    // "recuperação de conta" pluraliza como "recuperações de conta": sufixo no fim
    // do termo nunca casaria.
    expect(requiredRiskLevel({ objective: "Rever as recuperações de conta" })).toBe("R2")
    expect(requiredRiskLevel({ objective: "Tratar exclusões de escopo" })).toBe("R2")
  })

  it("eleva a R3 o que a linha R3 da matriz nomeia, não só a R2", () => {
    // A lista de elevação automática é piso ("at least R2"), não teto. Pagamento,
    // monetização e verificação de identidade estão na linha R3 da matriz, e ficavam
    // em R2 ou R0 — dispensando ADR e security-auditor no que a matriz mais protege.
    expect(requiredRiskLevel({ objective: "Mudar a monetização do grupo" })).toBe("R3")
    expect(requiredRiskLevel({ objective: "Definir o pricing do plano" })).toBe("R3")
    expect(requiredRiskLevel({ objective: "Adicionar pagamento no perfil" })).toBe("R3")
    expect(requiredRiskLevel({ objective: "Rever a verificação de identidade" })).toBe("R3")
  })

  it("lê os termos R3 da matriz, como os de elevação", () => {
    const terms = readR3Terms()
    expect(terms).toContain("pagamento")
    expect(terms).toContain("verificação de identidade")
    expect(terms.length).toBeGreaterThan(5)
  })

  it("aceita R3 declarado com ADR", () => {
    const source = contractWith("adr: docs/decisions/ADR-20260811-om-declarada.md").replace(
      "risk_level: R1",
      "risk_level: R3",
    )
    expect(validateContract(parseContract(source)).errors).toEqual([])
  })
})
