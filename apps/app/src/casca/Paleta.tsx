"use client"

import { Dialog } from "radix-ui"
import { useCallback, useEffect, useRef, useState } from "react"

import { Icone } from "@/components/bivaque/icone"
import type { NomeDeIcone } from "@/lib/icones"
import { useEntradaDaTela, useNavegacao } from "@/lib/navegacao/react"
import { normalizar } from "@/lib/texto"

/**
 * A paleta de comandos da onda 2 (protótipo: shell/command-palette.js), só no
 * desktop. V1: Ir para e Ações, com teclado, foco contido e devolução ao
 * acionador. Os grupos de resultados (negócios, anúncios, perguntas) e as
 * buscas recentes ficam para o refino.
 */

type Item = {
  readonly id: string
  readonly rotulo: string
  readonly icone: NomeDeIcone
  readonly grupo: "Ações" | "Ir para"
  readonly destino: string
  readonly parametros?: Readonly<Record<string, string>>
}

const ITENS: readonly Item[] = [
  {
    id: "acao-indicacao",
    rotulo: "Pedir indicação",
    icone: "volunteer_activism",
    grupo: "Ações",
    destino: "comunidade",
  },
  {
    id: "acao-servico",
    rotulo: "Contratar serviço",
    icone: "build",
    grupo: "Ações",
    destino: "pedidos",
  },
  {
    id: "acao-desapego",
    rotulo: "Anunciar desapego",
    icone: "sell",
    grupo: "Ações",
    destino: "desapegos",
  },
  {
    id: "acao-imovel",
    rotulo: "Anunciar imóvel",
    icone: "apartment",
    grupo: "Ações",
    destino: "imoveis",
  },
  {
    id: "acao-encontro",
    rotulo: "Criar encontro",
    icone: "event",
    grupo: "Ações",
    destino: "agenda",
  },
  {
    id: "acao-negocio",
    rotulo: "Indicar um negócio",
    icone: "add_business",
    grupo: "Ações",
    destino: "negocios",
  },
  { id: "ir-inicio", rotulo: "Início", icone: "home", grupo: "Ir para", destino: "inicio" },
  {
    id: "ir-comunidade",
    rotulo: "Comunidade",
    icone: "forum",
    grupo: "Ir para",
    destino: "comunidade",
  },
  {
    id: "ir-conversas",
    rotulo: "Conversas",
    icone: "chat_bubble",
    grupo: "Ir para",
    destino: "conversas",
  },
  {
    id: "ir-negocios",
    rotulo: "Negócios locais",
    icone: "storefront",
    grupo: "Ir para",
    destino: "negocios",
  },
  {
    id: "ir-desapegos",
    rotulo: "Desapegos",
    icone: "sell",
    grupo: "Ir para",
    destino: "desapegos",
  },
  { id: "ir-imoveis", rotulo: "Imóveis", icone: "apartment", grupo: "Ir para", destino: "imoveis" },
  {
    id: "ir-agenda",
    rotulo: "Agenda da cidade",
    icone: "event",
    grupo: "Ir para",
    destino: "agenda",
  },
  { id: "ir-salvos", rotulo: "Salvos", icone: "bookmark", grupo: "Ir para", destino: "salvos" },
  {
    id: "ir-pedidos",
    rotulo: "Pedidos de serviço",
    icone: "build",
    grupo: "Ir para",
    destino: "pedidos",
  },
  { id: "ir-guia", rotulo: "Guia da cidade", icone: "map", grupo: "Ir para", destino: "guia" },
  { id: "ir-voce", rotulo: "Você", icone: "person", grupo: "Ir para", destino: "voce" },
]

const DESKTOP = "(min-width: 1024px)"

export function Paleta() {
  const { abrir: abrirSobreposicao, fecharSobreposicao: fechar, irPara } = useNavegacao()
  const aberta = useEntradaDaTela().sobreposicao === "paleta"
  const [consulta, definirConsulta] = useState("")
  const [ativo, definirAtivo] = useState(0)
  const campo = useRef<HTMLInputElement | null>(null)

  const abrir = useCallback(() => {
    if (typeof document === "undefined" || !window.matchMedia(DESKTOP).matches) return
    if (document.querySelector('[role="dialog"][aria-modal="true"]') !== null) return
    void abrirSobreposicao("paleta")
  }, [abrirSobreposicao])

  useEffect(() => {
    if (typeof document === "undefined") return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.defaultPrevented || evento.isComposing || evento.repeat) return
      const alvo = evento.target as HTMLElement | null
      const emCampo = alvo !== null && ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)
      const tecla = evento.key.toLowerCase()
      const combo =
        (evento.ctrlKey || evento.metaKey) && !evento.altKey && !evento.shiftKey && tecla === "k"
      const barra =
        tecla === "/" && !evento.ctrlKey && !evento.metaKey && !evento.altKey && !emCampo
      if (!combo && !barra) return
      evento.preventDefault()
      abrir()
    }
    document.addEventListener("keydown", aoTeclar)
    return () => document.removeEventListener("keydown", aoTeclar)
  }, [abrir])

  useEffect(() => {
    if (aberta) return
    definirConsulta("")
    definirAtivo(0)
  }, [aberta])

  const filtrados = ITENS.filter((item) =>
    normalizar(item.rotulo).includes(normalizar(consulta).trim()),
  )
  const grupos: readonly (typeof ITENS)[number]["grupo"][] = ["Ações", "Ir para"]
  const itensVisiveis = grupos.flatMap((grupo) => filtrados.filter((item) => item.grupo === grupo))

  const escolher = (indice: number) => {
    const item = itensVisiveis[indice]
    if (item === undefined) return
    void irPara(item.destino, { parametros: item.parametros ?? {}, replace: true })
  }

  if (!aberta) return null

  return (
    <Dialog.Root
      open
      onOpenChange={(valor) => {
        if (!valor) fechar()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          data-sobreposicao="paleta"
          aria-label="Buscar e ir para"
          onOpenAutoFocus={(evento) => {
            evento.preventDefault()
            campo.current?.focus({ preventScroll: true })
          }}
          className="fixed top-[12vh] left-1/2 z-50 grid w-[calc(100%-32px)] max-w-xl -translate-x-1/2 gap-2 rounded-2xl bg-(--surface-lowest) p-3 shadow-[0_18px_50px_var(--shadow-soft)]"
        >
          <Dialog.Title className="sr-only">Buscar e ir para</Dialog.Title>
          <Dialog.Description className="sr-only">
            Busque um destino ou escolha uma ação.
          </Dialog.Description>
          <div className="relative">
            <Icone
              nome="search"
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-(--on-surface-variant)"
            />
            <input
              ref={campo}
              type="text"
              aria-label="Buscar ou ir para"
              placeholder="Buscar ou ir para…"
              value={consulta}
              onChange={(evento) => {
                definirConsulta(evento.target.value)
                definirAtivo(0)
              }}
              onKeyDown={(evento) => {
                if (evento.key === "ArrowDown") {
                  evento.preventDefault()
                  definirAtivo((atual) => (atual + 1) % Math.max(1, itensVisiveis.length))
                } else if (evento.key === "ArrowUp") {
                  evento.preventDefault()
                  definirAtivo(
                    (atual) =>
                      (atual - 1 + Math.max(1, itensVisiveis.length)) %
                      Math.max(1, itensVisiveis.length),
                  )
                } else if (evento.key === "Enter") {
                  evento.preventDefault()
                  escolher(ativo)
                }
              }}
              className="min-h-12 w-full rounded-xl bg-(--surface-lowest) pl-11 text-sm ring-1 ring-(--outline-variant) outline-none"
            />
          </div>

          <div id="paleta-lista" className="grid max-h-[50vh] gap-1 overflow-y-auto">
            {itensVisiveis.length === 0 ? (
              <p className="px-3 py-2 text-sm text-(--on-surface-variant)">Nada encontrado.</p>
            ) : (
              itensVisiveis.map((item, indice) => (
                <div key={item.id}>
                  <button
                    type="button"
                    aria-current={indice === ativo ? "true" : undefined}
                    onClick={() => escolher(indice)}
                    onMouseMove={() => definirAtivo(indice)}
                    className={
                      indice === ativo
                        ? "flex min-h-11 w-full items-center gap-3 rounded-xl bg-(--secondary-container) px-3 text-left text-sm"
                        : "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-(--muted)"
                    }
                  >
                    <Icone nome={item.icone} className="size-5 shrink-0" />
                    <span className="grow">{item.rotulo}</span>
                    <span className="text-[12px] text-(--on-surface-variant)">{item.grupo}</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="text-[12px] text-(--on-surface-variant)">
            ↑ ↓ navegar · ↵ abrir · Esc fechar
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
