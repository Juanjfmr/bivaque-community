"use client"

import { type ReactNode, useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { SECOES, secaoNaLinha } from "./secoes"

/**
 * O cabeçalho fixo do Guia e o molde das seções.
 *
 * A barra fica presa no topo da rolagem e leva três coisas pequenas: o título
 * "Guia", a cidade — que aparece só aqui na tela — e as âncoras das seções. A
 * âncora da seção em leitura fica marcada, então o nome da seção continua à
 * vista depois que o título grande saiu: é o subtítulo que acompanha a rolagem.
 *
 * A cidade fica na barra e não no `<h1>` porque o título tem de caber numa
 * linha no 375 ("Guia"), e o nome da cidade é dado variável.
 */

/** O texto de corpo do Guia: token secundário, entrelinha de leitura. */
const CORPO = "text-[15px] leading-[1.65] text-(--on-surface-variant)"

export function CorpoDoGuia({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p data-guia="corpo" className={cn(CORPO, className)}>
      {children}
    </p>
  )
}

/** As mesmas medidas valem para a lista de itens de um passo. */
export const CORPO_DO_GUIA = CORPO

export function CabecalhoDoGuia({ cidade }: { cidade: string }) {
  const [ativa, setAtiva] = useState("")

  // A rolagem é de `#conteudo`, não do documento: o ouvinte é dele e o quadro
  // guarda a medida de todas as seções de uma vez por quadro.
  useEffect(() => {
    const caixa = document.getElementById("conteudo")
    if (caixa === null) return
    let quadro = 0

    const medir = () => {
      quadro = 0
      const borda = caixa.getBoundingClientRect()
      const linha = borda.top + borda.height * 0.4
      const topos = Array.from(
        caixa.querySelectorAll<HTMLElement>('[data-tela="guia"] [data-guia="secao"]'),
      ).map((secao) => ({ id: secao.id, topo: secao.getBoundingClientRect().top }))
      setAtiva(secaoNaLinha(topos, linha))
    }

    const pedir = () => {
      if (quadro === 0) quadro = requestAnimationFrame(medir)
    }

    medir()
    caixa.addEventListener("scroll", pedir, { passive: true })
    window.addEventListener("resize", pedir)
    return () => {
      if (quadro !== 0) cancelAnimationFrame(quadro)
      caixa.removeEventListener("scroll", pedir)
      window.removeEventListener("resize", pedir)
    }
  }, [])

  // A âncora não muda o endereço: a rolagem do app é da entrada, e o histórico
  // já guarda a posição. O foco vai para o título da seção, que é o destino
  // real de quem usa teclado ou leitor de tela.
  const irParaSecao = (id: string) => {
    const secao = document.getElementById(id)
    const titulo = document.getElementById(`${id}-titulo`)
    if (secao === null || titulo === null) return
    secao.scrollIntoView({ block: "start" })
    titulo.focus({ preventScroll: true })
  }

  return (
    <header
      data-guia="cabecalho"
      className="sticky top-0 z-10 -mx-4 border-b border-(--outline-variant) bg-(--background) px-4 md:-mx-7 md:px-7"
    >
      <div className="flex items-baseline gap-2 pt-3">
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1}>
          Guia
        </h1>
        {cidade === "" ? null : (
          <p
            data-guia="cidade"
            className="min-w-0 truncate text-[13px] text-(--on-surface-variant)"
          >
            {cidade}
          </p>
        )}
      </div>
      <nav aria-label="Seções do Guia" className="mt-1 flex flex-wrap gap-2 pb-2">
        {SECOES.map((secao) => (
          <a
            key={secao.id}
            href={`#${secao.id}`}
            data-guia="ancora"
            data-secao={secao.id}
            aria-current={ativa === secao.id ? "true" : undefined}
            onClick={(evento) => {
              evento.preventDefault()
              irParaSecao(secao.id)
            }}
            className="bv-press inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap text-(--on-surface-variant) ring-1 ring-(--outline-variant) aria-[current=true]:bg-(--on-surface) aria-[current=true]:text-(--background) aria-[current=true]:ring-transparent"
          >
            {secao.curto}
          </a>
        ))}
      </nav>
    </header>
  )
}

/**
 * Uma seção com âncora. `scroll-mt` compensa a barra fixa: a seção chega ao
 * topo já abaixo dela, com o próprio título à vista.
 */
export function SecaoDoGuia({
  id,
  titulo,
  children,
}: {
  id: string
  titulo: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      data-guia="secao"
      aria-labelledby={`${id}-titulo`}
      className="grid scroll-mt-[96px] gap-3"
    >
      <h2 id={`${id}-titulo`} tabIndex={-1} className="text-[20px] leading-7 font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  )
}
