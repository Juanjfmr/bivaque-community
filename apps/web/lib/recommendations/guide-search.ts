// DS-006 (prancha 45) — busca no Guia dentro do pedido de indicação.
//
// O Guia não tem RPC de busca: a leitura é o SELECT direto em
// `arrival_guide_entries` filtrado por localidade e `status = 'approved'` (o
// mesmo caminho de (shell)/guide/page.tsx:122-128), e o termo é aplicado em
// memória sobre `name`/`description` (:247-256). Nada de função nova.
//
// O que este módulo guarda é só a parte pura — o filtro e o rótulo da
// contagem — para ela ser verificável sem navegador. A leitura e a RLS
// continuam no componente, onde o cliente do Supabase vive.

/** Tradução do enum public.arrival_guide_category (guide/page.tsx:47-52). */
export const GUIDE_CATEGORY_LABELS: Record<string, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

export interface GuideSearchEntry {
  id: string
  name: string
  description: string | null
  category: string
}

export function normalizeGuideTerm(term: string): string {
  return term.trim().toLowerCase()
}

/**
 * O termo vazio não devolve o acervo inteiro: sem pergunta não há resultado, e
 * uma lista completa aqui pareceria resposta para algo que ninguém perguntou.
 */
export function filterGuideEntries<T extends GuideSearchEntry>(entries: T[], term: string): T[] {
  const normalized = normalizeGuideTerm(term)
  if (!normalized) return []
  return entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(normalized) ||
      (entry.description ?? "").toLowerCase().includes(normalized),
  )
}

/** Contagem da prancha 45 ("3 resultados no Guia"), com singular e zero reais. */
export function guideResultCountLabel(count: number): string {
  if (count === 0) return "Nenhum resultado no Guia"
  if (count === 1) return "1 resultado no Guia"
  return `${count} resultados no Guia`
}
