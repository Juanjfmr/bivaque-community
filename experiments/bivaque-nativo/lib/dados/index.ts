// Dados de demonstração sintéticos do app nativo de teste. Nenhum dado real.
import type {
  Anuncio,
  Conversa,
  Evento,
  Grupo,
  Pessoa,
  Post,
  Resposta,
} from "./tipos"

export * from "./tipos"

export const CIDADE = "Manaus"

export const BAIRROS = ["Adrianópolis", "Ponta Negra", "Flores", "Parque 10"] as const

const foto = (semente: string) => `https://picsum.photos/seed/${semente}/600/600`

/** A pessoa que está usando o app. */
export const PERFIL: Pessoa = { id: "eu", nome: "Helena Braga", bairro: "Adrianópolis" }

export const PESSOAS: Pessoa[] = [
  { id: "p2", nome: "Marina Alves", bairro: "Adrianópolis" },
  { id: "p3", nome: "Rafael Souza", bairro: "Ponta Negra" },
  { id: "p4", nome: "Camila Ribeiro", bairro: "Flores" },
  { id: "p5", nome: "Jonas Pereira", bairro: "Parque 10" },
  { id: "p6", nome: "Aline Costa", bairro: "Adrianópolis" },
  { id: "p7", nome: "Everton Lima", bairro: "Flores" },
  { id: "p8", nome: "Patrícia Nunes", bairro: "Ponta Negra" },
  { id: "p9", nome: "Tiago Moreira", bairro: "Parque 10" },
]

export const POSTS: Post[] = [
  {
    id: "po1",
    autorId: "p2",
    bairro: "Adrianópolis",
    tempo: "há 2 h",
    tipo: "pergunta",
    uteis: 14,
    comentarios: 6,
    texto:
      "Mudei para Manaus no mês passado e ainda estou descobrindo a cidade. Quais serviços vocês " +
      "recomendam para quem acabou de chegar? Estou em Adrianópolis.",
  },
  {
    id: "po2",
    autorId: "p3",
    bairro: "Ponta Negra",
    tempo: "há 3 h",
    tipo: "pergunta",
    uteis: 9,
    comentarios: 4,
    texto:
      "Alguém indica escola de ensino fundamental em Ponta Negra? Prefiro uma que tenha contraturno.",
  },
  {
    id: "po3",
    autorId: "p4",
    bairro: "Flores",
    tempo: "há 5 h",
    tipo: "pergunta",
    uteis: 21,
    comentarios: 11,
    texto:
      "Preciso de um clínico geral que atenda por convênio nas Flores. Quem vocês confiam de olhos " +
      "fechados?",
  },
  {
    id: "po4",
    autorId: "p5",
    bairro: "Parque 10",
    tempo: "há 7 h",
    tipo: "publicacao",
    uteis: 6,
    comentarios: 3,
    texto:
      "Estou olhando um apartamento de dois quartos no Parque 10 por R$ 1.800 de aluguel. Parece " +
      "razoável para a região ou está acima do normal?",
  },
  {
    id: "po5",
    autorId: "p6",
    bairro: "Ponta Negra",
    tempo: "há 9 h",
    tipo: "pergunta",
    uteis: 12,
    comentarios: 5,
    texto:
      "Alguém sai cedo de Ponta Negra em direção ao centro? Queria dividir o trajeto numa carona " +
      "solidária, sai às 6h30.",
  },
  {
    id: "po6",
    autorId: "p7",
    bairro: "Adrianópolis",
    tempo: "ontem",
    tipo: "pergunta",
    uteis: 18,
    comentarios: 8,
    texto:
      "Indicação de eletricista de confiança em Adrianópolis, para trocar o quadro de disjuntores.",
  },
  {
    id: "po7",
    autorId: "p8",
    bairro: "Parque 10",
    grupoId: "g6",
    tempo: "ontem",
    tipo: "publicacao",
    uteis: 31,
    comentarios: 12,
    texto:
      "Feira de adoção neste sábado, das 9h às 14h, na praça do Parque 10. Levem os pequenos para " +
      "escolher um companheiro.",
  },
  {
    id: "po8",
    autorId: "p4",
    bairro: "Flores",
    tempo: "há 2 dias",
    tipo: "pergunta",
    uteis: 7,
    comentarios: 3,
    texto: "Onde encontro farmácia 24 horas nas Flores? A que eu conhecia fechou.",
  },
  {
    id: "po9",
    autorId: "p9",
    bairro: "Parque 10",
    grupoId: "g5",
    tempo: "há 2 dias",
    tipo: "publicacao",
    uteis: 26,
    comentarios: 9,
    texto:
      "Estou oferecendo reforço de matemática gratuito para o fundamental, duas manhãs por semana. " +
      "Tenho três vagas.",
  },
  {
    id: "po10",
    autorId: "p3",
    bairro: "Ponta Negra",
    tempo: "há 3 dias",
    tipo: "pergunta",
    uteis: 15,
    comentarios: 7,
    texto: "Qual o melhor horário para atravessar a ponte sem pegar fila?",
  },
  {
    id: "po11",
    autorId: "p2",
    bairro: "Ponta Negra",
    tempo: "há 3 dias",
    tipo: "pergunta",
    uteis: 10,
    comentarios: 4,
    texto: "Alguém conhece grupo de corrida em Ponta Negra? Pode ser no começo da manhã.",
  },
  {
    id: "po12",
    autorId: "p6",
    bairro: "Adrianópolis",
    grupoId: "g3",
    tempo: "há 4 dias",
    tipo: "publicacao",
    uteis: 22,
    comentarios: 6,
    texto:
      "Estou doando um sofá de dois lugares e uma mesa de jantar com quatro cadeiras. Retirada em " +
      "Adrianópolis.",
  },
]

export const RESPOSTAS: Resposta[] = [
  {
    id: "re1",
    postId: "po1",
    autorId: "p4",
    tempo: "há 1 h",
    texto: "Bem-vinda! Comece pela feira do bairro: resolve quase tudo em um sábado só.",
  },
  {
    id: "re2",
    postId: "po1",
    autorId: "p7",
    tempo: "há 1 h",
    texto: "Tenho contato de um eletricista e de um chaveiro que atendem Adrianópolis.",
  },
  {
    id: "re3",
    postId: "po1",
    autorId: "p6",
    tempo: "há 40 min",
    texto: "Se precisar de escola, tem um tópico aqui no grupo da comunidade com várias indicações.",
  },
  {
    id: "re4",
    postId: "po2",
    autorId: "p8",
    tempo: "há 2 h",
    texto: "No grupo Mães de Adrianópolis tem uma lista atualizada, vale perguntar por lá também.",
  },
  {
    id: "re5",
    postId: "po2",
    autorId: "p5",
    tempo: "há 1 h",
    texto: "Conheço uma em Ponta Negra que tem contraturno e período integral.",
  },
  {
    id: "re6",
    postId: "po3",
    autorId: "p2",
    tempo: "há 4 h",
    texto: "Atende por convênio e marca rápido. Mando o nome na conversa.",
  },
  {
    id: "re7",
    postId: "po3",
    autorId: "p9",
    tempo: "há 3 h",
    texto: "Confirmo a indicação anterior, o atendimento foi muito bom.",
  },
  {
    id: "re8",
    postId: "po5",
    autorId: "p3",
    tempo: "há 8 h",
    texto: "Saio às 6h20 da Ponta Negra. Podemos combinar um ponto de encontro.",
  },
  {
    id: "re9",
    postId: "po6",
    autorId: "p4",
    tempo: "ontem",
    texto: "O eletricista que atendeu aqui fez o quadro novo e deixou tudo documentado.",
  },
  {
    id: "re10",
    postId: "po8",
    autorId: "p7",
    tempo: "há 1 dia",
    texto: "Tem uma na avenida principal que fica aberta 24 horas, inclusive domingo.",
  },
]

export const GRUPOS: Grupo[] = [
  {
    id: "g1",
    nome: "Adrianópolis em rede",
    descricao: "Combinados do bairro, indicações de serviço e avisos da rua.",
    membros: 428,
    bairro: "Adrianópolis",
    capa: foto("bivaque-g1"),
  },
  {
    id: "g2",
    nome: "Corrida da Ponta Negra",
    descricao: "Encontros de corrida no começo da manhã, todos os níveis.",
    membros: 315,
    bairro: "Ponta Negra",
    capa: foto("bivaque-g2"),
  },
  {
    id: "g3",
    nome: "Bazar das Flores",
    descricao: "Desapegos, trocas e doações entre vizinhos das Flores.",
    membros: 692,
    bairro: "Flores",
    capa: foto("bivaque-g3"),
  },
  {
    id: "g4",
    nome: "Moradores do Parque 10",
    descricao: "Segurança, obras da rua e o que acontece na praça.",
    membros: 851,
    bairro: "Parque 10",
    capa: foto("bivaque-g4"),
  },
  {
    id: "g5",
    nome: "Aulas e reforço",
    descricao: "Professores e famílias trocando aulas, reforço e material escolar.",
    membros: 204,
    bairro: "Flores",
    capa: foto("bivaque-g5"),
  },
  {
    id: "g6",
    nome: "Bichos de Manaus",
    descricao: "Adoção, cuidados e veterinários indicados por quem já levou.",
    membros: 1103,
    bairro: "Ponta Negra",
    capa: foto("bivaque-g6"),
  },
]

export const ANUNCIOS: Anuncio[] = [
  {
    id: "an1",
    titulo: "Sofá retrô de 3 lugares",
    preco: 450,
    categoria: "desapego",
    bairro: "Adrianópolis",
    descricao: "Sofá em bom estado, tecido cinza. Retirada no local, preciso liberar a sala.",
    foto: foto("bivaque-an1"),
    vendedorId: "p2",
    conversaId: "co1",
  },
  {
    id: "an2",
    titulo: "Mesa de jantar em madeira",
    preco: 380,
    categoria: "desapego",
    bairro: "Flores",
    descricao: "Mesa com quatro cadeiras, madeira maciça. Pequenas marcas de uso no tampo.",
    foto: foto("bivaque-an2"),
    vendedorId: "p4",
    conversaId: "co2",
  },
  {
    id: "an3",
    titulo: "Bicicleta aro 29",
    preco: 900,
    categoria: "desapego",
    bairro: "Ponta Negra",
    descricao: "Quadro de alumínio, freios revisados no mês passado. Aceito conversa sobre o preço.",
    foto: foto("bivaque-an3"),
    vendedorId: "p3",
    conversaId: "co3",
  },
  {
    id: "an4",
    titulo: "Aluguel: apartamento 2 quartos",
    preco: 1450,
    categoria: "imovel",
    bairro: "Parque 10",
    descricao: "58 m², dois quartos, uma vaga. Condomínio com portaria 24 horas.",
    foto: foto("bivaque-an4"),
    vendedorId: "p5",
    conversaId: "co4",
  },
  {
    id: "an5",
    titulo: "Casa de 3 quartos com quintal",
    preco: 2350,
    categoria: "imovel",
    bairro: "Flores",
    descricao: "Casa térrea, quintal com árvore, aceita animais de pequeno porte.",
    foto: foto("bivaque-an5"),
    vendedorId: "p7",
    conversaId: "co2",
  },
  {
    id: "an6",
    titulo: "Cadeira de bebê para carro",
    preco: 0,
    categoria: "desapego",
    bairro: "Parque 10",
    descricao: "Doação. Está higienizada, só não serve mais em casa.",
    foto: foto("bivaque-an6"),
    vendedorId: "p9",
    conversaId: "co1",
  },
  {
    id: "an7",
    titulo: "Kit de panelas antiaderentes",
    preco: 120,
    categoria: "desapego",
    bairro: "Adrianópolis",
    descricao: "Cinco peças, pouco uso. Vendo porque troquei o fogão.",
    foto: foto("bivaque-an7"),
    vendedorId: "p6",
    conversaId: "co3",
  },
  {
    id: "an8",
    titulo: "Quarto mobiliado perto do centro",
    preco: 800,
    categoria: "imovel",
    bairro: "Adrianópolis",
    descricao: "Quarto individual em casa compartilhada, com cama, escrivaninha e banheiro.",
    foto: foto("bivaque-an8"),
    vendedorId: "p2",
    conversaId: "co4",
  },
  {
    id: "an9",
    titulo: "Estante de livros",
    preco: 0,
    categoria: "desapego",
    bairro: "Flores",
    descricao: "Doação. Cinco prateleiras, desmonta para transportar.",
    foto: foto("bivaque-an9"),
    vendedorId: "p4",
    conversaId: "co1",
  },
  {
    id: "an10",
    titulo: "Terreno de 200 m²",
    preco: 95000,
    categoria: "imovel",
    bairro: "Flores",
    descricao: "Rua asfaltada, água e energia na frente do lote. Documentação em ordem.",
    foto: foto("bivaque-an10"),
    vendedorId: "p7",
    conversaId: "co2",
  },
]

export const CONVERSAS: Conversa[] = [
  {
    id: "co1",
    pessoaId: "p2",
    naoLidas: 2,
    mensagens: [
      { id: "m1", deMim: true, texto: "Oi! O sofá ainda está disponível?", hora: "09:12" },
      { id: "m2", deMim: false, texto: "Está sim. Pode vir ver hoje à tarde.", hora: "09:15" },
      { id: "m3", deMim: false, texto: "Consigo deixar por R$ 420 se levar hoje.", hora: "09:16" },
    ],
  },
  {
    id: "co2",
    pessoaId: "p4",
    naoLidas: 0,
    mensagens: [
      { id: "m4", deMim: true, texto: "A mesa de jantar tem as quatro cadeiras?", hora: "ontem" },
      { id: "m5", deMim: false, texto: "Tem, todas firmes.", hora: "ontem" },
      {
        id: "m6",
        deMim: true,
        texto: "Perfeito. Consigo buscar no sábado de manhã.",
        hora: "ontem",
      },
    ],
  },
  {
    id: "co3",
    pessoaId: "p3",
    naoLidas: 1,
    mensagens: [
      { id: "m7", deMim: true, texto: "A bike aceita R$ 850?", hora: "há 2 dias" },
      { id: "m8", deMim: false, texto: "Faço por R$ 870, com a trava inclusa.", hora: "há 2 dias" },
    ],
  },
  {
    id: "co4",
    pessoaId: "p5",
    naoLidas: 0,
    mensagens: [
      {
        id: "m9",
        deMim: true,
        texto: "Posso visitar o apartamento nesta semana?",
        hora: "há 3 dias",
      },
      { id: "m10", deMim: false, texto: "Pode sim, quinta às 18h fica bom?", hora: "há 3 dias" },
      { id: "m11", deMim: true, texto: "Fechado, até quinta.", hora: "há 3 dias" },
    ],
  },
]

export const EVENTOS: Evento[] = [
  {
    id: "ev1",
    titulo: "Feira de adoção da praça",
    quando: "Sáb, 9h às 14h",
    local: "Praça do Parque 10",
    participantes: 86,
    capa: foto("bivaque-ev1"),
  },
  {
    id: "ev2",
    titulo: "Corrida da orla",
    quando: "Dom, 6h",
    local: "Orla da Ponta Negra",
    participantes: 134,
    capa: foto("bivaque-ev2"),
  },
  {
    id: "ev3",
    titulo: "Bazar de desapegos",
    quando: "Sáb, 8h às 12h",
    local: "Rua das Flores, 220",
    participantes: 57,
    capa: foto("bivaque-ev3"),
  },
]

export function pessoaPorId(id: string): Pessoa | undefined {
  if (id === PERFIL.id) return PERFIL
  return PESSOAS.find((pessoa) => pessoa.id === id)
}

export function postPorId(id: string): Post | undefined {
  return POSTS.find((post) => post.id === id)
}

export function respostasDoPost(postId: string): Resposta[] {
  return RESPOSTAS.filter((resposta) => resposta.postId === postId)
}

export function grupoPorId(id: string): Grupo | undefined {
  return GRUPOS.find((grupo) => grupo.id === id)
}

export function anuncioPorId(id: string): Anuncio | undefined {
  return ANUNCIOS.find((anuncio) => anuncio.id === id)
}

export function conversaPorId(id: string): Conversa | undefined {
  return CONVERSAS.find((conversa) => conversa.id === id)
}

export function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase()
}

/** "R$ 1.450" — o app de teste nunca formata moeda com centavos. */
export function precoEmReais(preco: number): string {
  if (preco === 0) return "Grátis"
  return `R$ ${preco.toLocaleString("pt-BR")}`
}
