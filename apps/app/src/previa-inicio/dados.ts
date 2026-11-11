/**
 * Dados de demonstração do Início comercial (prévia de 11/11/2026). Pessoas,
 * negócios e anúncios são fictícios; as fotos são as de demonstração do app
 * (`public/demo/`), nunca fotos de pessoas.
 */
export type Momento = "chegando" | "morando" | "saindo"
export type Faixa = "viva" | "rala" | "vazia"

export type Anuncio = Readonly<{
  id: string
  titulo: string
  preco: number
  foto: string | null
  bairro: string
  km: number
  quem: string
  /** Dias até a pessoa sair da cidade; ausente quando não está de mudança. */
  saiEm?: number
  descricao: string
  enderecoExato: boolean
}>

export type Negocio = Readonly<{
  id: string
  nome: string
  categoria: string
  km: number
  indicacoes: number
  aberto: boolean
  foto: string | null
  indicacao: Readonly<{ quem: string; frase: string }>
  mudanca?: boolean
}>

export type Imovel = Readonly<{
  id: string
  titulo: string
  aluguel: number
  foto: string
  bairro: string
  kmDoTrabalho: number
  detalhe: string
}>

export type PedidoDeIndicacao = Readonly<{
  id: string
  quem: string
  bairro: string
  texto: string
  indicacoes: number
}>

export type Encontro = Readonly<{
  id: string
  nome: string
  dia: string
  hora: string
  local: string
  km: number
  vao: number
}>

export const ANUNCIOS: readonly Anuncio[] = [
  {
    id: "a-berco",
    titulo: "Berço com colchão, pouco uso",
    preco: 380,
    foto: "crib.jpg",
    bairro: "Ponta Negra",
    km: 0.9,
    quem: "Luciana Prado",
    saiEm: 12,
    descricao: "Madeira maciça, três alturas. Acompanha colchão e protetor.",
    enderecoExato: false,
  },
  {
    id: "a-sofa",
    titulo: "Sofá 3 lugares retrátil",
    preco: 900,
    foto: "sofa.jpg",
    bairro: "Adrianópolis",
    km: 5.3,
    quem: "Marcos Vilar",
    saiEm: 20,
    descricao: "Tecido lavável, sem manchas. Ajudo a carregar até o carro.",
    enderecoExato: false,
  },
  {
    id: "a-geladeira",
    titulo: "Geladeira frost free 375 L",
    preco: 1450,
    foto: "fridge.jpg",
    bairro: "Parque Dez",
    km: 7.1,
    quem: "Sérgio Lima",
    descricao: "220 V, nota fiscal de 2023. Funciona perfeitamente.",
    enderecoExato: true,
  },
  {
    id: "a-banquetas",
    titulo: "Três banquetas de madeira maciça",
    preco: 240,
    foto: "kitchen.jpg",
    bairro: "Vieiralves",
    km: 4.8,
    quem: "Bianca Sales",
    saiEm: 5,
    descricao: "Altura de bancada. Uma delas tem um risco no assento.",
    enderecoExato: false,
  },
  {
    id: "a-caixas",
    titulo: "Caixas de mudança reforçadas (30 un.)",
    preco: 0,
    foto: null,
    bairro: "Aleixo",
    km: 6.4,
    quem: "Helena Dutra",
    saiEm: 9,
    descricao: "Usadas uma vez. Leva também o rolo de plástico-bolha.",
    enderecoExato: false,
  },
]

export const NEGOCIOS: readonly Negocio[] = [
  {
    id: "n-confeitaria",
    nome: "Confeitaria da Lu",
    categoria: "Bolos e doces",
    km: 2,
    indicacoes: 23,
    aberto: true,
    foto: "cake.jpg",
    indicacao: {
      quem: "Bianca Sales",
      frase: "O bolo do aniversário chegou na hora e ainda gelado.",
    },
  },
  {
    id: "n-frete",
    nome: "Frete e montagem Bezerra",
    categoria: "Mudança e montagem",
    km: 3.7,
    indicacoes: 41,
    aberto: true,
    foto: "moving.jpg",
    indicacao: { quem: "Helena Dutra", frase: "Desmontou, levou e montou tudo no mesmo dia." },
    mudanca: true,
  },
  {
    id: "n-pediatra",
    nome: "Dra. Helena Pediatria",
    categoria: "Saúde infantil",
    km: 1.6,
    indicacoes: 31,
    aberto: true,
    foto: "dentist.jpg",
    indicacao: {
      quem: "Luciana Prado",
      frase: "Atende sábado de manhã e o retorno não é cobrado.",
    },
  },
  {
    id: "n-clima",
    nome: "Climatiza Manaus",
    categoria: "Ar-condicionado",
    km: 6.2,
    indicacoes: 18,
    aberto: false,
    foto: "service.jpg",
    indicacao: {
      quem: "Sérgio Lima",
      frase: "Limpou os três aparelhos e disse o que não precisava trocar.",
    },
  },
]

export const IMOVEIS: readonly Imovel[] = [
  {
    id: "m-apto",
    titulo: "Apartamento 3 quartos, mobiliado",
    aluguel: 3200,
    foto: "apartment.jpg",
    bairro: "Ponta Negra",
    kmDoTrabalho: 1.1,
    detalhe: "92 m² · 2 vagas · aceita pet",
  },
  {
    id: "m-casa",
    titulo: "Casa em condomínio, 4 quartos",
    aluguel: 4800,
    foto: "interior.jpg",
    bairro: "Tarumã",
    kmDoTrabalho: 9.6,
    detalhe: "180 m² · quintal · 3 vagas",
  },
]

export const PEDIDOS: readonly PedidoDeIndicacao[] = [
  {
    id: "p-ar",
    quem: "Davi Moura",
    bairro: "Flores",
    texto: "Alguém indica quem instale ar-condicionado ainda esta semana?",
    indicacoes: 0,
  },
  {
    id: "p-escola",
    quem: "Bianca Sales",
    bairro: "Adrianópolis",
    texto: "Escola integral que aceite matrícula no meio do semestre?",
    indicacoes: 1,
  },
  {
    id: "p-internet",
    quem: "Otávio Reis",
    bairro: "Parque Dez",
    texto: "Qual operadora pega bem no Tarumã? A minha some dentro de casa",
    indicacoes: 3,
  },
]

export const ENCONTROS: readonly Encontro[] = [
  {
    id: "e-cafe",
    nome: "Café de boas-vindas para quem chegou",
    dia: "Sáb, 14 nov",
    hora: "9h",
    local: "Praça da Ponta Negra",
    km: 1.2,
    vao: 15,
  },
]

export function preco(valor: number): string {
  return valor === 0 ? "Grátis" : `R$ ${valor.toLocaleString("pt-BR")}`
}

export function distancia(km: number): string {
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
}

/** Quanto cada faixa de volume mostra: a mesma tela com 0, poucos ou muitos itens. */
export function recortar<T>(lista: readonly T[], faixa: Faixa): readonly T[] {
  if (faixa === "vazia") return []
  if (faixa === "rala") return lista.slice(0, 1)
  return lista
}
