"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Secao } from "@/components/bivaque/secao"
import { buscarPedido, type PedidoDeServico } from "@/lib/dados/negocios"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { SITUACOES_DO_PEDIDO } from "@/src/negocios/formulario"

export function Pedido() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const navegacao = useNavegacao()
  const [pedido, setPedido] = useState<PedidoDeServico | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura por pedido da pessoa
  useEffect(() => {
    const controle = new AbortController()
    setPedido(null)
    setErro(null)
    void buscarPedido(id, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setPedido(lido)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [id, rodada])

  return (
    <section data-tela="pedido" className="grid gap-2">
      <CabecaDePagina titulo="Pedido de serviço" subtitulo="Acompanhe o que ficou combinado." />
      {erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : pedido === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : (
        <>
          <Secao titulo={pedido.negocioNome}>
            <Etiqueta tom="neutro">{SITUACOES_DO_PEDIDO[pedido.situacao]}</Etiqueta>
            <p
              className="whitespace-pre-wrap break-words text-[15px] leading-6"
              data-descricao-do-pedido
            >
              {pedido.descricao}
            </p>
            <p className="text-sm text-(--on-surface-variant)">
              {pedido.categoriaNome}
              {pedido.quando === null ? "" : ` · ${pedido.quando}`}
            </p>
            <p className="text-[13px] text-(--on-surface-variant)">
              Atualizado em {new Date(pedido.atualizadoEm).toLocaleDateString("pt-BR")}
            </p>
          </Secao>
          <div className="flex flex-wrap justify-end gap-2">
            <Botao tom="contornado" onClick={() => void navegacao.irPara("pedidos")}>
              Ver meus pedidos
            </Botao>
            <Botao
              tom="texto"
              icone="storefront"
              onClick={() =>
                void navegacao.irPara("negocio", { parametros: { id: pedido.negocioId } })
              }
            >
              Ver negócio
            </Botao>
          </div>
        </>
      )}
    </section>
  )
}
