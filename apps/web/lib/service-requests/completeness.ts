// RECON-024 — a completude da ficha é calculada sobre CAMPOS QUE EXISTEM.
// reviewNote da prancha 23: "exibir telefone continua opcional e não pode ser
// condição de ficha completa". Cada item abaixo testa uma coluna/tabela real:
// provider_profiles.bio, provider_catalog_items, provider_reach,
// provider_portfolio_photos e provider_profiles.contact_phone.

export interface FichaCompletenessInput {
  bio: string | null
  catalogCount: number
  reachCount: number
  portfolioCount: number
  contactPhone: string | null
}

export interface FichaChecklistItem {
  key: "descricao" | "servicos" | "regioes" | "fotos" | "contato"
  label: string
  /** true quando o campo obrigatório está informado. Contato é sempre `true`. */
  done: boolean
  /** rótulo da coluna de estado, igual ao "Informado" da prancha 23. */
  detail: string
  actionHref: string
}

export interface FichaCompleteness {
  items: FichaChecklistItem[]
  complete: boolean
  /** Primeira pendência OBRIGATÓRIA; `null` quando só resta o contato opcional. */
  pending: { text: string; actionHref: string } | null
}

export function computeFichaCompleteness(input: FichaCompletenessInput): FichaCompleteness {
  const hasBio = (input.bio ?? "").trim().length > 0
  const hasServices = input.catalogCount > 0
  const hasReach = input.reachCount > 0
  const hasPhotos = input.portfolioCount > 0
  const hasPhone = (input.contactPhone ?? "").trim().length > 0

  const items: FichaChecklistItem[] = [
    {
      key: "descricao",
      label: "Descrição do negócio",
      done: hasBio,
      detail: hasBio ? "Informado" : "Pendente",
      actionHref: "/prestador/ficha",
    },
    {
      key: "servicos",
      label: "Serviços cadastrados",
      done: hasServices,
      detail: hasServices ? "Informado" : "Pendente",
      actionHref: "/prestador/catalogo",
    },
    {
      key: "regioes",
      label: "Regiões de atendimento",
      done: hasReach,
      detail: hasReach ? "Informado" : "Pendente",
      actionHref: "/prestador/atendimento",
    },
    {
      key: "fotos",
      label: "Fotos do negócio",
      done: hasPhotos,
      detail: hasPhotos ? "Informado" : "Pendente",
      actionHref: "/prestador/catalogo",
    },
    {
      // Opcional por decisão de produto (ADR-20260820, decisão 6). Nunca é
      // pendência e nunca marca a ficha como incompleta.
      key: "contato",
      label: "Formas de contato",
      done: true,
      detail: hasPhone ? "Informado" : "Adicione telefone e WhatsApp",
      actionHref: "/prestador/conta",
    },
  ]

  const firstMissing = items.find((item) => item.key !== "contato" && !item.done) ?? null

  return {
    items,
    complete: firstMissing === null,
    pending:
      firstMissing === null
        ? null
        : {
            text: `Falta ${pendingAction(firstMissing.key)}`,
            actionHref: firstMissing.actionHref,
          },
  }
}

function pendingAction(key: FichaChecklistItem["key"]): string {
  switch (key) {
    case "descricao":
      return "descrever o negócio"
    case "servicos":
      return "cadastrar seus serviços"
    case "regioes":
      return "informar onde você atende"
    case "fotos":
      return "adicionar fotos do negócio"
    case "contato":
      return "informar contato"
  }
}
