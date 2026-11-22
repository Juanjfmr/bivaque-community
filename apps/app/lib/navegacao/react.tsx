import { useLocation, useRouter, useRouterState } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"

import { abaAtiva } from "./abas"
import {
  alturaRolavelAtual,
  ambienteDoDocumento,
  conteudoDoDocumento,
  descritorDoFocoAtual,
  rolagemAtual,
} from "./dom"
import {
  atualizarEntrada,
  CHAVE_DA_ENTRADA,
  type DescritorDeFoco,
  type EstadoDaEntrada,
  entradaPadrao,
  lerEntrada,
  type MudancaDaEntrada,
  type Sobreposicao,
  temEntrada,
} from "./entrada"
import {
  type CargaDaEntrada,
  criarCargaPendente,
  registrarRolagem,
  restaurarEntrada,
} from "./restauracao"
import {
  type Aba,
  ENDERECOS_ANTIGOS_DO_MERCADO,
  ROTA_INDISPONIVEL,
  type Rota,
  rotaCanonica,
  rotaPeloCaminho,
  rotaPorNome,
  type SubAbaDoMercado,
} from "./rotas"
import {
  abrirSobreposicao,
  buscaAoTrocarDeRota,
  voltar as decidirVolta,
  entrarEmRota,
  materializarSeNecessario,
} from "./transicoes"

/**
 * A ligação entre a camada fina e o React. As telas futuras falam com esta
 * interface; nada aqui sabe o nome de uma tela do produto.
 */

type Roteador = ReturnType<typeof useRouter>

/**
 * A materialização inicial é assíncrona. Navegar antes de seu commit pode
 * reordenar replaces e apagar uma sobreposição recém-aberta. Uma pendência por
 * instância do roteador serializa somente essa primeira escrita.
 */
const MATERIALIZACOES = new WeakMap<Roteador, Promise<void>>()

async function esperarMaterializacao(roteador: Roteador): Promise<void> {
  // Falha na materialização não deve impedir a navegação da pessoa.
  await MATERIALIZACOES.get(roteador)?.catch(() => {})
}

type EstadoDaRota = {
  readonly rota: Rota
  /** Caminho registrado no roteador (o `routeId`), com o parâmetro quando há. */
  readonly caminho: string
  readonly parametros: Record<string, string>
  readonly entrada: EstadoDaEntrada
}

function lerEstadoDaRota(roteador: Roteador): EstadoDaRota {
  const correspondencias = roteador.state.matches
  const ultima = correspondencias[correspondencias.length - 1]
  const rota = rotaPeloCaminho(ultima?.routeId ?? "") ?? ROTA_INDISPONIVEL
  const parametros: Record<string, string> = {}
  const brutos: Record<string, unknown> = ultima?.params ?? {}
  for (const [chave, valor] of Object.entries(brutos)) {
    if (typeof valor === "string") parametros[chave] = valor
  }
  return {
    rota,
    // O caminho do match, e não o molde do catálogo: `/ajuda` sem tópico
    // continua `/ajuda`, em vez de virar `/ajuda/undefined`.
    caminho:
      ultima?.routeId === "__root__"
        ? ROTA_INDISPONIVEL.caminho
        : (ultima?.routeId ?? rota.caminho),
    parametros,
    entrada: lerEntrada(roteador.state.location.state),
  }
}

export function useEntradaDaTela(): EstadoDaEntrada {
  const localizacao = useLocation()
  return lerEntrada(localizacao.state)
}

/** A busca (query string) da rota atual, só com valores de texto. */
export function useBuscaDaRota(): Readonly<Record<string, string>> {
  const localizacao = useLocation()
  const valores: Record<string, string> = {}
  for (const [chave, valor] of Object.entries(localizacao.search as Record<string, unknown>)) {
    if (typeof valor === "string") valores[chave] = valor
  }
  return valores
}

/**
 * Troca só a busca da rota atual, em `replace` (TROCA-005): aba escolhida não
 * vira uma entrada nova no histórico — o Voltar volta à tela anterior, não à aba
 * anterior. A entrada da tela é preservada, então rolagem e foco continuam dela.
 */
export function useTrocarBusca(): (busca: Readonly<Record<string, string>>) => Promise<void> {
  const roteador = useRouter()
  return useCallback(
    (busca: Readonly<Record<string, string>>) => {
      const atual = lerEstadoDaRota(roteador)
      return roteador.navigate({
        to: atual.caminho,
        params: atual.parametros,
        search: { ...busca },
        state: { [CHAVE_DA_ENTRADA]: atual.entrada },
        replace: true,
        resetScroll: false,
      })
    },
    [roteador],
  )
}

export function useRotaAtual(): Rota {
  const estado = useRouterState()
  const ultima = estado.matches[estado.matches.length - 1]
  return rotaPeloCaminho(ultima?.routeId ?? "") ?? ROTA_INDISPONIVEL
}

export function useAbaDaEntrada(): Aba | null {
  const rota = useRotaAtual()
  const entrada = useEntradaDaTela()
  return abaAtiva(rota.nome, entrada.origem)
}

/**
 * Guarda e restaura o que a entrada carrega — chamado pela própria tela, que é
 * quem conhece a sua carga.
 *
 * Toda entrada é restaurada do mesmo jeito: a nova já nasce com rolagem zero e
 * sem descritor de foco, e o Voltar/Avançar trazem os valores guardados. Não há
 * classificação de ação (o roteador emite `replace` também quando só o estado
 * da entrada muda), e a identidade da entrada (`chave`) impede que uma troca de
 * filtro ou uma simples reescrita de rolagem dispare restauração.
 */
export function useRolagemEFoco(carga: CargaDaEntrada): void {
  const roteador = useRouter()
  const entrada = useEntradaDaTela()
  const { atualizarCom } = useNavegacao()

  // Registra a rolagem da entrada enquanto a pessoa rola.
  useEffect(() => {
    const alvo = conteudoDoDocumento()
    if (!alvo) return
    const aoRolar = () => {
      const atual = lerEntrada(roteador.state.location.state)
      const proxima = registrarRolagem(atual, alturaRolavelAtual(), rolagemAtual())
      if (proxima.rolagem === atual.rolagem) return
      void atualizarCom(() => proxima)
    }
    alvo.addEventListener("scroll", aoRolar, { passive: true })
    return () => alvo.removeEventListener("scroll", aoRolar)
  }, [roteador, atualizarCom])

  const chaveDaEntrada = entrada.chave

  // Espera a carga da entrada e só então aplica rolagem e foco. O estado é lido
  // do roteador (e não do render) para que uma reescrita de rolagem ou de filtro
  // — que não muda `chave` — não reinicie a restauração.
  useEffect(() => {
    const atual = lerEntrada(roteador.state.location.state)
    // O efeito roda por mudança de entrada. Se o roteador já está em outra, quem
    // restaura é o efeito da entrada nova — este aqui fica para trás.
    if (atual.chave !== chaveDaEntrada) return
    if (atual.sobreposicao !== null) return
    const controle = new AbortController()
    void restaurarEntrada({
      rolagem: atual.rolagem,
      foco: atual.foco,
      carga,
      ambiente: ambienteDoDocumento(),
      sinal: controle.signal,
    })
    return () => controle.abort()
  }, [chaveDaEntrada, carga, roteador])
}

/**
 * A carga de uma lista que ainda vai chegar (NAV-001).
 *
 * As telas que buscam do servidor renderizam curto no primeiro quadro: restaurar
 * a rolagem ali a grudaria no zero. Esta carga só libera a restauração quando a
 * lista está pronta (`pronta`), e a tela continua sendo quem decide o que é
 * "pronta" — o dado chegou ou a falha já tem a sua tela.
 */
export function useCargaDaLista(pronta: boolean): CargaDaEntrada {
  const [carga] = useState(() => criarCargaPendente())
  useEffect(() => {
    if (pronta) carga.confirmar()
  }, [carga, pronta])
  return carga
}

export type OpcoesDeNavegacao = {
  readonly parametros?: Readonly<Record<string, string>>
  readonly replace?: boolean
  /** Descritor que a entrada de baixo guarda; sem ele, o foco atual. */
  readonly foco?: DescritorDeFoco
  /** Aba do Mercado no endereço (`?aba=`), quando o destino é o Mercado. */
  readonly aba?: SubAbaDoMercado
}

/**
 * Liga a abertura de uma sobreposição ao estado da **entrada**, e não a um
 * `useState` do componente: abrir empilha uma entrada no roteador (o Voltar do
 * sistema fecha antes de trocar de rota) e o estado aberto sobrevive a uma
 * recarga da entrada.
 *
 * É o que permite o menu de contexto da linha (§7, `Menu ⋮`) e a confirmação
 * (§7, `confirm`) usarem o mecanismo único da onda 1b sem competir com ele.
 */
export function useSobreposicaoDaEntrada(id: Sobreposicao): {
  readonly aberto: boolean
  readonly aoMudarAberto: (aberto: boolean) => void
} {
  const entrada = useEntradaDaTela()
  const navegacao = useNavegacao()
  return {
    aberto: entrada.sobreposicao === id,
    aoMudarAberto(aberto: boolean) {
      if (aberto) {
        if (entrada.sobreposicao === null) void navegacao.abrir(id)
        return
      }
      if (entrada.sobreposicao === id) navegacao.fecharSobreposicao()
    },
  }
}

export type Navegacao = {
  irPara(destino: string, opcoes?: OpcoesDeNavegacao): Promise<void>
  atualizar(mudanca: MudancaDaEntrada): Promise<void>
  atualizarCom(transformar: (atual: EstadoDaEntrada) => EstadoDaEntrada): Promise<void>
  abrir(id: Sobreposicao): Promise<void>
  fecharSobreposicao(): void
  voltar(): Promise<void>
  /** Garante registro próprio na entrada atual, uma única vez. */
  materializarEntrada(estado: unknown): Promise<void>
}

export function useNavegacao(): Navegacao {
  const roteador = useRouter()

  const gravar = useCallback(
    (
      transformar: (atual: EstadoDaEntrada) => EstadoDaEntrada,
      replace: boolean,
      destino?: { readonly caminho: string; readonly parametros: Record<string, string> },
    ): Promise<void> => {
      const atual = lerEstadoDaRota(roteador)
      // A rota de fallback literal ("/indisponivel") não tem endereço próprio:
      // reescrever a entrada atual nela trocaria o endereço inválido por outro.
      // A checagem é pelo caminho, e não por `rota.nome`: a galeria de prova tem
      // endereço próprio e cai em `ROTA_INDISPONIVEL` só por não estar no
      // catálogo — e precisa da entrada materializada para devolver o foco.
      if (destino === undefined && atual.caminho === ROTA_INDISPONIVEL.caminho)
        return Promise.resolve()
      const entrada = transformar(atual.entrada)
      if (entrada === atual.entrada) return Promise.resolve()
      const caminho = destino?.caminho ?? atual.caminho
      const parametros = destino?.parametros ?? atual.parametros
      return roteador.navigate({
        to: caminho,
        params: parametros,
        state: { [CHAVE_DA_ENTRADA]: entrada },
        replace,
        resetScroll: false,
      })
    },
    [roteador],
  )

  const atualizar = useCallback(
    (mudanca: MudancaDaEntrada) => gravar((atual) => atualizarEntrada(atual, mudanca), true),
    [gravar],
  )

  const atualizarCom = useCallback(
    (transformar: (atual: EstadoDaEntrada) => EstadoDaEntrada) => gravar(transformar, true),
    [gravar],
  )

  const irPara = useCallback(
    async (destino: string, opcoes: OpcoesDeNavegacao = {}): Promise<void> => {
      // Endereço antigo do Mercado não se navega: vai direto ao Mercado, na aba
      // que ele representava (NAV-002).
      const destinoRota = rotaPorNome(rotaCanonica(destino))
      if (!destinoRota) return
      // Foco e rolagem pertencem ao clique original, antes de aguardar o
      // registro inicial e possíveis commits da casca.
      const foco = opcoes.foco ?? descritorDoFocoAtual()
      const rolagem = rolagemAtual()
      await esperarMaterializacao(roteador)
      const atual = lerEstadoDaRota(roteador)
      const decisao = entrarEmRota({
        atual: atual.entrada,
        rotaAtual: atual.rota.nome,
        rotaDestino: destinoRota.nome,
        replace: opcoes.replace ?? atual.entrada.sobreposicao !== null,
      })
      // Trocar de rota (ex.: desapegos → imóveis) não leva a busca da tela
      // anterior: cada rota lê só os próprios parâmetros (F06). A aba do
      // Mercado substitui a busca pela aba pedida.
      const abaDoDestino = ENDERECOS_ANTIGOS_DO_MERCADO[destino]
      const busca =
        opcoes.aba !== undefined
          ? { aba: opcoes.aba }
          : abaDoDestino === undefined
            ? buscaAoTrocarDeRota(atual.rota.nome, destinoRota.nome)
            : { aba: abaDoDestino }
      // A entrada que fica para trás guarda onde a pessoa parou e o que abriu
      // a próxima tela; é o que o Voltar devolve.
      await gravar(
        (entrada) => ({
          ...entrada,
          foco,
          rolagem,
        }),
        true,
      )
      await roteador.navigate({
        to: destinoRota.caminho,
        params: opcoes.parametros ?? {},
        ...(busca === undefined ? {} : { search: busca }),
        state: { [CHAVE_DA_ENTRADA]: decisao.entrada },
        replace: opcoes.replace ?? decisao.replace,
        resetScroll: false,
      })
    },
    [gravar, roteador],
  )

  const abrir = useCallback(
    async (id: Sobreposicao): Promise<void> => {
      const foco = descritorDoFocoAtual()
      const rolagem = rolagemAtual()
      await esperarMaterializacao(roteador)
      const atual = lerEstadoDaRota(roteador)
      const comFoco: EstadoDaEntrada = {
        ...atual.entrada,
        foco,
        rolagem,
      }
      await gravar(() => comFoco, true)
      await roteador.navigate({
        to: atual.caminho,
        params: atual.parametros,
        state: { [CHAVE_DA_ENTRADA]: abrirSobreposicao(comFoco, id) },
        resetScroll: false,
      })
    },
    [gravar, roteador],
  )

  const fecharSobreposicao = useCallback((): void => {
    roteador.history.back()
  }, [roteador])

  const voltar = useCallback(async (): Promise<void> => {
    await esperarMaterializacao(roteador)
    const atual = lerEstadoDaRota(roteador)
    const decisao = decidirVolta(atual.entrada, atual.rota.pai)
    if (decisao.popar) {
      roteador.history.back()
      return
    }
    if (decisao.nome === null) return
    const destino = rotaPorNome(decisao.nome)
    if (!destino) return
    const origem = abaAtiva(destino.nome, atual.entrada.origem) ?? atual.entrada.origem
    await roteador.navigate({
      to: destino.caminho,
      state: { [CHAVE_DA_ENTRADA]: entradaPadrao({ origem, pai: null }) },
      replace: true,
      resetScroll: false,
    })
  }, [roteador])

  const materializarEntrada = useCallback(
    (estado: unknown): Promise<void> => {
      const pendente = MATERIALIZACOES.get(roteador)
      if (pendente) return pendente
      // O estado recebido pela casca pode ser de um render anterior. Conferir
      // também o roteador atual evita regravar uma sobreposição já aberta.
      if (temEntrada(estado) || temEntrada(roteador.state.location.state)) return Promise.resolve()
      const atual = lerEstadoDaRota(roteador)
      // A rota de fallback literal não tem endereço próprio para reescrever.
      if (atual.caminho === ROTA_INDISPONIVEL.caminho) return Promise.resolve()
      const tarefa = gravar(materializarSeNecessario, true)
      MATERIALIZACOES.set(roteador, tarefa)
      const limpar = () => {
        if (MATERIALIZACOES.get(roteador) === tarefa) MATERIALIZACOES.delete(roteador)
      }
      void tarefa.then(limpar, limpar)
      return tarefa
    },
    [gravar, roteador],
  )

  return { irPara, atualizar, atualizarCom, abrir, fecharSobreposicao, voltar, materializarEntrada }
}
