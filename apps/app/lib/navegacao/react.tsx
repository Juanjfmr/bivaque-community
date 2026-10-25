import { useLocation, useRouter, useRouterState } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"

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
import { type CargaDaEntrada, registrarRolagem, restaurarEntrada } from "./restauracao"
import { type Aba, ROTA_INDISPONIVEL, type Rota, rotaPeloCaminho, rotaPorNome } from "./rotas"
import { abrirSobreposicao, voltar as decidirVolta, entrarEmRota } from "./transicoes"

/**
 * A ligação entre a camada fina e o React. As telas futuras falam com esta
 * interface; nada aqui sabe o nome de uma tela do produto.
 */

type Roteador = ReturnType<typeof useRouter>

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
    caminho: ultima?.routeId ?? rota.caminho,
    parametros,
    entrada: lerEntrada(roteador.state.location.state),
  }
}

export function useEntradaDaTela(): EstadoDaEntrada {
  const localizacao = useLocation()
  return lerEntrada(localizacao.state)
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

export type OpcoesDeNavegacao = {
  readonly parametros?: Readonly<Record<string, string>>
  readonly replace?: boolean
  /** Descritor que a entrada de baixo guarda; sem ele, o foco atual. */
  readonly foco?: DescritorDeFoco
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
      // A rota de fallback não tem endereço próprio: reescrever a entrada atual
      // nela trocaria o endereço inválido por outro.
      if (destino === undefined && atual.rota.nome === "indisponivel") return Promise.resolve()
      const caminho = destino?.caminho ?? atual.caminho
      const parametros = destino?.parametros ?? atual.parametros
      return roteador.navigate({
        to: caminho,
        params: parametros,
        state: { [CHAVE_DA_ENTRADA]: transformar(atual.entrada) },
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
      const destinoRota = rotaPorNome(destino)
      if (!destinoRota) return
      const atual = lerEstadoDaRota(roteador)
      const decisao = entrarEmRota({ atual: atual.entrada, rotaAtual: atual.rota.nome })
      // A entrada que fica para trás guarda onde a pessoa parou e o que abriu
      // a próxima tela; é o que o Voltar devolve.
      await gravar(
        (entrada) => ({
          ...entrada,
          foco: opcoes.foco ?? descritorDoFocoAtual(),
          rolagem: rolagemAtual(),
        }),
        true,
      )
      await roteador.navigate({
        to: destinoRota.caminho,
        params: opcoes.parametros ?? {},
        state: { [CHAVE_DA_ENTRADA]: decisao.entrada },
        replace: opcoes.replace ?? decisao.replace,
        resetScroll: false,
      })
    },
    [gravar, roteador],
  )

  const abrir = useCallback(
    async (id: Sobreposicao): Promise<void> => {
      const atual = lerEstadoDaRota(roteador)
      const comFoco: EstadoDaEntrada = {
        ...atual.entrada,
        foco: descritorDoFocoAtual(),
        rolagem: rolagemAtual(),
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
    async (estado: unknown): Promise<void> => {
      if (temEntrada(estado)) return
      const atual = lerEstadoDaRota(roteador)
      // A rota de fallback não tem endereço próprio para reescrever: ela fica com
      // a identidade estável de "sem registro".
      if (atual.rota.nome === "indisponivel") return
      const entrada = entradaPadrao({ origem: atual.entrada.origem, pai: atual.entrada.pai })
      await gravar(() => entrada, true)
    },
    [gravar, roteador],
  )

  return { irPara, atualizar, atualizarCom, abrir, fecharSobreposicao, voltar, materializarEntrada }
}
