"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Capa } from "@/components/bivaque/capa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { useCasca } from "@/src/contexto/casca"
import { numero, registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A página do negócio da onda 7 (protótipo: features/businesses/detail.js,
 * renderBusiness), com dados de demonstração. "Pedir orçamento" leva aos
 * Pedidos; editar, indicar e os contatos externos ficam para o refino.
 */
export function Negocio() {
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

  const validacao = validarParametros("negocio", { id })
  const negocio = useMemo(
    () => (dados === null ? null : (dados.negocios.find((item) => item.id === id) ?? null)),
    [dados, id],
  )

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="negocio" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="negocio" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (negocio === null) return <TelaIndisponivel />

  const apresentacao = registro(negocio.apresentacao)
  const servicos = Array.isArray(apresentacao["svc"]) ? apresentacao["svc"] : []
  const bairros = Array.isArray(apresentacao["hoods"]) ? apresentacao["hoods"] : []
  const indicacoes = numero(apresentacao["recN"])
  const aguardando = apresentacao["claimed"] === false

  return (
    <section data-tela="negocio" className="grid gap-2">
      <div className="grid gap-2 px-1">
        <Etiqueta tom="neutro">
          {apresentacao["spon"] === true
            ? "Patrocinado"
            : texto(apresentacao["cat"], negocio.category ?? "")}
        </Etiqueta>
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
          {texto(apresentacao["name"], negocio.display_name)}
        </h1>
        <p className="text-sm text-(--on-surface-variant)">
          {texto(apresentacao["cat"], negocio.category ?? "")} · {casca.cidade}
        </p>
      </div>

      {aguardando ? (
        <p className="flex items-center gap-2 rounded-2xl bg-(--secondary-container) px-4 py-3 text-sm">
          <Icone nome="hourglass_top" className="size-5 shrink-0" />
          Esta página foi indicada por um membro. O responsável ainda não confirmou as informações.
        </p>
      ) : null}

      {texto(apresentacao["disc"]) === "" ? null : (
        <p className="flex items-start gap-2 rounded-2xl bg-(--secondary-container) px-4 py-3 text-sm">
          <Icone nome="sell" className="mt-0.5 size-5 shrink-0" />
          <span>
            <b>Benefício para a comunidade</b>
            <br />
            {texto(apresentacao["disc"])}
          </span>
        </p>
      )}

      <Secao titulo="Como pode ajudar">
        <p className="text-[15px] leading-6">
          {texto(
            apresentacao["bio"],
            negocio.bio ?? "O responsável poderá completar a descrição quando assumir a página.",
          )}
        </p>
      </Secao>

      {servicos.length === 0 ? null : (
        <Secao titulo="Serviços">
          <ul className="flex flex-wrap gap-2">
            {servicos.map((item) => (
              <li
                key={String(item)}
                className="flex min-h-9 items-center gap-1.5 rounded-full bg-(--surface-lowest) px-3 text-sm ring-1 ring-(--outline-variant)"
              >
                <Icone nome="check" className="size-4 text-(--primary)" />
                {String(item)}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {bairros.length === 0 ? null : (
        <Secao titulo="Onde atende">
          <ul className="flex flex-wrap gap-2">
            {bairros.map((item) => (
              <li
                key={String(item)}
                className="flex min-h-9 items-center gap-1.5 rounded-full bg-(--surface-lowest) px-3 text-sm ring-1 ring-(--outline-variant)"
              >
                <Icone nome="location_on" className="size-4 text-(--primary)" />
                {String(item)}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="O que a comunidade diz">
        <div className="grid grid-cols-2 gap-2">
          <div className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-3 py-4 ring-1 ring-(--outline-variant)">
            <b className="text-[20px]">{indicacoes}</b>
            <small className="text-center text-[12px] text-(--on-surface-variant)">
              indicações da comunidade
            </small>
          </div>
          <div className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-3 py-4 ring-1 ring-(--outline-variant)">
            <Icone nome="schedule" className="size-5" />
            <small className="text-center text-[12px] text-(--on-surface-variant)">
              {texto(apresentacao["hours"], "Confirme com o responsável")}
            </small>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao
            icone="request_quote"
            onClick={() => void navegacao.irPara("pedidos")}
            disabled={aguardando}
          >
            Pedir orçamento
          </Botao>
          <Botao
            tom="contornado"
            icone={salvo ? "bookmark" : "bookmark_border"}
            aria-pressed={salvo}
            onClick={() => setSalvo((atual) => !atual)}
          >
            {salvo ? "Salvo" : "Salvar negócio"}
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
