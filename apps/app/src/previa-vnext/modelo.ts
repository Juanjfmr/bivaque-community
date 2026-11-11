import type { NomeDeIcone } from "@/lib/icones"

/**
 * Fixtures de laboratório — não vêm do banco e não são publicações reais.
 * Os MESMOS itens alimentam as composições A (exploração) e B (busca).
 */
export type TipoDeItem = "pergunta" | "negocio" | "imovel" | "evento"
export type TipoDeFiltro = TipoDeItem | "todos"
export type Cenario = "completo" | "escasso" | "vazio" | "carregando" | "erro"

export type ItemDeExemplo = Readonly<{
  id: string
  tipo: TipoDeItem
  titulo: string
  resumo: string
  contexto: string
  local: string
  icone: NomeDeIcone
}>

export const ITENS_DE_EXEMPLO: readonly ItemDeExemplo[] = [
  {
    id: "p-escola",
    tipo: "pergunta",
    titulo: "Como escolher uma escola ao chegar a Manaus?",
    resumo: "Uma pergunta de demonstração sobre matrículas e rotina da família.",
    contexto: "Comunidade · perguntas da cidade",
    local: "Manaus",
    icone: "forum",
  },
  {
    id: "p-eletricista",
    tipo: "pergunta",
    titulo: "Como pedir indicação de eletricista no Parque Dez?",
    resumo: "Exemplo de uma necessidade da casa que pode ser respondida pela comunidade.",
    contexto: "Comunidade · indicações",
    local: "Parque Dez",
    icone: "forum",
  },
  {
    id: "n-reparos",
    tipo: "negocio",
    titulo: "Reparos e manutenção residencial",
    resumo: "Ficha ilustrativa de serviço. Nenhuma indicação ou avaliação foi verificada.",
    contexto: "Negócios · casa e reparos",
    local: "Manaus",
    icone: "build",
  },
  {
    id: "n-mudanca",
    tipo: "negocio",
    titulo: "Mudanças e transporte",
    resumo: "Exemplo de prestador a localizar por necessidade, sem telefone ou preço fictício.",
    contexto: "Negócios · mudança",
    local: "Manaus",
    icone: "local_shipping",
  },
  {
    id: "i-apto",
    tipo: "imovel",
    titulo: "Apartamento de dois quartos",
    resumo: "Anúncio ilustrativo; endereço e disponibilidade não foram fornecidos.",
    contexto: "Mercado · moradia",
    local: "Parque Dez",
    icone: "apartment",
  },
  {
    id: "i-casa",
    tipo: "imovel",
    titulo: "Casa para locação",
    resumo: "Anúncio ilustrativo sem valor ou localização exata.",
    contexto: "Mercado · moradia",
    local: "Manaus",
    icone: "home_work",
  },
  {
    id: "e-corrida",
    tipo: "evento",
    titulo: "Encontro de corrida",
    resumo: "Exemplo de encontro local; data e horário não foram confirmados.",
    contexto: "Eventos · atividade",
    local: "Ponta Negra",
    icone: "directions_run",
  },
  {
    id: "e-chegada",
    tipo: "evento",
    titulo: "Roda de conversa para recém-chegados",
    resumo: "Exemplo de encontro para conhecer a cidade e trocar informações.",
    contexto: "Eventos · convivência",
    local: "Manaus",
    icone: "event",
  },
]

export const TIPOS: readonly Readonly<{
  id: TipoDeFiltro
  rotulo: string
  icone: NomeDeIcone
}>[] = [
  { id: "todos", rotulo: "Tudo", icone: "search" },
  { id: "pergunta", rotulo: "Perguntas", icone: "forum" },
  { id: "negocio", rotulo: "Serviços", icone: "build" },
  { id: "imovel", rotulo: "Moradia", icone: "apartment" },
  { id: "evento", rotulo: "Encontros", icone: "event" },
]

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

export function filtrarExemplos(
  itens: readonly ItemDeExemplo[],
  opcoes: Readonly<{ busca: string; tipo: TipoDeFiltro; cenario: Cenario }>,
): readonly ItemDeExemplo[] {
  if (opcoes.cenario === "vazio" || opcoes.cenario === "erro" || opcoes.cenario === "carregando") return []
  const exemplos =
    opcoes.cenario === "escasso"
      ? itens.filter((item) => item.id === "p-escola" || item.id === "n-reparos")
      : itens
  const busca = normalizarBusca(opcoes.busca)
  return exemplos.filter(
    (item) =>
      (opcoes.tipo === "todos" || item.tipo === opcoes.tipo) &&
      (busca === "" ||
        normalizarBusca([item.titulo, item.resumo, item.local, item.contexto].join(" ")).includes(
          busca,
        )),
  )
}

export function separarPorTipo(
  itens: readonly ItemDeExemplo[],
): Readonly<Record<TipoDeItem, readonly ItemDeExemplo[]>> {
  return {
    pergunta: itens.filter((item) => item.tipo === "pergunta"),
    negocio: itens.filter((item) => item.tipo === "negocio"),
    imovel: itens.filter((item) => item.tipo === "imovel"),
    evento: itens.filter((item) => item.tipo === "evento"),
  }
}
