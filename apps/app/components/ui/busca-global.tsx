"use client"

// Fonte: Command Menu 04 — Global Search, de ephraimduncan
// (https://21st.dev/@ephraimduncan/components/command-menu-04). Código do autor sobre
// `cmdk`, com a estrutura dele: últimos abertos e recentes antes de digitar, abas de
// tipo e realce do termo depois. Adaptações: os tipos são os do Bivaque, os ícones
// Tabler viram Material Symbols, os textos estão em português, a grade de imagens
// vira a grade de anúncios com foto, e os dados vêm de quem usa o componente (não
// há resultados fixos aqui).
import { Command as CommandPrimitive } from "cmdk"
import { useState } from "react"

import { Icone } from "@/components/bivaque/icone"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { NomeDeIcone } from "@/lib/icones"
import { cn } from "@/lib/utils"

export type TipoDeResultado = "pergunta" | "anuncio" | "negocio" | "imovel" | "encontro" | "grupo"

export type ResultadoDeBusca = {
  id: string
  tipo: TipoDeResultado
  titulo: string
  /** Mostrado sob o título enquanto se busca: bairro, preço, categoria ou trecho. */
  trecho: string
  /** Data ou distância, à direita da linha. */
  apoio: string
  /** Só anúncio e imóvel: caminho da foto para a grade. */
  foto?: string
}

type Filtro = "todos" | TipoDeResultado

const filtros: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Tudo" },
  { valor: "anuncio", rotulo: "Desapegos" },
  { valor: "negocio", rotulo: "Negócios" },
  { valor: "imovel", rotulo: "Imóveis" },
  { valor: "pergunta", rotulo: "Perguntas" },
  { valor: "encontro", rotulo: "Encontros" },
  { valor: "grupo", rotulo: "Grupos" },
]

const iconesDoTipo: Record<TipoDeResultado, NomeDeIcone> = {
  pergunta: "forum",
  anuncio: "sell",
  negocio: "storefront",
  imovel: "home_work",
  encontro: "event",
  grupo: "groups",
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR")
}

export function BuscaGlobal({
  aberta,
  aoMudarAberta,
  aoEscolher,
  cidade,
  ultimosAbertos,
  recentes,
  resultados,
}: {
  aberta: boolean
  aoMudarAberta: (aberta: boolean) => void
  aoEscolher: (resultado: ResultadoDeBusca) => void
  cidade: string
  ultimosAbertos: readonly ResultadoDeBusca[]
  recentes: readonly ResultadoDeBusca[]
  resultados: readonly ResultadoDeBusca[]
}) {
  const [termo, setTermo] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const agulha = normalizar(termo.trim())

  const encontrados = resultados.filter(
    (r) =>
      (filtro === "todos" || r.tipo === filtro) &&
      normalizar(`${r.titulo} ${r.trecho}`).includes(agulha),
  )
  const emGrade = (filtro === "anuncio" || filtro === "imovel") && encontrados.every((r) => r.foto)

  const limpar = () => {
    setTermo("")
    setFiltro("todos")
  }

  return (
    <CommandDialog
      className="rounded-2xl sm:max-w-[720px]"
      description={`Busque desapegos, negócios, imóveis, perguntas, encontros e grupos em ${cidade}`}
      onOpenChange={(proxima) => {
        if (!proxima) limpar()
        aoMudarAberta(proxima)
      }}
      open={aberta}
      showCloseButton={false}
      title={`Buscar em ${cidade}`}
    >
      <Command shouldFilter={false}>
        <div className="flex h-16 shrink-0 items-center gap-2 py-5 pr-4 pl-5">
          <Icone nome="search" className="size-5 shrink-0 text-(--muted-foreground)" />
          <CommandPrimitive.Input
            className="min-w-0 flex-1 bg-transparent text-base outline-hidden placeholder:text-(--muted-foreground)"
            onValueChange={setTermo}
            placeholder={`Do que você precisa em ${cidade}?`}
            value={termo}
          />
          <div className="flex shrink-0 items-center gap-1">
            {termo && (
              <>
                <button
                  className="min-h-11 px-2 text-(--muted-foreground) text-sm hover:text-(--foreground)"
                  onClick={limpar}
                  type="button"
                >
                  Limpar
                </button>
                <span aria-hidden className="mx-1 h-5 w-px bg-(--border)" />
              </>
            )}
            <button
              aria-label="Fechar busca"
              className="flex size-11 items-center justify-center rounded-full text-(--muted-foreground) hover:bg-(--muted) hover:text-(--foreground)"
              onClick={() => aoMudarAberta(false)}
              type="button"
            >
              <Icone nome="close" className="size-5" />
            </button>
          </div>
        </div>

        <CommandList className="h-[min(396px,60dvh)] max-h-[min(396px,60dvh)] pb-3">
          {agulha ? (
            <>
              <div
                aria-label="Filtrar por tipo"
                className="sticky top-0 z-10 flex gap-1 overflow-x-auto bg-(--popover) px-5 pb-3"
                role="tablist"
              >
                {filtros.map((opcao) => {
                  const marcado = opcao.valor === filtro
                  return (
                    <button
                      aria-selected={marcado}
                      className={cn(
                        "min-h-9 shrink-0 rounded-full px-3.5 text-sm transition-colors",
                        marcado
                          ? "bg-(--foreground) text-(--background)"
                          : "text-(--muted-foreground) hover:text-(--foreground)",
                      )}
                      key={opcao.valor}
                      onClick={() => setFiltro(opcao.valor)}
                      role="tab"
                      type="button"
                    >
                      {opcao.rotulo}
                    </button>
                  )
                })}
              </div>
              <CommandEmpty>
                Nada sobre “{termo}” em {cidade} ainda. Pergunte à cidade: quem sabe costuma
                responder no mesmo dia.
              </CommandEmpty>
              {emGrade ? (
                <div className="grid grid-cols-2 gap-3 px-5 sm:grid-cols-4">
                  {encontrados.map((r) => (
                    <CommandItem
                      className="block rounded-xl bg-transparent p-0"
                      key={r.id}
                      onSelect={() => aoEscolher(r)}
                      value={r.id}
                    >
                      <img
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover ring-1 ring-(--border) group-data-selected/command-item:ring-2 group-data-selected/command-item:ring-(--foreground)"
                        src={r.foto}
                      />
                      <span className="mt-1.5 block truncate font-medium text-sm">{r.trecho}</span>
                      <span className="block truncate text-(--muted-foreground) text-sm">
                        {r.titulo}
                      </span>
                    </CommandItem>
                  ))}
                </div>
              ) : (
                encontrados.map((r) => (
                  <LinhaDeResultado
                    agulha={agulha}
                    aoEscolher={aoEscolher}
                    key={r.id}
                    resultado={r}
                  />
                ))
              )}
            </>
          ) : (
            <>
              {ultimosAbertos.length > 0 && (
                <CommandGroup
                  className="p-0 **:[[cmdk-group-heading]]:px-5 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-sm"
                  heading="Abertos por último"
                >
                  {ultimosAbertos.map((r) => (
                    <LinhaDeResultado aoEscolher={aoEscolher} key={r.id} resultado={r} />
                  ))}
                </CommandGroup>
              )}
              {recentes.length > 0 && (
                <CommandGroup
                  className="mt-5 p-0 **:[[cmdk-group-heading]]:px-5 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-sm"
                  heading={`Novidades em ${cidade}`}
                >
                  {recentes.map((r) => (
                    <LinhaDeResultado aoEscolher={aoEscolher} key={r.id} resultado={r} />
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function LinhaDeResultado({
  resultado,
  agulha,
  aoEscolher,
}: {
  resultado: ResultadoDeBusca
  agulha?: string | undefined
  aoEscolher: (resultado: ResultadoDeBusca) => void
}) {
  return (
    <CommandItem
      className="mx-3 min-h-12 gap-3 rounded-xl px-3 py-2 text-sm"
      onSelect={() => aoEscolher(resultado)}
      value={resultado.id}
    >
      <span className="flex size-8 shrink-0 items-center justify-center">
        <Icone nome={iconesDoTipo[resultado.tipo]} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-5">
          <Realce agulha={agulha} texto={resultado.titulo} />
        </span>
        <span className="block truncate pt-0.5 text-(--muted-foreground) leading-5">
          <Realce agulha={agulha} texto={resultado.trecho} />
        </span>
      </span>
      <span className="shrink-0 pl-4 text-(--muted-foreground) text-sm">{resultado.apoio}</span>
    </CommandItem>
  )
}

function Realce({ texto, agulha }: { texto: string; agulha?: string | undefined }) {
  const inicio = agulha ? normalizar(texto).indexOf(agulha) : -1
  if (!agulha || inicio === -1) return texto
  const fim = inicio + agulha.length
  return (
    <>
      {texto.slice(0, inicio)}
      <mark className="bg-transparent font-semibold text-(--foreground)">
        {texto.slice(inicio, fim)}
      </mark>
      {texto.slice(fim)}
    </>
  )
}
