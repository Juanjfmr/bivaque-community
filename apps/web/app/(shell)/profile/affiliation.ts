// RECON-005 — Força Armada e OM opcionais no perfil (prancha 51).
//
// Contrato de dados: docs/decisions/ADR-20260908-perfil-campos-opcionais.md
// (D1–D3, aprovado 08/09/2026). Este módulo é a face pura da tela: enum
// fechado, varredura de conteúdo e a semântica das duas afordâncias. A
// persistência existe (migration 20260909020733_profile_affiliations.sql —
// `public.profile_affiliations`, uma linha por campo) e as operações de
// escrita ficam em `affiliation-actions.ts`.
//
// D2: SOMENTE Força Armada (Marinha, Exército, Aeronáutica) e OM (texto
// curto). Nenhum outro campo entra — o check do banco é a fronteira, não a
// tela.
// D3: "Exibir no perfil" OCULTA, não apaga — o rótulo nunca é "remover".
// No banco, ocultar mantém a linha com is_visible = false; apagar de verdade
// é limpar o campo (seleção vazia na Força Armada, texto vazio na OM), o que
// remove a linha. A RLS decide o que um terceiro enxerga.

import { detectCep, detectCpf } from "@bivaque/domain"

export const ARMED_FORCES = [
  { id: "marinha", label: "Marinha" },
  { id: "exercito", label: "Exército" },
  { id: "aeronautica", label: "Aeronáutica" },
] as const

export type ArmedForceId = (typeof ARMED_FORCES)[number]["id"]

// Opção explícita de esvaziamento. A D3 exige "seleção vazia na Força
// Armada" como caminho de apagar; um Select do React Aria não tem estado
// "nenhum" depois que algo foi escolhido, então o esvaziar é uma opção.
export const ARMED_FORCE_NONE_ID = "nenhuma"

// OM é texto livre curto. O limite é a primeira barreira contra o campo
// virar depósito de endereço ou dado de terceiro (ADR D2: "texto livre é
// superfície"). 80 caracteres — o mesmo teto de `profiles.display_name`.
export const OM_MAX_LENGTH = 80

export type AffiliationDraft = {
  armedForce: ArmedForceId | ""
  om: string
  armedForceVisible: boolean
  omVisible: boolean
}

// Opção conservadora da correção de 07/09: visibilidade desligada por
// padrão, valor vazio. É o rascunho inicial da tela antes da consulta a
// `profile_affiliations`; o estado carregado vem de `affiliationFromRows`.
export const EMPTY_AFFILIATION: AffiliationDraft = {
  armedForce: "",
  om: "",
  armedForceVisible: false,
  omVisible: false,
}

export function isArmedForceId(value: string): value is ArmedForceId {
  return (ARMED_FORCES as ReadonlyArray<{ id: string }>).some((force) => force.id === value)
}

// Chave vinda do Select → valor do draft. "nenhuma" e qualquer chave fora do
// enum fechado resolvem para vazio: a lista é a fronteira, não o texto.
export function armedForceFromKey(key: string | null): ArmedForceId | "" {
  if (key === null || key === ARMED_FORCE_NONE_ID) return ""
  return isArmedForceId(key) ? key : ""
}

// Validação da OM. Campo opcional: vazio sempre passa — nenhum campo
// opcional é exigido para salvar. Quando preenchido, vale o limite de
// tamanho e a mesma varredura de conteúdo proibido que o repositório já
// aplica a texto de membro (`detectCpf` + `detectCep`, `@bivaque/domain` —
// os mesmos que o compositor do feed e o fluxo de recomendações chamam).
// Retorna `null` quando aceitável, mensagem segura quando não.
export function validateOm(raw: string): string | null {
  const value = raw.trim()
  if (value.length === 0) return null
  if (value.length > OM_MAX_LENGTH) {
    return `A OM deve ter no máximo ${OM_MAX_LENGTH} caracteres.`
  }
  if (detectCpf(value)) {
    return "A OM não pode conter um CPF. Informe apenas o nome da Organização Militar."
  }
  if (detectCep(value)) {
    return "A OM não pode conter um CEP. Endereço não pertence a este campo."
  }
  return null
}

// D3 na interface: as duas afordâncias, cada uma dizendo o que faz.
export const VISIBILITY_TOGGLE_LABEL = "Exibir no perfil"
export const VISIBILITY_STATE_LABELS = { on: "Ativado", off: "Desativado" } as const

// Nota permanente do grupo (consentimento + afordância de apagar). Nunca usa
// "remover" para o toggle: ele oculta. O caminho de apagar é limpar o campo.
export const AFFILIATION_SEMANTICS_NOTE =
  "Com “Exibir no perfil” ligado, quem é da sua cidade vê o campo; desligado, " +
  "ele sai do seu perfil. Para apagar, escolha “Nenhuma” na Força Armada ou " +
  "deixe a OM em branco."

export function isAffiliationUntouched(draft: AffiliationDraft): boolean {
  return (
    draft.armedForce === "" &&
    draft.om.trim().length === 0 &&
    !draft.armedForceVisible &&
    !draft.omVisible
  )
}

// "Limpar o campo" é o apagar de verdade da D3: valor vazio carrega
// visibilidade falsa. Um valor sem visibilidade pode religar sem redigitar;
// nenhum valor fica "visível" apontando para o nada. O texto é aparado — o
// valor que a tela trata como preenchido é o que seria gravado.
export function normalizeAffiliation(draft: AffiliationDraft): AffiliationDraft {
  const om = draft.om.trim()
  return {
    ...draft,
    om,
    armedForceVisible: draft.armedForce !== "" && draft.armedForceVisible,
    omVisible: om.length > 0 && draft.omVisible,
  }
}

// Linha de `public.profile_affiliations` (uma por campo: 'armed_force' | 'om').
export type AffiliationRow = {
  field: string
  value: string
  is_visible: boolean
}

// O que voltou da consulta É o estado: para o dono a RLS devolve as duas
// linhas sempre; para um terceiro, só as visíveis. Filtrar visibilidade aqui
// de novo seria desconfiar do banco — ou, pior, recriar no cliente uma regra
// que só a RLS cumpre. Campo ausente no resultado significa linha que não
// existe (nunca informada ou apagada de verdade): valor vazio, visibilidade
// falsa. Linhas com field fora dos dois aprovados ou value fora do enum
// não deveriam existir (o check do banco as recusa); se chegarem, são
// ignoradas — a tela não exibe nem edita o que o contrato D2 não define.
export function affiliationFromRows(rows: readonly AffiliationRow[]): AffiliationDraft {
  const draft: AffiliationDraft = { ...EMPTY_AFFILIATION }
  for (const row of rows) {
    if (row.field === "armed_force" && isArmedForceId(row.value)) {
      draft.armedForce = row.value
      draft.armedForceVisible = row.is_visible
    } else if (row.field === "om") {
      draft.om = row.value
      draft.omVisible = row.is_visible
    }
  }
  return draft
}
