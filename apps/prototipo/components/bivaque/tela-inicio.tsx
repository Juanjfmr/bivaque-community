"use client"

import { Building2, HandHeart, MessagesSquare, Search, Store, Tag } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Indicacao } from "@/lib/dados/indicacoes"
import { cidadeAtual, fonteDeIndicacoes } from "@/lib/dados/indicacoes"
import { ATALHOS, COMUNIDADE, EM_BREVE_SELO, EXEMPLOS_DE_BUSCA, INICIO } from "@/lib/demo/textos"
import { cn } from "@/lib/utils"
import { EsqueletoDeLista } from "./esqueleto-de-lista"
import { EstadoDeErro } from "./estado-de-erro"
import { EstadoVazio } from "./estado-vazio"
import { Icone } from "./icone"
import { LinhaDePergunta } from "./linha-de-pergunta"
import { useBivaque } from "./provedor"

// O Início do protótipo (`features/home/views.js`, renderHome), só o que esta
// jornada carrega: o cabeçalho com a cidade, a busca, os atalhos e a faixa de
// perguntas. O resto do Início (momento, carrosséis, grupos, encontro, guia)
// ficou de fora.
const GLIFOS_DOS_ATALHOS = {
  negocios: Store,
  desapegos: Tag,
  imoveis: Building2,
  indicacoes: HandHeart,
} as const

export function TelaInicio() {
  const { abrirPerguntar } = useBivaque()
  const [cidade] = useState(cidadeAtual)
  const [perguntas, setPerguntas] = useState<Indicacao[] | null>(null)
  const [erro, setErro] = useState(false)
  const [exemplo, setExemplo] = useState(0)
  const pedido = useRef(0)

  const carregar = useCallback(async () => {
    const meu = pedido.current + 1
    pedido.current = meu
    setErro(false)
    setPerguntas(null)
    try {
      const pagina = await fonteDeIndicacoes().listar({
        cidade,
        filtro: "para-ajudar",
        limite: 2,
        deslocamento: 0,
      })
      if (meu !== pedido.current) return
      setPerguntas(pagina.itens)
    } catch {
      if (meu !== pedido.current) return
      setErro(true)
    }
  }, [cidade])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const relogio = setInterval(() => {
      setExemplo((atual) => (atual + 1) % EXEMPLOS_DE_BUSCA.length)
    }, 3200)
    return () => clearInterval(relogio)
  }, [])

  const sugestao = EXEMPLOS_DE_BUSCA[exemplo] ?? ""

  return (
    <div className="pt-5 md:pt-8">
      <h1 className="text-[24px] leading-7.5 tracking-[-0.3px] md:text-[30px]">
        {INICIO.tituloAntes}{" "}
        <span className="text-(--accent-text) underline decoration-(--accent-text)/35 decoration-2 underline-offset-4">
          {cidade}
        </span>
      </h1>

      <div className="mt-4 grid gap-3 md:mt-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.56fr)] md:items-center md:gap-7">
        <div className="grid gap-2">
          <div className="relative">
            <Icone
              glifo={Search}
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-(--muted-foreground)"
            />
            <Input
              type="search"
              aria-label={INICIO.buscar}
              aria-describedby="busca-nota"
              placeholder={`Busque “${sugestao}”`}
              className="h-12 rounded-xl bg-(--surface-lowest) pl-11"
            />
          </div>
          <p id="busca-nota" className="text-xs text-(--muted-foreground)">
            {INICIO.buscarNota}
          </p>
        </div>

        <nav aria-label="Áreas" className="grid grid-cols-4 gap-1.5 md:gap-1">
          {ATALHOS.map((atalho) => {
            const glifo = GLIFOS_DOS_ATALHOS[atalho.id]
            if (atalho.id === "indicacoes") {
              return (
                <Link
                  key={atalho.id}
                  href="/comunidade"
                  className="flex min-h-16 flex-col items-center justify-start gap-1.5 rounded-xl px-1 pt-1.5 pb-1 text-[11.5px] leading-4 font-medium hover:bg-(--muted)"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-(--secondary-container) text-(--primary)">
                    <Icone glifo={glifo} className="size-6" />
                  </span>
                  {atalho.rotulo}
                </Link>
              )
            }
            return (
              <button
                key={atalho.id}
                type="button"
                disabled
                className="flex min-h-16 flex-col items-center justify-start gap-1.5 rounded-xl px-1 pt-1.5 pb-1 text-[11.5px] leading-4 font-medium text-(--muted-foreground)"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-(--muted)">
                  <Icone glifo={glifo} className="size-6" />
                </span>
                <span className="text-(--foreground)">{atalho.rotulo}</span>
                <span className="text-[10px] text-(--muted-foreground)">{EM_BREVE_SELO}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <section className="mt-6 md:mt-9">
        <div className="flex items-baseline justify-between gap-3">
          <h2>{INICIO.perguntas}</h2>
          <Button variant="ghost" asChild>
            <Link href="/comunidade">{INICIO.verPerguntas}</Link>
          </Button>
        </div>

        {erro ? (
          <div className="mt-3">
            <EstadoDeErro aoTentar={() => void carregar()} />
          </div>
        ) : perguntas === null ? (
          <div className="mt-3">
            <EsqueletoDeLista linhas={2} />
          </div>
        ) : perguntas.length > 0 ? (
          <ul className={cn("mt-1 grid gap-1")}>
            {perguntas.map((indicacao) => (
              <li key={indicacao.id}>
                <LinhaDePergunta indicacao={indicacao} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <EstadoVazio
              titulo={INICIO.perguntasVazio}
              texto={INICIO.perguntasVazioTexto}
              glifo={MessagesSquare}
            >
              <Button variant="secondary" onClick={abrirPerguntar}>
                {COMUNIDADE.pedirIndicacao}
              </Button>
            </EstadoVazio>
          </div>
        )}
      </section>
    </div>
  )
}
