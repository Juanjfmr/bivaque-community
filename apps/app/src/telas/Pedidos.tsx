"use client"

import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type ListaDePedidos, lerPedidos } from "@/lib/dados/negocios"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { SITUACOES_DO_PEDIDO } from "@/src/negocios/formulario"

export function Pedidos() {
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<ListaDePedidos | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const controle = useRef<AbortController | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const leitura = new AbortController()
    controle.current = leitura
    setDados(null)
    setErro(null)
    setMais(false)
    setErroMais(false)
    void lerPedidos({ signal: leitura.signal })
      .then((lidos) => {
        if (!leitura.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!leitura.signal.aborted) setErro(falha)
      })
    return () => leitura.abort()
  }, [rodada])

  async function carregarMais() {
    const leitura = controle.current
    if (dados === null || dados.proximo === null || mais || leitura === null) return
    setMais(true)
    setErroMais(false)
    try {
      const lidos = await lerPedidos({ depois: dados.proximo, signal: leitura.signal })
      if (!leitura.signal.aborted)
        setDados({ ...lidos, pedidos: [...dados.pedidos, ...lidos.pedidos] })
    } catch {
      if (!leitura.signal.aborted) setErroMais(true)
    } finally {
      if (!leitura.signal.aborted) setMais(false)
    }
  }

  return (
    <section data-tela="pedidos" className="grid gap-2">
      <CabecaDePagina
        titulo="Pedidos de serviço"
        subtitulo="Acompanhe o que você pediu aos negócios da sua cidade."
      />
      <p className="text-[13px] text-(--on-surface-variant)">
        Valores e pagamento são combinados entre vocês. O Bivaque não intermedeia pagamento nem
        garante o serviço.
      </p>
      <Secao titulo="Meus pedidos">
        {erro !== null ? (
          <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
        ) : dados === null ? (
          <EsqueletoDeLista linhas={3} />
        ) : dados.pedidos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum pedido ainda"
            texto="Encontre um negócio e conte o que precisa. Você acompanha a situação do pedido por aqui."
            icone="build"
          />
        ) : (
          <Lista>
            {dados.pedidos.map((pedido) => (
              <LinhaDeLista
                key={pedido.id}
                icone="request_quote"
                titulo={pedido.descricao.split(/\r?\n/)[0] ?? pedido.descricao}
                subtitulo={pedido.negocioNome}
                fim={<Etiqueta tom="neutro">{SITUACOES_DO_PEDIDO[pedido.situacao]}</Etiqueta>}
                onClick={() => void navegacao.irPara("pedido", { parametros: { id: pedido.id } })}
              />
            ))}
          </Lista>
        )}
        {erroMais ? (
          <p role="alert" className="text-sm text-(--destructive)">
            Não foi possível carregar mais pedidos. Os anteriores continuam aqui.
          </p>
        ) : null}
        {dados?.proximo == null ? null : (
          <Botao tom="contornado" disabled={mais} onClick={() => void carregarMais()}>
            {mais ? "Carregando…" : erroMais ? "Tentar de novo" : "Ver mais pedidos"}
          </Botao>
        )}
      </Secao>
      <Secao titulo="Como funciona">
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-(--on-surface-variant)">
          <li>Escolha um negócio e descreva o serviço e o prazo.</li>
          <li>O responsável recebe seu pedido.</li>
          <li>Acompanhe a situação e combine os detalhes com o responsável.</li>
        </ol>
        <div className="flex justify-end">
          <Botao
            tom="contornado"
            icone="storefront"
            onClick={() => void navegacao.irPara("negocios")}
          >
            Ver negócios locais
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
