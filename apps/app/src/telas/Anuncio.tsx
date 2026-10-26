"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Capa } from "@/components/bivaque/capa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { moeda } from "@/lib/formato"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O anúncio da onda 6 (protótipo: features/listings/detail.js, renderItem), com
 * dados de demonstração. Salvar é estado local; conversa leva a Conversas.
 * Editor, fotos, mapa do bairro e denúncia ficam para o refino.
 */
export function Anuncio() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [salvo, setSalvo] = useState(false)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void dadosDoApp
      .lerCidade(casca.cidade, { signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [casca.cidade, rodada])

  const validacao = validarParametros("anuncio", { id })
  const anuncio = useMemo(
    () => (dados === null ? null : (dados.anuncios.find((item) => item.id === id) ?? null)),
    [dados, id],
  )

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (anuncio === null) return <TelaIndisponivel />

  const apresentacao = registro(anuncio.apresentacao)
  const imovel = anuncio.kind === "property"
  const ativo = anuncio.status === "active"
  const vendedor = texto(apresentacao["seller"], "Membro da comunidade")

  return (
    <section data-tela="anuncio" className="grid gap-2">
      <div className="relative">
        <Capa
          fonte={texto(apresentacao["imagem"])}
          alt={texto(apresentacao["title"], anuncio.title)}
          icone={iconeDeDado(apresentacao["icon"])}
        />
        <span className="absolute top-2 left-2">
          <Etiqueta tom="neutro">
            {ativo ? (imovel ? "Imóvel" : "Desapego") : imovel ? "Indisponível" : "Vendido"}
          </Etiqueta>
        </span>
        <span className="absolute top-2 right-2">
          <BotaoDeIcone
            rotulo={salvo ? "Remover dos salvos" : "Salvar anúncio"}
            nome={salvo ? "bookmark" : "bookmark_border"}
            aria-pressed={salvo}
            onClick={() => setSalvo((atual) => !atual)}
            className="bg-(--surface-lowest)/85 backdrop-blur"
          />
        </span>
      </div>

      <div className="grid gap-1 px-1">
        {typeof anuncio.price_cents === "number" ? (
          <b className="text-[22px]">{moeda(anuncio.price_cents / 100)}</b>
        ) : null}
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
          {texto(apresentacao["title"], anuncio.title)}
        </h1>
        <p className="text-sm text-(--on-surface-variant)">
          {texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade)} · {casca.cidade}
        </p>
      </div>

      {anuncio.description === null || anuncio.description === "" ? null : (
        <Secao titulo="Sobre o anúncio">
          <p className="text-[15px] leading-6">{anuncio.description}</p>
        </Secao>
      )}

      <Secao titulo="Localização aproximada">
        <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)">
          <Icone nome="location_on" className="size-6 shrink-0 text-(--primary)" />
          <span className="grid gap-0.5">
            <b className="text-[15px]">
              {texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade)}, {casca.cidade}
            </b>
            <small className="text-(--on-surface-variant)">
              O endereço exato pode ser combinado na conversa.
            </small>
          </span>
        </div>
      </Secao>

      <Secao titulo="Quem está anunciando">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--secondary-container) font-semibold">
            {iniciais(vendedor)}
          </span>
          <span className="grid gap-0.5">
            <b className="text-[15px]">{vendedor}</b>
            <small className="text-(--on-surface-variant)">
              {texto(apresentacao["note"], "Membro da comunidade")}
            </small>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao icone="chat_bubble" onClick={() => void navegacao.irPara("conversas")}>
            {ativo ? "Tenho interesse" : "Indisponível"}
          </Botao>
          <Botao tom="contornado" icone="sell" disabled={!ativo}>
            Fazer uma oferta
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
