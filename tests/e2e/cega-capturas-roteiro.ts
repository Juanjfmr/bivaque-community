/**
 * Roteiro das capturas para a revisão às cegas pela régua Nextdoor (DS-022).
 *
 * O critério 2 de docs/LANCAMENTO.md pede que cada jornada seja julgada por
 * outro modelo, contra as telas do Nextdoor no Mobbin, e o revisor só pode ver
 * imagens. Este arquivo é a lista de telas que o `cega-capturas.spec.ts`
 * percorre: rota, persona do seed, seletor que prova que a tela carregou com
 * dado real, o texto que precisa estar visível e os passos que abrem a tela (o
 * menu Criar, a busca, o formulário de perfil).
 *
 * Regras:
 * - o spec só lê e navega: nenhum passo aqui grava;
 * - persona é e-mail do seed (`*.example.invalid`), nunca conta real;
 * - `id` é o nome do arquivo (`.visual/cega/<jornada>/<id>-<largura>-claro.png`),
 *   e por isso não se repete.
 */
export type PassoDoRoteiro = {
  readonly tipo: "clique" | "preenchimento"
  readonly alvo: string
  readonly valor?: string
}

export type TelaDoRoteiro = {
  readonly id: string
  readonly rota: string
  readonly persona: string
  /** Seletor que só existe quando o dado real da tela carregou. */
  readonly seletor: string
  /** Trecho que precisa estar dentro do seletor. */
  readonly texto?: string
  readonly passos?: readonly PassoDoRoteiro[]
}

export type JornadaDoRoteiro = {
  readonly jornada: string
  readonly titulo: string
  readonly telas: readonly TelaDoRoteiro[]
}

/** Personas do seed local (`supabase/seed.sql`). */
export const PERSONAS = {
  /** Titular verificado, "Ana Verificada" (20000000-…-0001). */
  titular: "visual@bivaque.example.invalid",
  /** Membro de Manaus que já pediu à Climatiza (30000000-…-0001). */
  membro: "membro-1@bivaque.example.invalid",
  /** Dono da ficha Climatiza Manaus (20000000-…-000a). */
  prestador: "prestador-seed@bivaque.example.invalid",
  /** Dona da vila, com aviso semeado (20000000-…-0008). */
  donaDaVila: "dono-vila@bivaque.example.invalid",
} as const

const CONVERSA_DO_TITULAR = "41000000-0000-4000-8000-000000000051"
const AVISO_DA_DONA_DA_VILA = "50000000-0000-4000-8000-0000000000ca"
const NEGOCIO_DA_CLIMATIZA = "30000000-0000-4000-8000-000000000010"
const PEDIDO_DO_MEMBRO = "40000000-0000-4000-8000-000000000023"
const VERBETE_DA_ESCOLA = "a0000000-0000-4000-8000-000000000001"

export const ROTEIRO: readonly JornadaDoRoteiro[] = [
  {
    jornada: "f02",
    titulo: "Início e busca",
    telas: [
      {
        id: "inicio",
        rota: "/app/inicio",
        persona: PERSONAS.titular,
        seletor: '[data-tela="inicio"]',
        texto: "Sua rede em Manaus",
      },
      {
        id: "busca",
        rota: "/app/inicio",
        persona: PERSONAS.titular,
        seletor: '[data-tela="busca"]',
        texto: "Alguém indica pediatra",
        passos: [
          { tipo: "clique", alvo: '[data-acao="busca"]' },
          { tipo: "preenchimento", alvo: '[data-campo="busca"]', valor: "pediatra" },
        ],
      },
    ],
  },
  {
    jornada: "f03",
    titulo: "Criar",
    telas: [
      {
        id: "criar",
        rota: "/app/inicio",
        persona: PERSONAS.titular,
        seletor: '[data-sobreposicao="menu-criar"]',
        texto: "Pedir indicação",
        passos: [{ tipo: "clique", alvo: '[data-acao="criar"]' }],
      },
      {
        id: "pergunta",
        rota: "/app/inicio",
        persona: PERSONAS.titular,
        seletor: '[data-fluxo="perguntar"]',
        texto: "Pedir uma indicação",
        passos: [
          { tipo: "clique", alvo: '[data-acao="criar"]' },
          { tipo: "clique", alvo: '[data-escolha="ask"]' },
        ],
      },
      {
        id: "desapego",
        rota: "/app/inicio",
        persona: PERSONAS.titular,
        seletor: '[data-formulario-criacao="create-item"]',
        texto: "Anunciar desapego",
        passos: [
          { tipo: "clique", alvo: '[data-acao="criar"]' },
          { tipo: "clique", alvo: '[data-escolha="create-item"]' },
        ],
      },
      {
        id: "evento",
        rota: "/app/inicio",
        persona: PERSONAS.titular,
        seletor: '[data-sobreposicao="folha"]',
        texto: "Novo encontro",
        passos: [
          { tipo: "clique", alvo: '[data-acao="criar"]' },
          { tipo: "clique", alvo: '[data-escolha="create-event"]' },
        ],
      },
    ],
  },
  {
    jornada: "f06",
    titulo: "Mercado e moradia",
    telas: [
      {
        id: "mercado",
        rota: "/app/desapegos",
        persona: PERSONAS.titular,
        seletor: '[data-tela="desapegos"] [data-cartao="anuncio"]',
        texto: "Mesa de jantar com 6 cadeiras",
      },
      {
        id: "anuncio",
        rota: "/app/anuncio/b1000000-0000-4000-8000-000000000004",
        persona: PERSONAS.titular,
        seletor: '[data-tela="anuncio"]',
        texto: "Berço portátil desmontável",
      },
      {
        id: "meus-anuncios",
        rota: "/app/meus-anuncios",
        persona: PERSONAS.titular,
        seletor: '[data-tela="meus-anuncios"] [data-cartao="anuncio"]',
        texto: "Mesa de jantar com 6 cadeiras",
      },
      {
        id: "imoveis",
        rota: "/app/imoveis",
        persona: PERSONAS.titular,
        seletor: '[data-tela="imoveis"] [data-cartao="anuncio"]',
        texto: "Apartamento 2 quartos no Centro",
      },
    ],
  },
  {
    jornada: "f07",
    titulo: "Negócios e serviços",
    telas: [
      {
        id: "negocios",
        rota: "/app/negocios",
        persona: PERSONAS.membro,
        seletor: '[data-tela="negocios"] [data-cartao="negocio"]',
        texto: "Climatiza Manaus",
      },
      {
        id: "negocio",
        rota: `/app/negocio/${NEGOCIO_DA_CLIMATIZA}`,
        persona: PERSONAS.membro,
        seletor: '[data-tela="negocio"]',
        texto: "Limpeza completa",
      },
      {
        id: "meu-negocio",
        rota: "/app/meu-negocio",
        persona: PERSONAS.prestador,
        seletor: '[data-lista="servicos"]',
        texto: "Limpeza completa",
      },
      {
        id: "pedido",
        rota: `/app/pedido/${PEDIDO_DO_MEMBRO}`,
        persona: PERSONAS.membro,
        seletor: "[data-descricao-do-pedido]",
        texto: "Preciso limpar o ar-condicionado",
      },
    ],
  },
  {
    jornada: "f08",
    titulo: "Guia",
    telas: [
      {
        id: "guia",
        rota: "/app/guia",
        persona: PERSONAS.titular,
        seletor: '[data-tela="guia"] [data-linha="lista"]',
        texto: "Escola Modelo do Centro",
      },
      {
        id: "verbete",
        rota: `/app/guia/${VERBETE_DA_ESCOLA}`,
        persona: PERSONAS.titular,
        seletor: '[data-tela="verbete"]',
        texto: "Escola Modelo do Centro",
      },
    ],
  },
  {
    jornada: "f09",
    titulo: "Conversas e avisos",
    telas: [
      {
        id: "conversas",
        rota: "/app/conversas",
        persona: PERSONAS.titular,
        seletor: `[data-thread="${CONVERSA_DO_TITULAR}"]`,
      },
      {
        id: "conversa",
        rota: `/app/conversa/${CONVERSA_DO_TITULAR}`,
        persona: PERSONAS.titular,
        seletor: '[data-mensagens="historico"]',
        texto: "Confirmado, 9h",
      },
      {
        id: "avisos",
        rota: "/app/avisos",
        persona: PERSONAS.donaDaVila,
        seletor: `[data-aviso-item="${AVISO_DA_DONA_DA_VILA}"]`,
        texto: "O pedido em que você estava foi encerrado",
      },
    ],
  },
  {
    jornada: "f10",
    titulo: "Você, família e conta",
    telas: [
      {
        id: "voce",
        rota: "/app/voce",
        persona: PERSONAS.titular,
        seletor: '[data-tela="voce"]',
        texto: "Ana Verificada",
      },
      {
        id: "perfil",
        rota: "/app/voce",
        persona: PERSONAS.titular,
        seletor: "#perfil-nome",
        passos: [{ tipo: "clique", alvo: 'button:has-text("Editar")' }],
      },
      {
        id: "familia",
        rota: "/app/voce",
        persona: PERSONAS.titular,
        seletor: '[data-secao="sim"]',
        texto: "Convites pendentes",
      },
    ],
  },
]

/** Caminho relativo da captura: `.visual/cega/<jornada>/<tela>-<largura>-claro.png`. */
export function arquivoDaCaptura(jornada: string, tela: string, largura: number): string {
  return `.visual/cega/${jornada}/${tela}-${largura}-claro.png`
}
