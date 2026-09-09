// RECON-005 — prova do contrato de afiliação da prancha 51 (ADR-20260908).
// O Vitest da casa roda em node, sem DOM, então a prova é no módulo puro que a
// tela importa — exatamente a convenção de `inicio-recon.test.tsx` (RECON-002).
// Cada via tem positivo e negativo: aceitar OM legítima não prova nada sobre
// rejeitar CPF; default desligado não prova que limpar o campo oculta.

import { describe, expect, it } from "vitest"
import {
  AFFILIATION_SEMANTICS_NOTE,
  type AffiliationDraft,
  type AffiliationRow,
  ARMED_FORCE_NONE_ID,
  ARMED_FORCES,
  affiliationFromRows,
  armedForceFromKey,
  EMPTY_AFFILIATION,
  isAffiliationUntouched,
  isArmedForceId,
  normalizeAffiliation,
  OM_MAX_LENGTH,
  VISIBILITY_STATE_LABELS,
  VISIBILITY_TOGGLE_LABEL,
  validateOm,
} from "web/app/(shell)/profile/affiliation"

const touchedOmittedCopy: string[] = [
  VISIBILITY_TOGGLE_LABEL,
  VISIBILITY_STATE_LABELS.on,
  VISIBILITY_STATE_LABELS.off,
  AFFILIATION_SEMANTICS_NOTE,
]

describe("D2 — Força Armada é enum fechado, só os três aprovados", () => {
  it("expõe exatamente Marinha, Exército e Aeronáutica", () => {
    expect(ARMED_FORCES.map((force) => force.id)).toEqual(["marinha", "exercito", "aeronautica"])
    expect(ARMED_FORCES.map((force) => force.label)).toEqual(["Marinha", "Exército", "Aeronáutica"])
  })

  it("aceita cada chave válida (positivo)", () => {
    expect(isArmedForceId("marinha")).toBe(true)
    expect(isArmedForceId("exercito")).toBe(true)
    expect(isArmedForceId("aeronautica")).toBe(true)
  })

  it("rejeita qualquer valor fora do enum — inclusive patente (negativo)", () => {
    expect(isArmedForceId("general")).toBe(false)
    expect(isArmedForceId("capitao")).toBe(false)
    expect(isArmedForceId("")).toBe(false)
  })

  it("a opção 'Nenhuma' esvazia a seleção — o caminho de apagar da D3", () => {
    expect(armedForceFromKey(ARMED_FORCE_NONE_ID)).toBe("")
    expect(armedForceFromKey("exercito")).toBe("exercito")
    expect(armedForceFromKey("quartel-general-do-bairro")).toBe("")
    expect(armedForceFromKey(null)).toBe("")
  })
})

describe("D3 — visibilidade desligada por padrão", () => {
  it("o rascunho inicial tem os dois controles off e os campos vazios", () => {
    expect(EMPTY_AFFILIATION.armedForce).toBe("")
    expect(EMPTY_AFFILIATION.om).toBe("")
    expect(EMPTY_AFFILIATION.armedForceVisible).toBe(false)
    expect(EMPTY_AFFILIATION.omVisible).toBe(false)
  })
})

describe("D2 — OM é texto curto com a varredura de conteúdo do repositório", () => {
  it("vazio é aceito: campo opcional, nada é exigido para salvar", () => {
    expect(validateOm("")).toBeNull()
    expect(validateOm("   ")).toBeNull()
  })

  it("nome legítimo de organização passa (positivo)", () => {
    expect(validateOm("65º Batalhão de Infantaria Motorizado")).toBeNull()
  })

  it("estoura o limite de tamanho (negativo)", () => {
    expect(validateOm("a".repeat(OM_MAX_LENGTH))).toBeNull()
    expect(validateOm("a".repeat(OM_MAX_LENGTH + 1))).toMatch(/no máximo 80 caracteres/)
  })

  it("bloqueia CPF formatado e sem pontuação — detectCpf, o scan da casa", () => {
    expect(validateOm("Unidade 529.982.247-25")).toMatch(/CPF/)
    expect(validateOm("52998224725")).toMatch(/CPF/)
  })

  it("bloqueia CEP — endereço não entra por este campo", () => {
    expect(validateOm("Depósito 69030-180")).toMatch(/CEP/)
  })

  it("não bloqueia dez-onzes dígitos que não são CPF (mesma régua do scan)", () => {
    expect(validateOm("12345678901")).toBeNull()
  })
})

describe("D3 — ocultar e apagar são afordâncias distintas, e o toggle não apaga", () => {
  it("o controle se chama 'Exibir no perfil' e nenhum texto dele diz 'remover'", () => {
    expect(VISIBILITY_TOGGLE_LABEL).toBe("Exibir no perfil")
    for (const copy of touchedOmittedCopy) {
      expect(copy.toLowerCase()).not.toMatch(/remov/)
    }
  })

  it("limpar o campo força a visibilidade a falso — o apagar de verdade", () => {
    const cleared = normalizeAffiliation({
      armedForce: "",
      om: "  ",
      armedForceVisible: true,
      omVisible: true,
    })
    expect(cleared).toEqual(EMPTY_AFFILIATION)
  })

  it("valor presente mantém a visibilidade escolhida — ocultar não apaga (positivo)", () => {
    const kept = normalizeAffiliation({
      armedForce: "marinha",
      om: "NM",
      armedForceVisible: true,
      omVisible: false,
    })
    expect(kept.armedForceVisible).toBe(true)
    expect(kept.omVisible).toBe(false)
    expect(kept.om).toBe("NM")
  })

  it("toggle ligado sem valor não deixa nada 'visível' apontando para o nada", () => {
    const draft = normalizeAffiliation({
      armedForce: "",
      om: "   ",
      armedForceVisible: true,
      omVisible: true,
    })
    expect(draft.armedForceVisible).toBe(false)
    expect(draft.omVisible).toBe(false)
  })
})

describe("D1 entregue — o estado carregado vem das linhas de profile_affiliations", () => {
  it("sem nenhuma linha, o rascunho carregado é o vazio honesto", () => {
    expect(affiliationFromRows([])).toEqual(EMPTY_AFFILIATION)
  })

  it("linha por campo: valor e visibilidade chegam ao rascunho (positivo)", () => {
    const rows: AffiliationRow[] = [
      { field: "armed_force", value: "marinha", is_visible: true },
      { field: "om", value: "NM - 1º Distrito Naval", is_visible: false },
    ]
    expect(affiliationFromRows(rows)).toEqual({
      armedForce: "marinha",
      om: "NM - 1º Distrito Naval",
      armedForceVisible: true,
      omVisible: false,
    })
  })

  it("campo oculto chega sem linha nenhuma ao terceiro — e nada é inventado", () => {
    // RLS devolve só a linha visível; o campo ausente permanece vazio/off,
    // não "oculto com valor fantasma".
    const rows: AffiliationRow[] = [{ field: "om", value: "65º BI Mtz", is_visible: true }]
    const draft = affiliationFromRows(rows)
    expect(draft.om).toBe("65º BI Mtz")
    expect(draft.armedForce).toBe("")
    expect(draft.armedForceVisible).toBe(false)
  })

  it("linha com field ou value fora do contrato D2 é ignorada, não exibida", () => {
    const rows: AffiliationRow[] = [
      { field: "patente", value: "general", is_visible: true },
      { field: "armed_force", value: "general", is_visible: true },
      { field: "om", value: "Comando", is_visible: true },
    ]
    const draft = affiliationFromRows(rows)
    expect(draft.armedForce).toBe("")
    expect(draft.om).toBe("Comando")
    expect(Object.keys(draft).sort()).toEqual([
      "armedForce",
      "armedForceVisible",
      "om",
      "omVisible",
    ])
  })
})

describe("após salvar — feedback só quando o grupo foi tocado", () => {
  it("rascunho vazio é 'intocado': sem sucesso nem erro além do nome", () => {
    expect(isAffiliationUntouched(EMPTY_AFFILIATION)).toBe(true)
  })

  it("qualquer valor ou visibilidade conta como tocado", () => {
    const variants: AffiliationDraft[] = [
      { ...EMPTY_AFFILIATION, armedForce: "exercito" },
      { ...EMPTY_AFFILIATION, om: "65º BI Mtz" },
      { ...EMPTY_AFFILIATION, armedForceVisible: true },
      { ...EMPTY_AFFILIATION, omVisible: true },
    ]
    for (const variant of variants) {
      expect(isAffiliationUntouched(variant)).toBe(false)
    }
  })

  it("nenhuma copy restante do grupo promete 'não salvo' ou diz 'remover' para o toggle", () => {
    for (const copy of touchedOmittedCopy) {
      expect(copy.toLowerCase()).not.toMatch(/remov/)
      expect(copy).not.toMatch(/ainda não armazena|não foram salvos/)
    }
  })
})
