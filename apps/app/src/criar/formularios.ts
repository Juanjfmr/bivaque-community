/**
 * A régua dos formulários do Criar, por campo.
 *
 * Ela repete os limites do servidor (`apps/web/lib/listings/catalog.ts` e
 * `apps/web/lib/indications/indications.ts`) porque o app é outro pacote e não
 * importa código do servidor para o bundle. Quem manda é o servidor; aqui só se
 * evita mandar o que já se sabe que volta 400 — e cada frase nasce no campo que
 * a originou, com a mesma palavra que o servidor usaria.
 */

export const LIMITES_DA_PERGUNTA = {
  titulo: 8,
  tituloMaximo: 300,
  assunto: 60,
} as const

export type ErrosDaPergunta = Readonly<{ titulo?: string; assunto?: string }>

export function errosDaPergunta(entrada: {
  readonly titulo: string
  readonly assunto: string
}): ErrosDaPergunta {
  const erros: { titulo?: string; assunto?: string } = {}
  const titulo = entrada.titulo.trim()
  if (titulo.length < LIMITES_DA_PERGUNTA.titulo) {
    erros.titulo = "Escreva o que você procura com um pouco mais de contexto."
  } else if (titulo.length > LIMITES_DA_PERGUNTA.tituloMaximo) {
    erros.titulo = `Encurte o pedido para até ${LIMITES_DA_PERGUNTA.tituloMaximo} caracteres.`
  }
  if (entrada.assunto.trim().length > LIMITES_DA_PERGUNTA.assunto) {
    erros.assunto = `O assunto vai até ${LIMITES_DA_PERGUNTA.assunto} caracteres.`
  }
  return erros
}

export const LIMITES_DO_DESAPEGO = {
  titulo: 3,
  tituloMaximo: 120,
  bairro: 80,
  descricao: 2000,
  /** O mesmo teto do servidor, em centavos. */
  precoMaximoCents: 100_000_000,
} as const

export type CampoDoDesapego = "titulo" | "bairro" | "preco" | "descricao" | "cep"

/** Os oito dígitos de um CEP, ou `null` quando o texto não é um CEP. */
export function cepEmDigitos(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, "")
  return digitos.length === 8 ? digitos : null
}

/** `69000000` → `69000-000`; o que não é CEP volta como veio. */
export function cepComMascara(bruto: string): string {
  const digitos = bruto.replace(/\D/g, "").slice(0, 8)
  return digitos.length <= 5 ? digitos : `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

export type ErrosDoDesapego = Readonly<Partial<Record<CampoDoDesapego, string>>>

/** O preço como a pessoa digita no campo, em centavos. */
function precoEmCentavos(bruto: string): number | null {
  const valor = bruto.trim()
  const partes = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(valor)
  if (partes === null) return null
  const centavos = Number(partes[1]) * 100 + Number((partes[2] ?? "").padEnd(2, "0"))
  return Number.isFinite(centavos) && centavos > 0 ? centavos : null
}

export function errosDoDesapego(entrada: {
  readonly titulo: string
  readonly bairro: string
  readonly preco: string
  readonly descricao: string
  readonly cep?: string
}): ErrosDoDesapego {
  const erros: {
    titulo?: string
    bairro?: string
    preco?: string
    descricao?: string
    cep?: string
  } = {}
  const titulo = entrada.titulo.trim()
  if (titulo.length < LIMITES_DO_DESAPEGO.titulo) {
    erros.titulo = `O título precisa de pelo menos ${LIMITES_DO_DESAPEGO.titulo} caracteres.`
  } else if (titulo.length > LIMITES_DO_DESAPEGO.tituloMaximo) {
    erros.titulo = "O título passa de 120 caracteres."
  }
  // O bairro é opcional (ADR-20261022 §2): com CEP ele vem do CEP; sem CEP o
  // anúncio aparece na cidade. Vazio não é erro.
  const bairro = entrada.bairro.trim()
  if (bairro.length > LIMITES_DO_DESAPEGO.bairro) erros.bairro = "O bairro passa de 80 caracteres."
  // CEP opcional: preenchido, precisa ter oito dígitos.
  const cep = (entrada.cep ?? "").trim()
  if (cep !== "" && cepEmDigitos(cep) === null) {
    erros.cep = "Informe um CEP com oito dígitos."
  }
  const preco = entrada.preco.trim()
  if (preco === "") erros.preco = "Informe o preço do item."
  else {
    const centavos = precoEmCentavos(preco)
    if (centavos === null) erros.preco = "Informe um valor como 650 ou 650,00."
    else if (centavos > LIMITES_DO_DESAPEGO.precoMaximoCents) {
      erros.preco = "O valor informado é alto demais."
    }
  }
  const descricao = entrada.descricao.trim()
  if (descricao === "") erros.descricao = "Descreva o item."
  else if (descricao.length > LIMITES_DO_DESAPEGO.descricao) {
    erros.descricao = "A descrição passa de 2000 caracteres."
  }
  return erros
}

export const LIMITES_DO_IMOVEL = {
  /** `TITLE_MIN` de apps/web/lib/listings/types.ts: a régua do servidor. */
  titulo: 2,
  tituloMaximo: 120,
  bairro: 80,
  descricao: 2000,
  quartos: 20,
  vagas: 20,
  /** O mesmo teto de `optionalCents` do servidor, em reais. */
  valorMaximo: 100_000_000,
  areaMaxima: 100_000,
} as const

export type CampoDoImovel =
  | "titulo"
  | "bairro"
  | "valor"
  | "quartos"
  | "vagas"
  | "area"
  | "descricao"
  | "cep"
  | "localizacaoPublica"

export type ErrosDoImovel = Readonly<Partial<Record<CampoDoImovel, string>>>

/** Número inteiro opcional, com o mesmo teto do servidor: vazio é válido. */
function inteiroAte(valor: string, maximo: number): string | null {
  const limpo = valor.trim()
  if (limpo === "") return null
  if (!/^\d+$/.test(limpo)) return "Informe um número inteiro."
  return Number.parseInt(limpo, 10) > maximo ? "Número acima do limite." : null
}

/**
 * A régua do imóvel, a mesma de `apps/web/lib/listings/validation.ts` (o app é
 * outro pacote e não importa código do servidor): quem manda é o servidor; aqui
 * só se evita mandar o que já se sabe que volta 400, com a frase do campo.
 */
export function errosDoImovel(entrada: {
  readonly titulo: string
  readonly bairro: string
  readonly valor: string
  readonly quartos: string
  readonly vagas: string
  readonly area: string
  readonly descricao: string
  /** RUN-175: obrigatório — o imóvel é publicado a partir do CEP. */
  readonly cep?: string
  readonly endereco?: string
  readonly localizacaoPublica?: "exata" | "aproximada"
}): ErrosDoImovel {
  const erros: {
    titulo?: string
    bairro?: string
    valor?: string
    quartos?: string
    vagas?: string
    area?: string
    descricao?: string
    cep?: string
    localizacaoPublica?: string
  } = {}
  const titulo = entrada.titulo.trim()
  if (titulo.length < LIMITES_DO_IMOVEL.titulo) erros.titulo = "Dê um título ao imóvel."
  else if (titulo.length > LIMITES_DO_IMOVEL.tituloMaximo) {
    erros.titulo = `O título passa de ${LIMITES_DO_IMOVEL.tituloMaximo} caracteres.`
  }
  const bairro = entrada.bairro.trim()
  if (bairro === "") erros.bairro = "Informe o bairro."
  else if (bairro.length > LIMITES_DO_IMOVEL.bairro) {
    erros.bairro = "O bairro passa de 80 caracteres."
  }
  // CEP obrigatório (ADR-20261022 §1) e o único campo que a geocodificação lê.
  if (cepEmDigitos(entrada.cep ?? "") === null) {
    erros.cep = "Informe o CEP do imóvel."
  }
  // Local exato é o endereço publicado; sem endereço a escolha não se sustenta.
  if (entrada.localizacaoPublica === "exata" && (entrada.endereco ?? "").trim() === "") {
    erros.localizacaoPublica = "Para o local exato, informe o endereço."
  }
  // Aluguel e venda são reais inteiros no servidor: centavos voltam 400.
  const valor = entrada.valor.trim()
  if (valor === "") erros.valor = "Informe o valor do imóvel."
  else if (!/^\d+$/.test(valor))
    erros.valor = "Informe um valor em reais, sem centavos e sem símbolo."
  else if (Number.parseInt(valor, 10) > LIMITES_DO_IMOVEL.valorMaximo) {
    erros.valor = "Valor acima do limite permitido."
  }
  const quartos = inteiroAte(entrada.quartos, LIMITES_DO_IMOVEL.quartos)
  if (quartos !== null) erros.quartos = quartos
  const vagas = inteiroAte(entrada.vagas, LIMITES_DO_IMOVEL.vagas)
  if (vagas !== null) erros.vagas = vagas
  const area = entrada.area.trim().replace(",", ".")
  if (area !== "") {
    if (!/^\d+(\.\d{1,2})?$/.test(area)) erros.area = "Informe a área em metros quadrados."
    else {
      const metragem = Number.parseFloat(area)
      if (metragem <= 0 || metragem > LIMITES_DO_IMOVEL.areaMaxima) {
        erros.area = "Área fora do intervalo permitido."
      }
    }
  }
  if (entrada.descricao.trim().length > LIMITES_DO_IMOVEL.descricao) {
    erros.descricao = "A descrição passa de 2000 caracteres."
  }
  return erros
}

/** `true` quando dá para revisar: é o que habilita a ação primária. */
export function semErros(erros: Readonly<Partial<Record<string, string>>>): boolean {
  return Object.values(erros).every((erro) => erro === undefined)
}

/** "750.5" → "R$ 750,50": o preço como se lê em português. */
export function precoBRL(bruto: string): string {
  const centavos = precoEmCentavos(bruto)
  if (centavos === null) return "R$ —"
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
