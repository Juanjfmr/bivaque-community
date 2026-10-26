"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"

/**
 * Painel do Bivaque (onda 8), versão de demonstração: números da cidade e os
 * negócios aguardando responsável. Filas de denúncia, verificação e cidades
 * entram com o backend.
 */
export function Dono() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)

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

  const numeros = useMemo(() => {
    if (dados === null) return { grupos: 0, anuncios: 0, negocios: 0, perguntas: 0 }
    return {
      grupos: dados.grupos.length,
      anuncios: dados.anuncios.length,
      negocios: dados.negocios.length,
      perguntas: dados.perguntas.length,
    }
  }, [dados])

  const aguardando = useMemo(() => {
    if (dados === null) return []
    return dados.negocios
      .map((negocio) => ({ negocio, apresentacao: registro(negocio.apresentacao) }))
      .filter(({ apresentacao }) => apresentacao["claimed"] === false)
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="dono" className="grid gap-2">
      <CabecaDePagina titulo="Painel do Bivaque" subtitulo={`Cidade em foco: ${casca.cidade}.`} />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Numero valor={numeros.grupos} rotulo="grupos" />
            <Numero valor={numeros.anuncios} rotulo="anúncios" />
            <Numero valor={numeros.negocios} rotulo="negócios" />
            <Numero valor={numeros.perguntas} rotulo="perguntas" />
          </div>

          <Secao titulo="Negócios aguardando responsável">
            {aguardando.length === 0 ? (
              <EstadoVazio
                titulo="Nenhuma página pendente"
                texto="Páginas indicadas por membros aparecem aqui até o responsável confirmar."
                icone="storefront"
              />
            ) : (
              <div className="grid gap-2">
                {aguardando.map(({ negocio, apresentacao }) => (
                  <LinhaDeLista
                    key={negocio.id}
                    icone="hourglass_top"
                    titulo={texto(apresentacao["name"], negocio.display_name)}
                    subtitulo={texto(apresentacao["cat"], negocio.category ?? "")}
                    onClick={() =>
                      void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                    }
                  />
                ))}
              </div>
            )}
          </Secao>

          <Secao titulo="Filas (com o backend)">
            <p className="text-sm text-(--on-surface-variant)">
              Denúncias, verificações pendentes e pedidos de revisão chegam quando o backend entrar.
              Nada aqui é simulado como decisão.
            </p>
          </Secao>
        </>
      )}
    </section>
  )
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-2 py-3 ring-1 ring-(--outline-variant)">
      <b className="text-[18px]">{valor}</b>
      <small className="text-center text-[11.5px] text-(--on-surface-variant)">{rotulo}</small>
    </div>
  )
}
