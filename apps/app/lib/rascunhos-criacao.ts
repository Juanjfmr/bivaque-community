import { idLocal } from "@/lib/id"

/**
 * Conteúdo de ensaio: não representa publicação, pedido ativo, evento confirmado,
 * estabelecimento verificado nem indicação enviada a outro membro.
 */
export const TIPOS_RASCUNHO = [
  "create-request",
  "create-item",
  "indicate",
  "create-event",
  "my-biz",
] as const

export type TipoRascunho = (typeof TIPOS_RASCUNHO)[number]

export const DEFINICOES_CRIAR: Record<
  TipoRascunho,
  {
    titulo: string
    nome: string
    contexto: string
    principal: string
    detalhe: string
    secundario: string
    exemplo: string
  }
> = {
  "create-request": {
    titulo: "Pedir um serviço",
    nome: "Pedido de serviço",
    contexto:
      "Descreva a necessidade para comparar empresas locais quando o serviço estiver disponível.",
    principal: "Qual serviço você precisa?",
    detalhe: "Descreva o serviço",
    secundario: "Bairro de atendimento",
    exemplo: "Instalação de ar-condicionado",
  },
  "create-item": {
    titulo: "Anunciar desapego",
    nome: "Desapego",
    contexto: "Descreva o item, preço e condições. É apenas um rascunho, não um anúncio público.",
    principal: "Qual item quer anunciar?",
    detalhe: "Estado de conservação e retirada",
    secundario: "Bairro de retirada",
    exemplo: "Mesa de jantar com quatro cadeiras",
  },
  indicate: {
    titulo: "Indicar negócio",
    nome: "Indicação de negócio",
    contexto: "Registre sua indicação de confiança, sem cadastrar o negócio em nome de terceiros.",
    principal: "Nome do estabelecimento",
    detalhe: "Por que você recomenda?",
    secundario: "Categoria ou especialidade",
    exemplo: "Oficina de confiança",
  },
  "create-event": {
    titulo: "Criar encontro",
    nome: "Encontro",
    contexto:
      "Planeje um encontro para a comunidade. Nenhum convite será enviado nesta demonstração.",
    principal: "Nome do encontro",
    detalhe: "O que será feito?",
    secundario: "Local do encontro",
    exemplo: "Café de boas-vindas",
  },
  "my-biz": {
    titulo: "Divulgar meu negócio",
    nome: "Meu negócio",
    contexto: "Prepare a apresentação do seu serviço. O perfil não ficará público nesta sessão.",
    principal: "Nome do negócio",
    detalhe: "Serviços oferecidos",
    secundario: "Área de atuação",
    exemplo: "Reparos e manutenção residencial",
  },
}

export type RascunhoCriacao = {
  id: string
  tipo: TipoRascunho
  cidade: string
  titulo: string
  complemento: string
  descricao: string
  valor: number | null
  horario: string | null
  criadoEm: string
}

type Formulario = Pick<
  RascunhoCriacao,
  "titulo" | "complemento" | "descricao" | "valor" | "horario"
>

function chave(cidade: string): string {
  return `bivaque:criacao-rascunhos:${cidade.trim().toLocaleLowerCase("pt-BR")}`
}

function valido(item: unknown): item is RascunhoCriacao {
  if (typeof item !== "object" || item === null || Array.isArray(item)) return false
  const x = item as Record<string, unknown>
  return (
    typeof x["id"] === "string" &&
    x["id"].startsWith("rascunho-criacao-") &&
    TIPOS_RASCUNHO.some((t) => t === x["tipo"]) &&
    typeof x["cidade"] === "string" &&
    typeof x["titulo"] === "string" &&
    typeof x["complemento"] === "string" &&
    typeof x["descricao"] === "string" &&
    (x["valor"] === null || (typeof x["valor"] === "number" && Number.isFinite(x["valor"]))) &&
    (x["horario"] === null || typeof x["horario"] === "string") &&
    typeof x["criadoEm"] === "string"
  )
}

export function lerRascunhosCriacao(cidade: string): RascunhoCriacao[] {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(chave(cidade)) ?? "[]")
    return Array.isArray(parsed)
      ? parsed.filter((item): item is RascunhoCriacao => valido(item) && item.cidade === cidade)
      : []
  } catch {
    return []
  }
}

export function criarRascunhoCriacao(
  cidade: string,
  tipo: TipoRascunho,
  formulario: Formulario,
): RascunhoCriacao | "limite" | null {
  if (!TIPOS_RASCUNHO.includes(tipo)) return null
  const titulo = formulario.titulo.trim()
  const complemento = formulario.complemento.trim()
  const descricao = formulario.descricao.trim()
  if (
    titulo.length < 5 ||
    titulo.length > 120 ||
    complemento.length < 2 ||
    complemento.length > 100 ||
    descricao.length < 10 ||
    descricao.length > 1200 ||
    (tipo === "create-item" && (formulario.valor === null || formulario.valor <= 0)) ||
    (tipo === "create-event" &&
      (!formulario.horario || Number.isNaN(Date.parse(formulario.horario)))) ||
    (formulario.valor !== null && (!Number.isFinite(formulario.valor) || formulario.valor < 0))
  )
    return null
  const item: RascunhoCriacao = {
    id: idLocal("rascunho-criacao-"),
    tipo,
    cidade,
    titulo,
    complemento,
    descricao,
    valor: formulario.valor,
    horario: formulario.horario,
    criadoEm: new Date().toISOString(),
  }
  try {
    const anteriores = lerRascunhosCriacao(cidade)
    if (anteriores.length >= 30) return "limite"
    window.sessionStorage.setItem(chave(cidade), JSON.stringify([item, ...anteriores]))
    return item
  } catch {
    return null
  }
}

export function excluirRascunhoCriacao(cidade: string, id: string): boolean {
  try {
    window.sessionStorage.setItem(
      chave(cidade),
      JSON.stringify(lerRascunhosCriacao(cidade).filter((item) => item.id !== id)),
    )
    return true
  } catch {
    return false
  }
}
