// Memória de indicações (ADR-20260925-memoria-de-indicacoes).
//
// Módulo puro: rótulos, categoria sugerida pelo texto e endereços. A tela de
// Indicações, a Comunidade e os links vindos de notificação, salvos, denúncia e
// Guia usam as mesmas funções — um pedido tem UM endereço.

import type { Database } from "supabase/database.generated"

export type IndicationCategory = Database["public"]["Enums"]["recommendation_category"]

export type IndicationRow = Database["public"]["Functions"]["list_indications"]["Returns"][number]

export const INDICATION_CATEGORIES: ReadonlyArray<{ id: IndicationCategory; label: string }> = [
  { id: "saude_bem_estar", label: "Saúde" },
  { id: "servicos_locais", label: "Serviços" },
  { id: "educacao", label: "Educação" },
  { id: "moradia", label: "Moradia" },
  { id: "transporte", label: "Transporte e mudança" },
  { id: "alimentacao", label: "Comer e comprar" },
  { id: "esporte_lazer", label: "Esporte e lazer" },
  { id: "outros", label: "Outros" },
]

export function categoryLabel(category: IndicationCategory): string {
  return INDICATION_CATEGORIES.find((item) => item.id === category)?.label ?? "Outros"
}

/** Busca antes de perguntar só dispara a partir daqui: menos é ruído. */
export const INDICATION_SEARCH_MIN_CHARS = 3
/** Espera depois da última tecla antes de consultar. */
export const INDICATION_SEARCH_DEBOUNCE_MS = 300
/** Quantos pedidos parecidos aparecem enquanto se escreve. */
export const INDICATION_SIMILAR_LIMIT = 5
/** Página da lista de indicações. */
export const INDICATION_PAGE_SIZE = 20
/** Título do pedido: o mesmo intervalo do CHECK do banco. */
export const INDICATION_TITLE_MIN = 3
export const INDICATION_TITLE_MAX = 200

export function indicationHref(requestId: string): string {
  return `/indicacoes/${requestId}`
}

/** Destino de "Pedir uma indicação": a caixa de pedir já aberta e focada. */
export const ASK_INDICATION_HREF = "/indicacoes?pedir=1"

// Palavras que denunciam a categoria. Sem acento e em minúsculas: o texto é
// normalizado antes. A primeira categoria com palavra encontrada vence, então
// a ordem da lista é a ordem de prioridade (saúde antes de serviço: "dentista
// para criança" é saúde, não educação).
const CATEGORY_HINTS: ReadonlyArray<readonly [IndicationCategory, readonly string[]]> = [
  [
    "saude_bem_estar",
    [
      "medic",
      "pediatr",
      "dentist",
      "odonto",
      "clinic",
      "hospital",
      "psicolog",
      "fisioterap",
      "ortoped",
      "ginecolog",
      "dermatolog",
      "oftalmolog",
      "cardiolog",
      "nutricion",
      "fusex",
      "exame",
      "laboratori",
      "farmacia",
      "terapeut",
      "fonoaudiolog",
    ],
  ],
  [
    "transporte",
    ["mudanca", "transportadora", "frete", "carreto", "despachante", "uber", "onibus", "pcs"],
  ],
  [
    "educacao",
    [
      "escola",
      "colegio",
      "creche",
      "professor",
      "aula",
      "curso",
      "reforco",
      "faculdade",
      "bilingue",
    ],
  ],
  [
    "moradia",
    ["aluguel", "apartamento", "imobiliaria", "condominio", "casa para", "morar", "bairro"],
  ],
  [
    "alimentacao",
    [
      "restaurante",
      "padaria",
      "mercado",
      "peixaria",
      "acougue",
      "feira",
      "comida",
      "pizza",
      "bolo",
    ],
  ],
  [
    "esporte_lazer",
    ["natacao", "academia", "futebol", "judo", "jiu", "danca", "passeio", "parque", "praia"],
  ],
  [
    "servicos_locais",
    [
      "eletricista",
      "encanador",
      "diarista",
      "faxina",
      "pedreiro",
      "pintor",
      "mecanic",
      "oficina",
      "chaveiro",
      "costureira",
      "manicure",
      "cabeleireir",
      "barbeiro",
      "marceneiro",
      "ar condicionado",
      "tecnico",
      "conserto",
      "revisao",
    ],
  ],
]

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** Categoria provável do pedido; `null` quando nada no texto indica uma. */
export function suggestCategory(text: string): IndicationCategory | null {
  const plain = normalize(text)
  for (const [category, hints] of CATEGORY_HINTS) {
    if (hints.some((hint) => plain.includes(hint))) return category
  }
  return null
}

/** O pedido está pronto para publicar? Devolve o motivo quando não está. */
export function titleProblem(title: string): string | null {
  const length = title.trim().length
  if (length < INDICATION_TITLE_MIN) return "Escreva o que você procura."
  if (length > INDICATION_TITLE_MAX) {
    return `Encurte o pedido para até ${INDICATION_TITLE_MAX} caracteres.`
  }
  return null
}

export type IndicationStatus = "resolvido" | "respondido" | "sem_resposta"

export function indicationStatus(
  row: Pick<IndicationRow, "is_resolved" | "reply_count">,
): IndicationStatus {
  if (row.is_resolved) return "resolvido"
  return row.reply_count > 0 ? "respondido" : "sem_resposta"
}

export const STATUS_LABELS: Record<IndicationStatus, string> = {
  resolvido: "Resolvido",
  respondido: "Respondido",
  sem_resposta: "Sem resposta",
}

/** "há 3 dias", "hoje", "ontem" — o suficiente para julgar se a dica é atual. */
export function relativeAge(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "hoje"
  if (days === 1) return "ontem"
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? "há 1 mês" : `há ${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? "há 1 ano" : `há ${years} anos`
}
