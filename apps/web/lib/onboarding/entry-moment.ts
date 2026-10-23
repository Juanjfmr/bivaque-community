// PORT-005 (lote 4 da entrada) — o momento da entrada na linguagem do produto
// (ADR-20261022-entrada-do-prototipo, item 3): os rótulos da tela de cidade, as
// mensagens dos códigos de erro do provisionamento e os blocos das boas-vindas,
// que mudam conforme o momento. Tudo puro: a tela só desenha, e o teste prova o
// texto de cada momento sem navegador.
//
// As frases são as do protótipo, palavra por palavra
// (prototypes/bivaque-html/src/features/entry/arrive.js): `renderEntryCity` para
// os rótulos e `renderEntryWelcome` para o lead e os cartões.

import type { EntryMoment } from "./provision-validation"

/** Rótulos do grupo "Seu momento", na ordem do protótipo. */
export const ENTRY_MOMENT_OPTIONS: ReadonlyArray<{ label: string; value: EntryMoment }> = [
  { label: "Chegando", value: "arriving" },
  { label: "Moro aqui", value: "resident" },
  { label: "Saindo", value: "leaving" },
]

/**
 * A mensagem de cada código de erro do `provision`. Os quatro primeiros são os
 * do protótipo, palavra por palavra; os demais são o mesmo assunto dito para
 * quem tropeçou na validação do servidor. Código desconhecido cai na mensagem
 * genérica — nunca no texto do banco.
 */
const PROVISION_ERROR_MESSAGES: Record<string, string> = {
  "locality is required": "Escolha sua cidade.",
  "locality is unknown": "Escolha sua cidade.",
  "display_name is required": "Informe como você quer ser chamado.",
  "display_name is too long": "Use até 80 caracteres no nome.",
  "moment is required": "Escolha o seu momento.",
  "arrival_date is required": "Informe a data de chegada.",
  "departure_date is required": "Informe a data da saída.",
  "destination is required": "Escolha um destino diferente da sua cidade atual.",
  "destination is unknown": "Escolha um destino diferente da sua cidade atual.",
  "destination must differ from the current city":
    "Escolha um destino diferente da sua cidade atual.",
  "date is invalid": "Informe uma data válida.",
  "date is in the past": "Escolha uma data a partir de hoje.",
  "arrival_date is not allowed": "Moro aqui não guarda data de chegada.",
  "departure_date is not allowed": "Chegando não guarda data de saída.",
  "destination is not allowed": "O destino só existe quando você está saindo.",
  "consent is required": "Aceite os Termos e o Código de Conduta para entrar.",
  "verification is required": "Conclua a verificação de acesso para entrar na comunidade.",
}

export function provisionErrorMessage(code: string | undefined): string {
  if (!code) return "Não foi possível concluir sua entrada. Tente novamente."
  return PROVISION_ERROR_MESSAGES[code] ?? "Não foi possível concluir sua entrada. Tente novamente."
}

export type WelcomeTile = Readonly<{
  /** Nome do símbolo do Material, como no protótipo. */
  icon: string
  title: string
  description: string
  href: string
}>

export type WelcomeView = Readonly<{
  moment: EntryMoment
  homeCity: string
  /** Cidade de destino da saída; nula nos outros dois momentos. */
  destinationCity: string | null
}>

export type WelcomeBlocks = Readonly<{
  lead: string
  tiles: WelcomeTile[]
}>

const PLAN_TILE_DESCRIPTION = "Moradia, escola, saúde e mudança, na ordem."

/**
 * Os blocos de `renderEntryWelcome`. `saindo` sem destino não existe no banco
 * (o CHECK exige o destino), mas a leitura da cidade de destino pode não vir —
 * nesse caso as boas-vindas caem no bloco de quem mora na cidade, em vez de
 * prometer um plano de saída para lugar nenhum.
 */
export function welcomeBlocks(view: WelcomeView): WelcomeBlocks {
  const { moment, homeCity, destinationCity } = view

  if (moment === "arriving") {
    return {
      lead: `Seu plano de chegada a ${homeCity} já está pronto.`,
      tiles: [
        {
          icon: "map",
          title: "Ver o plano de chegada",
          description: PLAN_TILE_DESCRIPTION,
          href: "/inicio",
        },
      ],
    }
  }

  if (moment === "leaving" && destinationCity !== null) {
    return {
      lead: `Seu plano de saída para ${destinationCity} já está pronto.`,
      tiles: [
        {
          icon: "map",
          title: "Ver o plano de saída",
          description: PLAN_TILE_DESCRIPTION,
          href: "/inicio",
        },
      ],
    }
  }

  return {
    lead: `O que a comunidade de ${homeCity} indica já está à sua espera.`,
    tiles: [
      {
        icon: "map",
        title: `Conhecer ${homeCity}`,
        description: "O que a comunidade indica, por assunto.",
        href: "/guide",
      },
    ],
  }
}
