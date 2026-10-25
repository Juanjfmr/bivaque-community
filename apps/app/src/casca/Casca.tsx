import { Outlet, useLocation } from "@tanstack/react-router"
import { useLayoutEffect } from "react"

import {
  useAbaDaEntrada,
  useEntradaDaTela,
  useNavegacao,
  useRotaAtual,
} from "@/lib/navegacao/react"
import { Sobreposicoes } from "@/src/casca/Sobreposicoes"
import { usePortaDeCargas } from "@/src/contexto/cargas"
import { modoDeProvaAtivo } from "@/src/modo-de-prova"
import { tituloDaTela } from "@/src/titulos"

/**
 * A casca: barra do topo, navegação principal (Início · Comunidade · [Criar] ·
 * Mercado · Você), o conteúdo rolável e as sobreposições. Conversas fica no
 * topo, como ícone, nunca na barra de baixo.
 *
 * Entrada e painel do dono trocam a casca (inventário §5): sem barra do app.
 */
export function Casca() {
  const rota = useRotaAtual()
  const entrada = useEntradaDaTela()
  const aba = useAbaDaEntrada()
  const navegacao = useNavegacao()
  const prova = modoDeProvaAtivo()
  const comCascaDoApp = rota.casca === "app"
  const bloqueado = entrada.sobreposicao !== null
  const localizacao = useLocation()
  const materializarEntrada = navegacao.materializarEntrada
  const estadoDaLocalizacao = localizacao.state

  // A entrada nasce registrada pelo roteador: uma vez, antes de pintar. Assim a
  // identidade dela é estável e nenhum re-render reinicia a restauração.
  useLayoutEffect(() => {
    void materializarEntrada(estadoDaLocalizacao)
  }, [materializarEntrada, estadoDaLocalizacao])

  return (
    <div data-casca={rota.casca}>
      {comCascaDoApp ? (
        <header data-casca="topo">
          {rota.raiz ? null : (
            <button
              type="button"
              data-acao="voltar"
              aria-label="Voltar"
              onClick={() => void navegacao.voltar()}
            >
              Voltar
            </button>
          )}
          <span data-titulo="topo">{tituloDaTela(rota.nome)}</span>
          <button
            type="button"
            data-acao="conversas-topo"
            aria-label="Conversas"
            onClick={() => void navegacao.irPara("conversas")}
          >
            Conversas
          </button>
          {rota.raiz ? null : (
            <button
              type="button"
              data-acao="buscar"
              aria-label="Buscar"
              onClick={() => void navegacao.irPara("busca")}
            >
              Buscar
            </button>
          )}
        </header>
      ) : null}

      <div data-casca="corpo">
        <main id="conteudo" data-conteudo tabIndex={-1} inert={comCascaDoApp && bloqueado}>
          <Outlet />
        </main>

        {comCascaDoApp ? (
          <nav data-nav="principal" aria-label="Navegação principal" inert={bloqueado}>
            <button
              type="button"
              data-aba="inicio"
              aria-current={aba === "inicio" ? "page" : false}
              onClick={() => void navegacao.irPara("inicio")}
            >
              Início
            </button>
            <button
              type="button"
              data-aba="comunidade"
              aria-current={aba === "comunidade" ? "page" : false}
              onClick={() => void navegacao.irPara("comunidade")}
            >
              Comunidade
            </button>
            <button
              type="button"
              data-acao="criar"
              aria-haspopup="menu"
              onClick={() => void navegacao.abrir("menu-criar")}
            >
              Criar
            </button>
            <button
              type="button"
              data-aba="mercado"
              aria-current={aba === "mercado" ? "page" : false}
              onClick={() => void navegacao.irPara("mercado")}
            >
              Mercado
            </button>
            <button
              type="button"
              data-aba="voce"
              aria-current={aba === "voce" ? "page" : false}
              onClick={() => void navegacao.irPara("voce")}
            >
              Você
            </button>
          </nav>
        ) : null}
      </div>

      <Sobreposicoes />
      {prova ? <ControlesDeProva /> : null}
    </div>
  )
}

/** Andaime de prova: libera as cargas pendentes, inclusive as de tela que saiu. */
function ControlesDeProva() {
  const porta = usePortaDeCargas()
  return (
    <div data-prova="controles-do-app">
      <button type="button" data-acao="liberar-lista" onClick={() => porta.liberarTodas()}>
        Liberar cargas pendentes
      </button>
    </div>
  )
}
