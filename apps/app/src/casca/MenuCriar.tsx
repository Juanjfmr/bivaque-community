"use client"

import { Dialog } from "radix-ui"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { FormularioDeCriacao } from "@/components/bivaque/formulario-criacao"

import { Icone } from "@/components/bivaque/icone"
import type { NomeDeIcone } from "@/lib/icones"
import { useNavegacao } from "@/lib/navegacao/react"
import {
  CHAVE_ABERTURA_PERGUNTA,
  PEDIDO_PERGUNTAR,
  TIPOS_RASCUNHO,
  type TipoRascunho,
} from "@/lib/rascunhos-criacao"
import { CHAVE_ABERTURA_IMOVEL, PEDIDO_CRIAR_IMOVEL } from "@/lib/rascunhos-imoveis"
import { cn } from "@/lib/utils"
import { useStateComMidia } from "@/src/casca/midia"
import { useCasca } from "@/src/contexto/casca"

/**
 * O menu Criar (inventário §5.4).
 *
 * As sete escolhas são as do protótipo, com o mesmo ícone, rótulo e subtítulo.
 * No celular é uma pilha ancorada ao botão; a partir de 1024 px vira o painel
 * "Criar no Bivaque" em duas colunas, com o morfo do botão (itens 12 e 13 do
 * §6). Abre pelo teclado com `C` no desktop, fora de campos de texto, e as
 * setas andam pelas escolhas.
 *
 * Cada escolha é uma **porta**, não uma tela: quem liga cada fluxo é a onda que
 * tem a jornada (2 a 8). Aqui elas avisam que ainda não existem.
 */
export type EscolhaDoCriar = {
  readonly id: string
  readonly icone: NomeDeIcone
  readonly rotulo: string
  readonly subtitulo?: string
}

export const ESCOLHAS: readonly EscolhaDoCriar[] = [
  { id: "ask", icone: "volunteer_activism", rotulo: "Pedir indicação" },
  {
    id: "create-request",
    icone: "build",
    rotulo: "Contratar serviço",
    subtitulo: "Propostas de empresas do ramo",
  },
  { id: "create-item", icone: "sell", rotulo: "Anunciar desapego" },
  { id: "create-property", icone: "apartment", rotulo: "Anunciar imóvel" },
  {
    id: "indicate",
    icone: "add_business",
    rotulo: "Indicar um negócio",
    subtitulo: "Quem você já contrata e confia",
  },
  {
    id: "create-event",
    icone: "event",
    rotulo: "Criar encontro",
    subtitulo: "Com local, data e horário",
  },
  { id: "my-biz", icone: "storefront", rotulo: "Divulgar meu negócio" },
]

const SUBTITULOS_DO_PAINEL: Readonly<Partial<Record<string, string>>> = {
  ask: "A comunidade indica quem é bom",
  "create-request": "Receba até 5 propostas",
  "create-item": "Venda o que não vai levar",
  "create-property": "Aluguel ou venda na cidade",
  "my-biz": "Crie a página e receba pedidos da comunidade",
}

const CONSULTA_DO_PAINEL = "(min-width: 1024px)"

export function MenuCriar({ aoFechar }: { readonly aoFechar: () => void }) {
  const painel = useStateComMidia(CONSULTA_DO_PAINEL)
  const navegacao = useNavegacao()
  const casca = useCasca()
  const [tipo, setTipo] = useState<TipoRascunho | null>(null)
  const [concluido, setConcluido] = useState(false)
  const lista = useRef<HTMLDivElement | null>(null)
  const popup = useRef<HTMLDivElement | null>(null)

  const posicionar = useCallback(() => {
    const menu = popup.current
    const ancora = document.querySelector('[data-criar="botao"]')?.getBoundingClientRect()
    if (!menu || !ancora) return
    const largura = Math.min(
      painel || tipo !== null || concluido ? 620 : 262,
      window.innerWidth - 24,
    )
    const central = window.innerWidth < 720
    const esquerda = painel
      ? ancora.left
      : central
        ? ancora.x + ancora.width / 2 - largura / 2
        : ancora.right - largura
    const acima = ancora.top > window.innerHeight / 2
    const topo = painel
      ? ancora.top
      : acima
        ? ancora.top - menu.offsetHeight - 10
        : ancora.bottom + 12
    menu.style.width = `${largura}px`
    const x = Math.max(12, Math.min(window.innerWidth - largura - 12, esquerda))
    const y = Math.max(12, Math.min(window.innerHeight - menu.offsetHeight - 12, topo))
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.style.setProperty("--fab-x", `${ancora.x + ancora.width / 2 - 29 - x}px`)
    menu.style.setProperty("--fab-y", `${ancora.y - y}px`)
  }, [painel, tipo, concluido])

  useLayoutEffect(() => {
    posicionar()
    window.addEventListener("resize", posicionar)
    return () => window.removeEventListener("resize", posicionar)
  }, [posicionar])

  const mover = (passo: number | "primeiro" | "ultimo") => {
    const itens = [...(lista.current?.querySelectorAll<HTMLElement>("[data-escolha]") ?? [])]
    if (itens.length === 0) return
    const atual = itens.indexOf(document.activeElement as HTMLElement)
    const proximo =
      passo === "primeiro"
        ? 0
        : passo === "ultimo"
          ? itens.length - 1
          : (atual + passo + itens.length) % itens.length
    itens[proximo]?.focus()
  }

  const escolhas = ESCOLHAS.map((escolha, indice) => (
    <button
      key={escolha.id}
      type="button"
      aria-label={escolha.rotulo}
      role={painel ? undefined : "menuitem"}
      data-escolha={escolha.id}
      onClick={() => {
        if (escolha.id === "ask") {
          try {
            window.sessionStorage.setItem(CHAVE_ABERTURA_PERGUNTA, "1")
          } catch {
            /* sem storage */
          }
          void navegacao.irPara("comunidade").then(() => {
            window.dispatchEvent(new Event(PEDIDO_PERGUNTAR))
          })
          return
        }
        if (TIPOS_RASCUNHO.some((item) => item === escolha.id)) {
          setConcluido(false)
          setTipo(escolha.id as TipoRascunho)
          return
        }
        if (escolha.id !== "create-property") return
        try {
          window.sessionStorage.setItem(CHAVE_ABERTURA_IMOVEL, "1")
        } catch {
          /* a navegação funciona mesmo sem armazenamento */
        }
        void navegacao.irPara("imoveis").then(() => {
          window.dispatchEvent(new Event(PEDIDO_CRIAR_IMOVEL))
        })
      }}
      style={{ "--i": indice } as React.CSSProperties}
      className="bv-criar-escolha"
    >
      <span data-criar-icone={escolha.id}>
        <Icone nome={escolha.icone} className="size-6" />
      </span>
      <span className="grid min-w-0">
        <b>
          {escolha.rotulo}
          {painel && escolha.id === "create-request" ? (
            <small className="bv-criar-novo">Novo</small>
          ) : null}
        </b>
        {(painel ? (SUBTITULOS_DO_PAINEL[escolha.id] ?? escolha.subtitulo) : escolha.subtitulo) ===
        undefined ? null : (
          <small className="truncate text-[13px] text-(--on-surface-variant)">
            {painel ? (SUBTITULOS_DO_PAINEL[escolha.id] ?? escolha.subtitulo) : escolha.subtitulo}
          </small>
        )}
      </span>
    </button>
  ))

  // As setas, Home e End andam pelas escolhas (§5.4). O papel do elemento é
  // literal por ramo: o painel do desktop é um diálogo e a pilha é um menu.
  const aoTeclar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "ArrowDown") {
      evento.preventDefault()
      mover(1)
    }
    if (evento.key === "ArrowUp") {
      evento.preventDefault()
      mover(-1)
    }
    if (evento.key === "Home") {
      evento.preventDefault()
      mover("primeiro")
    }
    if (evento.key === "End") {
      evento.preventDefault()
      mover("ultimo")
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-scrim="sobreposicao"
          data-criar-fundo={painel ? "painel" : "pilha"}
          className="bv-scrim"
        />
        <Dialog.Content
          ref={popup}
          data-sobreposicao="menu-criar"
          data-modo={painel ? "painel" : "pilha"}
          onOpenAutoFocus={(evento) => {
            // O foco vai para a primeira escolha (§5.4), não para o botão de
            // fechar: o foco automático do Radix não decide por nós.
            evento.preventDefault()
            posicionar()
            lista.current?.querySelector<HTMLElement>("[data-escolha]")?.focus()
          }}
          className="bv-painel bv-criar-menu"
        >
          <div className={cn("flex items-start justify-between gap-3", !painel && "sr-only")}>
            <div>
              <Dialog.Title className="text-lg leading-6">Criar no Bivaque</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-(--on-surface-variant)">
                {painel ? "O que você quer publicar ou pedir?" : "Escolha o que publicar"}
              </Dialog.Description>
            </div>
            {painel ? <kbd className="bv-criar-atalho">C</kbd> : null}
            {painel ? (
              <button
                type="button"
                data-acao="fechar-sobreposicao"
                aria-label="Fechar"
                onClick={aoFechar}
                className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-(--muted)"
              >
                <Icone nome="close" className="size-6" />
              </button>
            ) : null}
          </div>
          {!painel ? (
            <button type="button" data-criar="fechar" aria-label="Fechar" onClick={aoFechar}>
              <Icone nome="close" />
            </button>
          ) : null}

          {tipo !== null ? (
            <div
              data-criar-etapa="formulario"
              className="mt-3 max-h-[76dvh] overflow-y-auto px-1 pb-2"
            >
              <FormularioDeCriacao
                key={tipo}
                tipo={tipo}
                cidade={casca.cidade}
                aoCancelar={() => setTipo(null)}
                aoConcluir={() => {
                  setTipo(null)
                  setConcluido(true)
                }}
              />
            </div>
          ) : concluido ? (
            <div data-criar-etapa="concluido" className="grid gap-4 p-3">
              <b className="text-lg">Rascunho salvo nesta sessão</b>
              <p className="text-sm text-(--on-surface-variant)">
                Este conteúdo não foi publicado. Você pode consultá-lo e excluí-lo em Meus anúncios.
              </p>
              <div className="flex flex-wrap gap-2">
                <Botao onClick={() => void navegacao.irPara("meus-anuncios")}>
                  Ver meus rascunhos
                </Botao>
                <Botao tom="contornado" onClick={() => setConcluido(false)}>
                  Criar outro
                </Botao>
              </div>
            </div>
          ) : painel ? (
            <div
              ref={lista}
              role="dialog"
              aria-label="Criar publicação"
              data-lista-de-escolhas="sim"
              onKeyDown={aoTeclar}
              className="mt-2 grid grid-cols-2 gap-1"
            >
              {escolhas}
            </div>
          ) : (
            <div
              ref={lista}
              role="menu"
              aria-label="Criar publicação"
              data-lista-de-escolhas="sim"
              onKeyDown={aoTeclar}
              className="grid justify-items-center gap-2"
            >
              {escolhas}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** A tecla `C` abre o Criar no desktop, fora de campos de texto (§5.4). */
export function useAtalhoDoCriar(abrir: () => void, ativo: boolean): void {
  const guardado = useRef(abrir)
  guardado.current = abrir

  useEffect(() => {
    if (!ativo) return
    if (typeof window.matchMedia !== "function") return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "c" && evento.key !== "C") return
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      if (!window.matchMedia(CONSULTA_DO_PAINEL).matches) return
      const alvo = evento.target as HTMLElement | null
      const digitando =
        alvo !== null &&
        (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable === true)
      if (digitando) return
      evento.preventDefault()
      guardado.current()
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [ativo])
}
