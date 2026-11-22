import { rotaPorNome } from "./navegacao/rotas"

/**
 * As regras da casca por rota, puras (inventário §5).
 *
 * A casca tem três formas — app, entrada e painel do dono (§5, tabela "Onde a
 * casca muda por rota") — e, dentro da forma do app, a barra do topo, o chip de
 * cidade, os avisos, as conversas e a busca mudam conforme a rota. Aqui isso é
 * conta; quem desenha é `src/casca/`.
 */

export type AcoesDaBarra = {
  /** A rota usa a casca do app (barra do topo e navegação). */
  readonly barra: boolean
  /** Rota-raiz: mostra a marca em vez do botão Voltar (§5.2). */
  readonly marca: boolean
  readonly voltar: boolean
  /** Botão de avisos com contador — só na Início (§5.2). */
  readonly avisos: boolean
  /** Ícone de Conversas no topo, com contador (§3.1 do ADR). */
  readonly conversas: boolean
  /** Botão Buscar à direita, nas telas de dentro (§5.2). */
  readonly busca: boolean
  /** A rota `busca` toma a barra inteira com o campo (§5.2). */
  readonly buscaEmTelaCheia: boolean
  /** Rota-raiz, para a navegação de baixo e o Criar (§5.3). */
  readonly raiz: boolean
}

const ROTAS_COM_CASCA_PROPRIA = new Set(["entrar", "dono"])

export function acoesDaBarraDoTopo(nomeDaRota: string): AcoesDaBarra {
  const rota = rotaPorNome(nomeDaRota)
  const raiz = rota?.raiz ?? false
  const casca = rota?.casca ?? "app"
  const barra = casca === "app" && !ROTAS_COM_CASCA_PROPRIA.has(nomeDaRota)
  return {
    barra,
    raiz: barra && raiz,
    marca: barra && raiz,
    voltar: barra && !raiz,
    avisos: barra && nomeDaRota === "inicio",
    conversas: barra,
    busca: barra && !raiz && nomeDaRota !== "busca",
    buscaEmTelaCheia: barra && nomeDaRota === "busca",
  }
}

/**
 * §5.3: no celular a barra de baixo só aparece nas rotas-raiz
 * (`syncMobileNavigation`); a partir de 1024 px ela é a coluna da esquerda e
 * nunca some.
 */
export function navegacaoVisivel(nomeDaRota: string, largura: number): boolean {
  if (largura >= 1024) return true
  return rotaPorNome(nomeDaRota)?.raiz ?? false
}

/** §5.3: o Criar acompanha a barra de baixo. */
export function criaVisivel(nomeDaRota: string, largura: number): boolean {
  if (largura >= 1024) return true
  return rotaPorNome(nomeDaRota)?.raiz ?? false
}

/** §5.2: vendo outra cidade, a faixa de visita aparece no alto do conteúdo. */
export function mostraFaixaDeVisita(vendoOutraCidade: boolean): boolean {
  return vendoOutraCidade
}

export function textoDaFaixaDeVisita(cidadeVista: string, cidadeDaPessoa: string): string {
  return `Você está conhecendo ${cidadeVista}. Sua cidade atual é ${cidadeDaPessoa}.`
}

/**
 * A cidade do chip e a cidade de casa (BUG-CIDADE-GRUPOS).
 *
 * A cidade é a da SESSÃO — vínculo `kind = 'current'` —, nunca um valor de
 * demonstração: o chip dizia "Manaus" enquanto o Início dizia "Rio de Janeiro".
 * Vazio quer dizer "a sessão ainda não disse": o chip mostra o rótulo neutro em
 * vez de afirmar uma cidade. A semente da prova manda em modo de prova (é
 * entrada da prova, não medida).
 */
export type CidadeDaCasca = Readonly<{ cidade: string; cidadeDeCasa: string }>

export function cidadesDaCasca(semente: Partial<CidadeDaCasca>): CidadeDaCasca {
  return { cidade: semente.cidade ?? "", cidadeDeCasa: semente.cidadeDeCasa ?? "" }
}

/**
 * A cidade da sessão chegou — pelo perfil ou pela consulta do Início. Sem troca
 * pelo chip, a vista e a casa passam a ser a da sessão; com troca já feita, só a
 * casa muda, e a cidade escolhida continua na faixa de visita. Idempotente: as
 * duas fontes podem chamar na ordem que for.
 */
export function comCidadeDaSessao(atual: CidadeDaCasca, cidadeDaSessao: string): CidadeDaCasca {
  const sessao = cidadeDaSessao.trim()
  if (sessao === "") return atual
  if (atual.cidade === atual.cidadeDeCasa) return { cidade: sessao, cidadeDeCasa: sessao }
  return { cidade: atual.cidade, cidadeDeCasa: sessao }
}

/** O chip consulta outra cidade: a vista muda, a de casa continua a da sessão. */
export function comCidadeTrocada(atual: CidadeDaCasca, cidade: string): CidadeDaCasca {
  const limpa = cidade.trim()
  if (limpa === "") return atual
  return { cidade: limpa, cidadeDeCasa: atual.cidadeDeCasa }
}

/**
 * A cidade que nomeia o CONTEÚDO do Início: a que a consulta confirmou — a da
 * sessão. A cidade escolhida no chip aparece só na faixa de visita; o título, o
 * vazio e o `local` das perguntas não falam de outra cidade. Sem a consulta
 * ainda, o chip serve de rótulo; sem nada, "sua cidade", que não afirma nada.
 */
export function cidadeDoConteudo(cidadeDosDados: string | null, cidadeDaCasca: string): string {
  const confirmada = cidadeDosDados?.trim() ?? ""
  if (confirmada !== "") return confirmada
  const daCasca = cidadeDaCasca.trim()
  return daCasca !== "" ? daCasca : "sua cidade"
}
