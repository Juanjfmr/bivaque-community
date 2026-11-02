"use client"

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"

import { LISTA } from "@/lib/movimento"
import { cn } from "@/lib/utils"
import { EsqueletoDeLista } from "./esqueleto"
import { FimDeBloco } from "./fim-de-lista"

/**
 * Lista paginada (inventário §7: `pagedHtml` e o pager interno).
 *
 * Regras do protótipo preservadas: blocos de 24, o próximo bloco entra sozinho
 * quando o fim se aproxima (margem de 600 px) e o "Mostrar mais" fica de
 * reserva; **o foco vai para o primeiro item novo** quando a carga veio do
 * botão, porque carregar mais não pode custar a vez de quem navega por teclado
 * (`shell/paged-list.js:28`).
 *
 * Quem rola pode ser o `#conteudo` ou o scroller de um diálogo: o observador
 * recebe o `raiz` por prop, como no protótipo (`:40-41`).
 */
export function ListaPaginada<T>({
  itens,
  porBloco = LISTA.porBloco,
  identificar,
  renderizar,
  formato = "lista",
  fim,
  raizDoRolamento,
  className,
}: {
  itens: readonly T[]
  porBloco?: number
  identificar: (item: T, indice: number) => string
  renderizar: (item: T) => ReactNode
  formato?: "cartoes" | "lista" | "pilha"
  fim?: ReactNode
  raizDoRolamento?: HTMLElement | null
  className?: string
}) {
  const [mostrados, setMostrados] = useState(() => Math.min(porBloco, itens.length))
  const [carregando, setCarregando] = useState(false)
  const pe = useRef<HTMLDivElement | null>(null)
  const primeiroNovo = useRef<string | null>(null)
  const focoPedido = useRef(false)
  const mostradosAnteriores = useRef(mostrados)

  const mostrarMais = useCallback(
    (comFoco: boolean) => {
      if (mostrados >= itens.length) return
      focoPedido.current = comFoco
      const proximo = Math.min(mostrados + porBloco, itens.length)
      const item = itens[mostrados]
      primeiroNovo.current = item === undefined ? null : identificar(item, mostrados)
      setCarregando(true)
      // O protótipo insere o bloco depois de um quadro e 40 ms, com os
      // esqueletos no lugar (`shell/paged-list.js:32-37`).
      requestAnimationFrame(() => {
        setTimeout(() => {
          setCarregando(false)
          setMostrados(proximo)
        }, 40)
      })
    },
    [identificar, itens, mostrados, porBloco],
  )

  // O carregamento automático: o fim da lista a 600 px de distância.
  useEffect(() => {
    const alvo = pe.current
    if (!alvo || mostrados >= itens.length) return
    if (typeof IntersectionObserver !== "function") return
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting && !focoPedido.current) mostrarMais(false)
        }
      },
      { root: raizDoRolamento ?? null, rootMargin: `0px 0px ${LISTA.margemDeCarga}px 0px` },
    )
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [itens.length, mostrados, mostrarMais, raizDoRolamento])

  // O foco no primeiro item novo, só quando a carga veio do botão. A leitura de
  // `mostrados` separa o bloco que cresceu do render que apenas repetiu a lista.
  useEffect(() => {
    const cresceu = mostrados > mostradosAnteriores.current
    mostradosAnteriores.current = mostrados
    if (!cresceu || !focoPedido.current || primeiroNovo.current === null) return
    focoPedido.current = false
    const chave = primeiroNovo.current
    const alvo = document.querySelector<HTMLElement>(`[data-item-lista="${CSS.escape(chave)}"]`)
    if (alvo) alvo.focus({ preventScroll: true })
  }, [mostrados])

  const visiveis = itens.slice(0, mostrados)
  const formatos = {
    cartoes: "bv-grade",
    lista: "grid gap-2",
    pilha: "grid gap-3",
  } as const

  return (
    <div data-lista="paginada" className={className}>
      <div data-grade={formato} className={cn(formatos[formato])}>
        {visiveis.map((item, indice) => (
          <div
            key={identificar(item, indice)}
            data-item-lista={identificar(item, indice)}
            tabIndex={-1}
          >
            {renderizar(item)}
          </div>
        ))}
      </div>
      {carregando ? <EsqueletoDeLista linhas={2} /> : null}
      <div ref={pe} data-pe="lista">
        <p
          data-contagem="mostrados"
          className="sr-only"
        >{`Mostrando ${mostrados} de ${itens.length}`}</p>
        <FimDeBloco
          mostrados={mostrados}
          total={itens.length}
          porBloco={porBloco}
          carregando={carregando}
          aoMostrarMais={() => mostrarMais(true)}
          fim={fim}
        />
      </div>
    </div>
  )
}
