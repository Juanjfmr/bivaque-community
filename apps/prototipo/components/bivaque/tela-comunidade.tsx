"use client"

import { GraduationCap, HandHeart, MessagesSquare, SquarePen } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  cidadeAtual,
  type FiltroDeIndicacoes,
  fonteDeIndicacoes,
  type Indicacao,
} from "@/lib/dados/indicacoes"
import { COMUNIDADE, LISTA } from "@/lib/demo/textos"
import type { AbaDaComunidade } from "@/lib/navegacao"
import { AbasDaComunidade } from "./abas-da-comunidade"
import { ChipsDeFiltro } from "./chips-de-filtro"
import { EmBreve } from "./em-breve"
import { EsqueletoDeLista } from "./esqueleto-de-lista"
import { EstadoDeErro } from "./estado-de-erro"
import { EstadoVazio } from "./estado-vazio"
import { FimDoBloco } from "./fim-do-bloco"
import { Icone } from "./icone"
import { LinhaDePergunta } from "./linha-de-pergunta"
import { useBivaque } from "./provedor"

// A Comunidade do protótipo (`features/community/views.js`, renderCommunity) na
// aba Indicações: o cabeçalho, o resumo de resolvidas, os filtros e a lista.
// O bloco é de 4 perguntas, e não de 24 como no protótipo: com as sete perguntas
// da demonstração, blocos de 24 nunca apareceriam e a paginação não teria prova.
const PEDACO = 4

export function TelaComunidade({ aba }: { aba: AbaDaComunidade }) {
  const { abrirPerguntar } = useBivaque()

  return (
    <div className="pt-5 md:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] leading-7.5 tracking-[-0.3px] md:text-[30px]">
            {COMUNIDADE.titulo}
          </h1>
          <p className="mt-1 text-sm text-(--muted-foreground)">{COMUNIDADE.subtitulo}</p>
        </div>
        {aba === "indicacoes" && (
          <Button variant="secondary" onClick={abrirPerguntar} className="shrink-0">
            <Icone glifo={SquarePen} />
            {COMUNIDADE.perguntar}
          </Button>
        )}
      </div>

      <div className="mt-4">
        <AbasDaComunidade aba={aba}>
          {aba === "grupos" ? (
            <EmBreve titulo={COMUNIDADE.abaGrupos} selo={COMUNIDADE.gruposEmBreve} />
          ) : (
            <AbaIndicacoes />
          )}
        </AbasDaComunidade>
      </div>
    </div>
  )
}

function AbaIndicacoes() {
  const { abrirPerguntar } = useBivaque()
  const cidade = cidadeAtual()
  const [filtro, setFiltro] = useState<FiltroDeIndicacoes>("para-ajudar")
  const [itens, setItens] = useState<Indicacao[]>([])
  const [total, setTotal] = useState(0)
  const [resolvidas, setResolvidas] = useState<number | null>(null)
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando")
  const [carregandoMais, setCarregandoMais] = useState(false)
  const pedido = useRef(0)

  const carregar = useCallback(async () => {
    const meu = pedido.current + 1
    pedido.current = meu
    setEstado("carregando")
    setItens([])
    setTotal(0)
    try {
      const pagina = await fonteDeIndicacoes().listar({
        cidade,
        filtro,
        limite: PEDACO,
        deslocamento: 0,
      })
      if (meu !== pedido.current) return
      setItens(pagina.itens)
      setTotal(pagina.total)
      setResolvidas(pagina.resolvidas)
      setEstado("pronto")
    } catch {
      if (meu !== pedido.current) return
      setEstado("erro")
    }
  }, [cidade, filtro])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function mostrarMais() {
    setCarregandoMais(true)
    try {
      const pagina = await fonteDeIndicacoes().listar({
        cidade,
        filtro,
        limite: PEDACO,
        deslocamento: itens.length,
      })
      setItens((atual) => [...atual, ...pagina.itens])
      setTotal(pagina.total)
    } catch {
      setEstado("erro")
    } finally {
      setCarregandoMais(false)
    }
  }

  return (
    <div className="grid gap-3">
      {resolvidas !== null && (
        <div className="bv-strip items-center">
          <Icone glifo={GraduationCap} className="size-5 shrink-0 text-(--primary)" />
          <span className="grid gap-0.5">
            <b className="text-[15px]">{COMUNIDADE.resolvidas(resolvidas)}</b>
            <small className="text-[13px] text-(--muted-foreground)">
              {COMUNIDADE.resolvidasTexto}
            </small>
          </span>
        </div>
      )}

      <ChipsDeFiltro valor={filtro} aoMudar={setFiltro} />

      {filtro === "para-ajudar" && estado === "pronto" && itens.length > 0 && (
        <p className="flex items-center gap-2 text-[13px] text-(--muted-foreground)">
          <Icone glifo={HandHeart} className="size-4 shrink-0 text-(--primary)" />
          {COMUNIDADE.notaAjudar}
        </p>
      )}

      {estado === "erro" ? (
        <EstadoDeErro aoTentar={() => void carregar()} />
      ) : estado === "carregando" ? (
        <EsqueletoDeLista linhas={PEDACO} />
      ) : total === 0 ? (
        <EstadoVazio
          titulo={filtro === "para-ajudar" ? COMUNIDADE.vazioAjudar : COMUNIDADE.vazio}
          texto={COMUNIDADE.vazioTexto}
          glifo={filtro === "para-ajudar" ? MessagesSquare : SquarePen}
        >
          <Button variant="secondary" onClick={abrirPerguntar}>
            {COMUNIDADE.pedirIndicacao}
          </Button>
        </EstadoVazio>
      ) : (
        <>
          <ul className="grid gap-1 rounded-2xl bg-(--surface-lowest) p-1">
            {itens.map((indicacao) => (
              <li key={indicacao.id}>
                <LinhaDePergunta indicacao={indicacao} />
              </li>
            ))}
          </ul>
          <FimDoBloco
            mostrados={itens.length}
            total={total}
            pedaco={PEDACO}
            carregando={carregandoMais}
            aoMostrarMais={() => void mostrarMais()}
            fim={
              <div className="bv-strip items-center">
                <Icone glifo={MessagesSquare} className="size-5 shrink-0 text-(--primary)" />
                <span className="grid grow gap-0.5">
                  <b className="text-[15px]">{LISTA.fimTitulo}</b>
                  <small className="text-[13px] text-(--muted-foreground)">{LISTA.fimTexto}</small>
                </span>
                <Button variant="secondary" onClick={abrirPerguntar}>
                  {COMUNIDADE.perguntar}
                </Button>
              </div>
            }
          />
        </>
      )}
    </div>
  )
}
