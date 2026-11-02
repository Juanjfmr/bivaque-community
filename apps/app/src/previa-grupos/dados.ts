/**
 * Dados simulados da prévia de Grupos (régua Nextdoor, 01/11/2026). Nada aqui
 * vai para o banco. A forma segue o ADR-20261101-foto-e-resposta-nos-grupos:
 * até 4 fotos na publicação; resposta a comentário em um nível.
 */

export const EU = { id: "eu", nome: "Ana Souza", curto: "Ana S." } as const

export type Privacidade = "aberto" | "fechado"

export type Grupo = {
  id: string
  nome: string
  descricao: string
  regras: readonly string[]
  fixado: string | null
  privacidade: Privacidade
  membros: number
  capa: string | null
  /** Motivo da sugestão para quem ainda não está no grupo. */
  motivo: string
  participa: boolean
  novas: number
}

export type Tipo = "pergunta" | "conversa" | "oferta"

export type Comentario = {
  id: string
  autor: string
  quando: string
  texto: string
  uteis: number
  marcouUtil: boolean
  /** Comentário-pai, quando é resposta (um nível só). */
  respondeA: string | null
  /** Nome de quem foi respondido, mostrado antes do texto. */
  para: string | null
}

export type Publicacao = {
  id: string
  grupo: string
  autor: string
  quando: string
  tipo: Tipo
  texto: string
  fotos: readonly string[]
  uteis: number
  marcouUtil: boolean
  salva: boolean
  /** Comentário que resolveu a pergunta, quando há. */
  resolvida: string | null
  comentarios: readonly Comentario[]
}

export const ROTULO_DO_TIPO: Record<Tipo, string> = {
  pergunta: "Pergunta",
  conversa: "Conversa",
  oferta: "Oferta",
}

export const GRUPOS: readonly Grupo[] = [
  {
    id: "familias",
    nome: "Famílias com crianças pequenas",
    descricao: "Pediatras, escolas, festas e trocas de roupa infantil em Manaus.",
    regras: [
      "Fotos de crianças só com autorização dos pais.",
      "Oferta de negócio de membro: uma por semana.",
      "Indicação vale mais com a experiência de quem usou.",
    ],
    fixado: "Fotos de crianças só com autorização dos pais.",
    privacidade: "aberto",
    membros: 540,
    capa: "demo/mesa.webp",
    motivo: "Porque você marcou Filhos pequenos",
    participa: false,
    novas: 0,
  },
  {
    id: "chegadas",
    nome: "Chegadas 2026",
    descricao: "Quem chega a Manaus neste ciclo: mudança, escola, moradia e o primeiro encontro.",
    regras: ["Uma pergunta por publicação, para a resposta não se perder."],
    fixado: null,
    privacidade: "aberto",
    membros: 184,
    capa: "demo/chegada.webp",
    motivo: "Para quem está chegando",
    participa: true,
    novas: 3,
  },
  {
    id: "pets",
    nome: "Pets da Vila",
    descricao: "Veterinário, passeio, adoção e quem cuida quando a família viaja.",
    regras: ["Nada de venda de animais."],
    fixado: null,
    privacidade: "aberto",
    membros: 97,
    capa: "demo/pets.jpg",
    motivo: "Porque você marcou Pets",
    participa: false,
    novas: 0,
  },
  {
    id: "conjuges",
    nome: "Cônjuges em movimento",
    descricao: "Trabalho, estudo e rede de apoio para quem acompanha a transferência.",
    regras: ["O que é dito aqui fica aqui."],
    fixado: null,
    privacidade: "fechado",
    membros: 301,
    capa: null,
    motivo: "Popular em Manaus",
    participa: false,
    novas: 0,
  },
  {
    id: "corrida",
    nome: "Corrida de sábado",
    descricao: "Saída às 6h na Ponta Negra. Todo ritmo é bem-vindo.",
    regras: [],
    fixado: null,
    privacidade: "aberto",
    membros: 73,
    capa: null,
    motivo: "Popular em Manaus",
    participa: false,
    novas: 0,
  },
]

const c = (
  id: string,
  autor: string,
  quando: string,
  texto: string,
  uteis = 0,
  respondeA: string | null = null,
  para: string | null = null,
): Comentario => ({ id, autor, quando, texto, uteis, marcouUtil: false, respondeA, para })

export const PUBLICACOES: readonly Publicacao[] = [
  {
    id: "p-pediatra",
    grupo: "familias",
    autor: "Luana M.",
    quando: "há 2 horas",
    tipo: "pergunta",
    texto:
      "Pediatra que atenda sábado de manhã pelo plano? A pequena acordou com febre e a clínica de sempre só abre na segunda.",
    fotos: [],
    uteis: 6,
    marcouUtil: false,
    salva: false,
    resolvida: "c1",
    comentarios: [
      c(
        "c1",
        "Carla R.",
        "há 1 hora",
        "Dra. Lúcia, na Clínica Cuidar do Vieiralves. Sábado até 12h, atende pelo plano.",
        9,
      ),
      c(
        "c2",
        "Luana M.",
        "há 50 min",
        "Consegui encaixe para as 10h. Obrigada!",
        2,
        "c1",
        "Carla R.",
      ),
      c(
        "c3",
        "Jéssica L.",
        "há 40 min",
        "Também indico. Ela é calma com criança pequena.",
        3,
        "c1",
        "Carla R.",
      ),
      c(
        "c4",
        "Diego F.",
        "há 20 min",
        "Se precisar de urgência, o pronto-socorro infantil da Zona Sul funciona 24h.",
        1,
      ),
    ],
  },
  {
    id: "p-kit-festa",
    grupo: "familias",
    autor: "Cláudia M.",
    quando: "ontem",
    tipo: "oferta",
    texto:
      "Kit festa com bolo, docinhos e lembrancinhas, 10% para a comunidade neste mês. Encomendas com 3 dias de antecedência.",
    fotos: ["demo/cake.jpg"],
    uteis: 4,
    marcouUtil: false,
    salva: false,
    resolvida: null,
    comentarios: [
      c("c5", "Ana P.", "ontem", "Fiz o do aniversário do meu filho, recomendo o de chocolate.", 2),
    ],
  },
  {
    id: "p-berco",
    grupo: "familias",
    autor: "Marcos T.",
    quando: "há 2 dias",
    tipo: "conversa",
    texto:
      "Estamos de mudança para Santa Maria e não vamos levar o berço nem a poltrona de amamentação. Doamos para quem precisar, é só buscar no Dom Pedro até sexta.",
    fotos: ["demo/crib.jpg", "demo/interior.jpg"],
    uteis: 11,
    marcouUtil: false,
    salva: false,
    resolvida: null,
    comentarios: [],
  },
  {
    id: "p-festa",
    grupo: "familias",
    autor: EU.curto,
    quando: "há 8 dias",
    tipo: "pergunta",
    texto: "Qual sábado de dezembro é melhor para a festa coletiva de fim de ano das crianças?",
    fotos: [],
    uteis: 3,
    marcouUtil: false,
    salva: false,
    resolvida: null,
    comentarios: [
      c("c6", "Bruna S.", "há 7 dias", "Dia 13. Depois do dia 15 muita gente viaja.", 5),
      c("c7", "Renato A.", "há 6 dias", "Evitem o dia 6, tem formatura na escola.", 2),
    ],
  },
]
