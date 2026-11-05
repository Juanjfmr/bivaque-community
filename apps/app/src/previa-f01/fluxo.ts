/**
 * F01 novo — a entrada e o onboarding como máquina de estados.
 *
 * A ordem das etapas é configuração (`FLUXO_F01`), não código espalhado em
 * telas: tirar, pular ou reordenar uma etapa é mudar esta lista. O progresso
 * (`Progresso`) é o que o servidor vai guardar — na prévia ele mora num
 * repositório simulado (`servidor-simulado.ts`), com a mesma forma.
 *
 * Decisões do dono em 01/11/2026: Negócio fora do onboarding (flag nos
 * primeiros passos); entrada por código, sem senha; Apple na prévia; aceite
 * antes do CPF e "o combinado" depois da prévia da cidade; CPF antes do nome;
 * boas-vindas no topo do Início, sem tela própria.
 */

export const VERSAO_DO_FLUXO = 2

export type IdDaEtapa =
  | "porta"
  | "email"
  | "codigo"
  | "aceite"
  | "cpf"
  | "nome"
  | "cidade"
  | "verificacao"
  | "documento"
  | "previa-cidade"
  | "interesses"
  | "combinado"
  | "avisos"
  | "inicio"

export type Via = "apple" | "google" | "email"

/**
 * Estado da verificação do vínculo. O CPF nunca entra aqui: a consulta roda no
 * servidor e só o resultado volta.
 */
export type Verificacao =
  | "nao-iniciada"
  | "consultando"
  | "confirmada"
  | "nao-encontrada"
  | "portal-fora"
  | "documento-em-analise"

export type Momento = "chegando" | "morando" | "saindo"

export type Progresso = {
  versao: number
  etapa: IdDaEtapa
  concluidas: readonly IdDaEtapa[]
  via: Via | null
  /** Entrou por convite de familiar: o vínculo vem de quem convidou, sem CPF. */
  convite: boolean
  /** O e-mail já mascarado (a***@exemplo.com), só para mostrar na tela do código. */
  emailMascarado: string | null
  verificacao: Verificacao
  nome: { nome: string; sobrenome: string } | null
  /** Nome da cidade para exibir; o canônico é `cidadeIbge`. */
  cidade: string | null
  /** Código IBGE do catálogo (`YYYYYYY`), único vocabulário de cidade no banco. */
  cidadeIbge: string | null
  /** Código IBGE do destino; só existe quando o momento é "saindo". */
  destinoIbge: string | null
  /** Data da chegada em `YYYY-MM-DD`; só existe quando o momento é "chegando". */
  dataChegada: string | null
  /** Data da saída em `YYYY-MM-DD`; só existe quando o momento é "saindo". */
  dataSaida: string | null
  momento: Momento | null
  interesses: readonly string[]
  grupos: readonly string[]
  avisos: "ativados" | "agora-nao" | null
}

/** O que cada etapa decide sobre si mesma. */
type DefinicaoDaEtapa = {
  id: IdDaEtapa
  /** Entra na barra de progresso. As etapas da conta e o fim não entram. */
  noProgresso: boolean
  /** Mostra o botão de voltar. */
  permiteVoltar: boolean
  /** A etapa só existe quando a condição vale (ausente: sempre). */
  quando?: (p: Progresso) => boolean
}

const precisaDeDocumento = (p: Progresso): boolean =>
  p.verificacao === "nao-encontrada" ||
  p.verificacao === "portal-fora" ||
  p.verificacao === "documento-em-analise"

export const FLUXO_F01: readonly DefinicaoDaEtapa[] = [
  { id: "porta", noProgresso: false, permiteVoltar: false },
  { id: "email", noProgresso: false, permiteVoltar: true, quando: (p) => p.via === "email" },
  { id: "codigo", noProgresso: false, permiteVoltar: true, quando: (p) => p.via === "email" },
  { id: "aceite", noProgresso: true, permiteVoltar: false },
  { id: "cpf", noProgresso: true, permiteVoltar: false, quando: (p) => !p.convite },
  { id: "nome", noProgresso: true, permiteVoltar: false },
  // Quem entra por convite de familiar já tem cidade e vínculo (o aceite cria):
  // a etapa de cidade, a espera e o documento não fazem sentido nesse caminho.
  { id: "cidade", noProgresso: true, permiteVoltar: true, quando: (p) => !p.convite },
  // A espera só aparece se a consulta ainda não terminou quando a pessoa chega
  // aqui, ou se terminou sem confirmar. Com o vínculo confirmado, some.
  {
    id: "verificacao",
    noProgresso: true,
    permiteVoltar: false,
    quando: (p) => !p.convite && p.verificacao !== "confirmada",
  },
  {
    id: "documento",
    noProgresso: true,
    permiteVoltar: true,
    quando: (p) => !p.convite && precisaDeDocumento(p),
  },
  { id: "previa-cidade", noProgresso: true, permiteVoltar: false, quando: (p) => !p.convite },
  { id: "interesses", noProgresso: true, permiteVoltar: true },
  { id: "combinado", noProgresso: true, permiteVoltar: true },
  { id: "avisos", noProgresso: true, permiteVoltar: true },
  { id: "inicio", noProgresso: false, permiteVoltar: false },
]

/** Flags da prévia. Negócio fica fora do onboarding (decisão de 01/11). */
export type Flags = { negocioNosPrimeirosPassos: boolean }
export const FLAGS_PADRAO: Flags = { negocioNosPrimeirosPassos: true }

export function progressoInicial(): Progresso {
  return {
    versao: VERSAO_DO_FLUXO,
    etapa: "porta",
    concluidas: [],
    via: null,
    convite: false,
    emailMascarado: null,
    verificacao: "nao-iniciada",
    nome: null,
    cidade: null,
    cidadeIbge: null,
    destinoIbge: null,
    dataChegada: null,
    dataSaida: null,
    momento: null,
    interesses: [],
    grupos: [],
    avisos: null,
  }
}

function definicao(id: IdDaEtapa): DefinicaoDaEtapa {
  const achada = FLUXO_F01.find((etapa) => etapa.id === id)
  if (achada === undefined) throw new Error(`Etapa fora do fluxo: ${id}`)
  return achada
}

function existe(etapa: DefinicaoDaEtapa, p: Progresso): boolean {
  return etapa.quando === undefined || etapa.quando(p)
}

/** O caminho que vale para este progresso, na ordem da configuração. */
export function caminho(p: Progresso): readonly IdDaEtapa[] {
  return FLUXO_F01.filter((etapa) => existe(etapa, p)).map((etapa) => etapa.id)
}

/**
 * A próxima etapa: a primeira do caminho, depois da atual, que ainda existe.
 * A espera da verificação é pulada quando o vínculo já foi confirmado.
 */
export function proximaEtapa(p: Progresso): IdDaEtapa {
  const ordem = FLUXO_F01.map((etapa) => etapa.id)
  const daqui = ordem.indexOf(p.etapa)
  for (const etapa of FLUXO_F01.slice(daqui + 1)) {
    if (existe(etapa, p)) return etapa.id
  }
  return "inicio"
}

/** Conclui a etapa atual com as mudanças que ela produziu e avança. */
export function concluir(p: Progresso, mudancas: Partial<Progresso> = {}): Progresso {
  const atualizado: Progresso = { ...p, ...mudancas }
  const concluidas = atualizado.concluidas.includes(p.etapa)
    ? atualizado.concluidas
    : [...atualizado.concluidas, p.etapa]
  const comConclusao = { ...atualizado, concluidas }
  return { ...comConclusao, etapa: proximaEtapa(comConclusao) }
}

/** A etapa anterior que a pessoa pode rever, ou `null` se a atual não volta. */
export function etapaAnterior(p: Progresso): IdDaEtapa | null {
  if (!definicao(p.etapa).permiteVoltar) return null
  const lista = caminho(p)
  const posicao = lista.indexOf(p.etapa)
  return posicao > 0 ? (lista[posicao - 1] ?? null) : null
}

export function voltar(p: Progresso): Progresso {
  const anterior = etapaAnterior(p)
  return anterior === null ? p : { ...p, etapa: anterior }
}

/** Fração concluída da barra única de progresso, de 0 a 1. */
export function fracaoDoProgresso(p: Progresso): number | null {
  const contadas = caminho(p).filter((id) => definicao(id).noProgresso)
  const posicao = contadas.indexOf(p.etapa)
  if (posicao === -1) return null
  return (posicao + 1) / (contadas.length + 1)
}

/** Aplica o resultado da consulta do CPF, que chega a qualquer momento. */
export function receberVerificacao(p: Progresso, resultado: Verificacao): Progresso {
  const atualizado = { ...p, verificacao: resultado }
  // Se a pessoa está parada na espera (ou no documento) e o vínculo foi
  // confirmado, segue sozinha para a prévia da cidade.
  const parada = p.etapa === "verificacao" || p.etapa === "documento"
  if (parada && resultado === "confirmada") {
    return { ...atualizado, etapa: proximaEtapa(atualizado) }
  }
  return atualizado
}

/** Contagem pública da cidade: abaixo do mínimo não aparece; acima, em faixas. */
export const MINIMO_PARA_EXIBIR = 10
const FAIXAS = [10, 25, 50, 100, 250, 500, 1000, 5000] as const

export function contagemPublica(total: number, minimo = MINIMO_PARA_EXIBIR): string | null {
  if (!Number.isFinite(total) || total < minimo) return null
  let faixa: number = minimo
  for (const limite of FAIXAS) if (total >= limite && limite >= minimo) faixa = limite
  return `mais de ${faixa.toLocaleString("pt-BR")}`
}

/** Validação local do CPF (dígitos verificadores), antes de qualquer consulta. */
export function cpfValido(entrada: string): boolean {
  const digitos = entrada.replace(/\D/g, "")
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false
  const numeros = [...digitos].map(Number)
  const verificador = (tamanho: number): number => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += (numeros[i] ?? 0) * (tamanho + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return verificador(9) === numeros[9] && verificador(10) === numeros[10]
}

export function mascararCpf(entrada: string): string {
  const d = entrada.replace(/\D/g, "").slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
}

export function mascararEmail(email: string): string {
  const [usuario = "", dominio = ""] = email.trim().split("@")
  return `${usuario.slice(0, 1)}***@${dominio}`
}
