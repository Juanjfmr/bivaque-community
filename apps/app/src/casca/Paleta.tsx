"use client"

import { useCallback, useEffect } from "react"

import { Icone } from "@/components/bivaque/icone"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { NomeDeIcone } from "@/lib/icones"
import { useEntradaDaTela, useNavegacao } from "@/lib/navegacao/react"
import { tituloDaRota } from "@/lib/navegacao/rotas"
import { normalizar } from "@/lib/texto"

/**
 * A paleta de comandos da onda 2 (protótipo: shell/command-palette.js), só no
 * desktop. V1: Ir para e Ações, com teclado, foco contido e devolução ao
 * acionador. Os grupos de resultados (negócios, anúncios, perguntas) e as
 * buscas recentes ficam para o refino.
 *
 * A peça é o `Command` do shadcn, sobre `cmdk` (achado S02 da auditoria de
 * 26/10): a filtragem, a seleção e as teclas são da peça, e não uma lista
 * manual sobre Radix. O que continua sendo do app é o histórico: abrir e
 * fechar passam por `useSobreposicaoDaEntrada`, então o Voltar do sistema
 * fecha a paleta antes de sair da tela.
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
    rotulo: tituloDaRota("negocios"),
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
const GRUPOS = ["Ações", "Ir para"] as const

export function Paleta() {
  const { abrir: abrirSobreposicao, fecharSobreposicao: fechar, irPara } = useNavegacao()
  const aberta = useEntradaDaTela().sobreposicao === "paleta"

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

  if (!aberta) return null

  const escolher = (item: Item) => {
    void irPara(item.destino, { parametros: item.parametros ?? {}, replace: true })
  }

  return (
    <CommandDialog
      open
      onOpenChange={(valor) => {
        if (!valor) fechar()
      }}
      title="Buscar e ir para"
      description="Busque um destino ou escolha uma ação."
      className="w-[calc(100%-32px)] max-w-xl"
    >
      <Command
        // A busca ignora acento e caixa, como o resto do app (`normalizar`).
        filter={(valor, busca) => (normalizar(valor).includes(normalizar(busca).trim()) ? 1 : 0)}
        label="Buscar e ir para"
      >
        {/* O `label` da peça nomeia o campo: o cmdk liga o `aria-labelledby` do
            input a ele, e o placeholder é só a dica visual. */}
        <CommandInput autoFocus placeholder="Buscar ou ir para…" />
        <CommandList data-sobreposicao="paleta" label="Destinos e ações">
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          {GRUPOS.map((grupo) => (
            <CommandGroup key={grupo} heading={grupo}>
              {ITENS.filter((item) => item.grupo === grupo).map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.rotulo}
                  data-escolha={item.id}
                  onSelect={() => escolher(item)}
                >
                  <Icone nome={item.icone} className="size-5 shrink-0" />
                  <span className="grow">{item.rotulo}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <p className="px-3 pb-2 text-[12px] text-(--on-surface-variant)">
          ↑ ↓ navegar · ↵ abrir · Esc fechar
        </p>
      </Command>
    </CommandDialog>
  )
}
