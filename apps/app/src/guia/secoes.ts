import type { NomeDeIcone } from "@/lib/icones"

/**
 * A estrutura editorial do Guia: os passos de chegada e as seções que os
 * organizam.
 *
 * O Guia deixou de ser uma pilha única: cada seção tem âncora própria no
 * cabeçalho fixo, e o título da seção em leitura é o que a barra anuncia
 * durante a rolagem. Cada passo mora em uma seção e em uma só, e a ordem aqui é
 * a ordem da tela.
 */

export type Passo = Readonly<{
  titulo: string
  texto?: string
  itens?: readonly string[]
  rotulo: string
  rota: string
  icone: NomeDeIcone
}>

export type SecaoDoGuia = Readonly<{
  id: string
  /** Título da seção na página. */
  titulo: string
  /** Âncora curta no cabeçalho: as quatro cabem numa linha no 375. */
  curto: string
  passos: readonly Passo[]
}>

const CHEGADA: readonly Passo[] = [
  {
    titulo: "1. Escolha a região antes do imóvel",
    texto:
      "Compare o trajeto para o trabalho, escola e serviços que você usa. Faça visitas em horários diferentes e confirme as condições de locação.",
    rotulo: "Ver imóveis da cidade",
    rota: "imoveis",
    icone: "apartment",
  },
  {
    titulo: "2. Planeje a mudança por escrito",
    itens: [
      "Solicite propostas com o mesmo inventário de móveis e caixas.",
      "Confirme embalagem, montagem, prazos e cobertura de danos.",
      "Registre contatos e condições combinadas.",
    ],
    rotulo: "Buscar serviços de mudança",
    rota: "busca",
    icone: "local_shipping",
  },
]

const ROTINA: readonly Passo[] = [
  {
    titulo: "3. Resolva escola e rotina",
    texto:
      "Confirme a série, os turnos e a disponibilidade diretamente com as instituições. As experiências da comunidade ajudam a comparar opções.",
    rotulo: "Buscar indicações de escolas",
    rota: "comunidade",
    icone: "school",
  },
  {
    titulo: "4. Monte sua rede de serviços",
    texto:
      "Salve os negócios que fazem sentido para você. Confira a origem das indicações e combine valor, horário e escopo antes de contratar.",
    rotulo: "Ver negócios locais",
    rota: "negocios",
    icone: "storefront",
  },
]

export const SECOES: readonly SecaoDoGuia[] = [
  { id: "chegada", titulo: "Chegando na cidade", curto: "Chegar", passos: CHEGADA },
  { id: "rotina", titulo: "Montando a rotina", curto: "Rotina", passos: ROTINA },
  { id: "referencias", titulo: "Referências da cidade", curto: "Referências", passos: [] },
  {
    id: "contribuir",
    titulo: "Sugerir um lugar",
    curto: "Sugerir",
    passos: [
      {
        titulo: "5. Compartilhe o que funcionou",
        texto:
          "Quando uma indicação ajudar, marque a resposta que resolveu. Esse relato fica disponível para as próximas famílias.",
        rotulo: "Abrir a comunidade",
        rota: "comunidade",
        icone: "forum",
      },
    ],
  },
]

/**
 * Qual seção a barra fixa anuncia: a última cujo topo já passou da linha de
 * leitura — e não a primeira que ainda aparece. Com a linha abaixo do topo da
 * tela, a seção anterior continua visível enquanto a próxima entra; responder
 * pela última que cruzou a linha é o que faz a barra acompanhar a leitura.
 */
export function secaoNaLinha(
  topos: readonly Readonly<{ id: string; topo: number }>[],
  linha: number,
): string {
  const primeira = topos[0]
  if (primeira === undefined) return ""
  let atual = primeira.id
  for (const medido of topos) if (medido.topo <= linha) atual = medido.id
  return atual
}
