import { Outlet, useLocation } from "@tanstack/react-router"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { FaixaDeVisita } from "@/components/bivaque/faixa-de-contexto"
import { mostraFaixaDeVisita } from "@/lib/casca"
import {
  calcularMinimizada,
  prefersReduzido,
  tituloDeveDocar,
  tituloPodeSubir,
} from "@/lib/movimento"
import { useEntradaDaTela, useNavegacao, useRotaAtual } from "@/lib/navegacao/react"
import { BarraDoTopo } from "@/src/casca/BarraDoTopo"
import { useLarguraDaTela } from "@/src/casca/ganchos"
import { useAtalhoDoCriar } from "@/src/casca/MenuCriar"
import { NavegacaoPrincipal } from "@/src/casca/NavegacaoPrincipal"
import { Paleta } from "@/src/casca/Paleta"
import { Sobreposicoes } from "@/src/casca/Sobreposicoes"
import { usePortaDeCargas } from "@/src/contexto/cargas"
import { useCasca } from "@/src/contexto/casca"
import { modoDeProvaAtivo } from "@/src/modo-de-prova"

/**
 * A casca da onda 1c: barra do topo por rota, navegação principal, o conteúdo
 * rolável, as sobreposições e a faixa de visita.
 *
 * Quatro coisas do protótipo vivem aqui, porque são da casca e não de uma tela:
 * a minimização da navegação ao rolar (§6, item 27), o título grande que sobe
 * (§6, item 29), a troca de página (§6, item 1) e o `inert` do conteúdo quando
 * há sobreposição. As decisões são puras (`lib/movimento.ts`, `lib/casca.ts`);
 * aqui é só a ligação com a rolagem e com o roteador.
 */
export function Casca() {
  const rota = useRotaAtual()
  const entrada = useEntradaDaTela()
  const navegacao = useNavegacao()
  const casca = useCasca()
  const prova = modoDeProvaAtivo()
  const largura = useLarguraDaTela()
  const comCascaDoApp = rota.casca === "app"
  const bloqueado = entrada.sobreposicao !== null
  const localizacao = useLocation()
  const materializarEntrada = navegacao.materializarEntrada
  const estadoDaLocalizacao = localizacao.state

  const [minimizada, definirMinimizada] = useState(false)
  const [docada, definirDocada] = useState(false)
  const ultimoY = useRef(0)
  // A decisão de rolagem precisa do valor atual de `minimizada` no instante do
  // evento: um atualizador funcional só roda no próximo render, quando
  // `ultimoY` já foi sobrescrito e a comparação ficaria sempre falsa.
  const minimizadaRef = useRef(false)

  const aplicarMinimizada = useCallback((valor: boolean) => {
    minimizadaRef.current = valor
    definirMinimizada(valor)
  }, [])

  // A entrada nasce registrada pelo roteador: uma vez, antes de pintar. Assim a
  // identidade dela é estável e nenhum re-render reinicia a restauração.
  useLayoutEffect(() => {
    void materializarEntrada(estadoDaLocalizacao)
  }, [materializarEntrada, estadoDaLocalizacao])

  useAtalhoDoCriar(() => {
    if (entrada.sobreposicao === null) void navegacao.abrir("menu-criar")
  }, comCascaDoApp)

  const medir = useCallback(() => {
    const alvo = document.getElementById("conteudo")
    const barra = document.querySelector<HTMLElement>('[data-topo="barra"]')
    if (!alvo) return
    const alturaDaBarra = barra?.getBoundingClientRect().bottom ?? 0
    const titulo = alvo.querySelector<HTMLElement>("[data-titulo-da-tela]")
    definirDocada(
      tituloDeveDocar(
        titulo?.getBoundingClientRect().bottom ?? 0,
        alturaDaBarra,
        tituloPodeSubir(rota.nome, window.innerWidth),
      ),
    )
  }, [rota.nome])

  // A rolagem é uma só, passiva, como no protótipo (`shell/navigation.js:97`).
  useEffect(() => {
    const alvo = document.getElementById("conteudo")
    if (!alvo) return
    ultimoY.current = alvo.scrollTop
    let usandoTeclado = false
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab") return
      usandoTeclado = true
      aplicarMinimizada(false)
    }
    const aoPonteiro = () => {
      usandoTeclado = false
    }
    const aoRolar = () => {
      const y = alvo.scrollTop
      const proxima = calcularMinimizada({
        y,
        ultimoY: ultimoY.current,
        minimizada: minimizadaRef.current,
        largura: window.innerWidth,
        raiz: rota.raiz,
        menuCriarAberto: entrada.sobreposicao === "menu-criar",
      })
      ultimoY.current = y
      const podeMinimizar = proxima && !usandoTeclado
      if (podeMinimizar !== minimizadaRef.current) aplicarMinimizada(podeMinimizar)
      medir()
    }
    const aoRedimensionar = () => {
      aplicarMinimizada(false)
      medir()
    }
    alvo.addEventListener("scroll", aoRolar, { passive: true })
    alvo.addEventListener("wheel", aoPonteiro, { passive: true })
    window.addEventListener("pointerdown", aoPonteiro, { passive: true })
    window.addEventListener("keydown", aoTeclar)
    window.addEventListener("resize", aoRedimensionar)
    aoRedimensionar()
    return () => {
      alvo.removeEventListener("scroll", aoRolar)
      alvo.removeEventListener("wheel", aoPonteiro)
      window.removeEventListener("pointerdown", aoPonteiro)
      window.removeEventListener("keydown", aoTeclar)
      window.removeEventListener("resize", aoRedimensionar)
    }
  }, [aplicarMinimizada, entrada.sobreposicao, medir, rota.raiz])

  // A troca de página: as raízes não animam, e movimento reduzido não anima nada.
  // A troca de página: as raízes não animam, e movimento reduzido não anima nada.
  // A chave é o **nome da rota resolvida**, e não a URL: `useLocation` e os
  // `matches` do roteador podem chegar em commits diferentes; comparar a URL
  // contra um `rota` ainda antigo marcaria a entrada como "raiz" e engoliria a
  // animação antes de ela começar.
  const nomeDaRota = rota.nome
  const nomeAnterior = useRef(nomeDaRota)
  const [entrando, definirEntrando] = useState(false)

  useEffect(() => {
    if (nomeAnterior.current === nomeDaRota) return
    nomeAnterior.current = nomeDaRota
    if (!comCascaDoApp || rota.raiz || prefersReduzido()) {
      definirEntrando(false)
      return
    }
    definirEntrando(true)
  }, [comCascaDoApp, nomeDaRota, rota.raiz])

  return (
    <div data-casca={rota.casca}>
      <BarraDoTopo docada={docada} podeSubir={tituloPodeSubir(rota.nome, largura)} />

      <div data-casca="corpo">
        <main
          id="conteudo"
          data-conteudo="sim"
          tabIndex={-1}
          aria-label="Conteúdo"
          inert={comCascaDoApp && bloqueado}
        >
          {comCascaDoApp && mostraFaixaDeVisita(casca.vendoOutraCidade) ? (
            <FaixaDeVisita
              cidadeVista={casca.cidade}
              cidadeDaPessoa={casca.cidadeDeCasa}
              aoVoltar={() => casca.voltarParaCasa()}
            />
          ) : null}
          <div
            data-animacao="pagina"
            data-entrando={entrando ? "sim" : "nao"}
            onAnimationEnd={(evento) => {
              // `animationend` sobe dos filhos: só a animação da própria página
              // encerra a entrada. Uma animação de descendente derrubaria o
              // estado antes de a página entrar.
              if (evento.target === evento.currentTarget) definirEntrando(false)
            }}
          >
            <Outlet />
          </div>
        </main>

        {comCascaDoApp ? <NavegacaoPrincipal largura={largura} minimizada={minimizada} /> : null}
      </div>

      <Sobreposicoes />
      {comCascaDoApp && !prova ? <Paleta /> : null}
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
