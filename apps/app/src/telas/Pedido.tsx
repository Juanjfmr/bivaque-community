"use client"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

/**
 * O pedido da onda 7: a demonstração ainda não tem pedidos no contrato de
 * dados, então a tela devolve o estado vazio com o caminho de volta. O detalhe
 * completo (propostas, comparar, escolher) entra com o backend.
 */
export function Pedido() {
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="pedido" className="grid gap-2">
      <CabecaDePagina
        titulo="Pedido de serviço"
        subtitulo="Propostas, prazos e a escolha ficam nesta tela."
      />
      <EstadoVazio
        titulo="Este pedido não está na demonstração"
        texto="Os pedidos de verdade entram quando o backend chegar. Enquanto isso, veja como funciona na lista de pedidos."
        icone="request_quote"
        acao={{
          rotulo: "Ver Pedidos de serviço",
          aoAcionar: () => void navegacao.irPara("pedidos"),
        }}
      />
      <div className="flex justify-end">
        <Botao tom="texto" icone="storefront" onClick={() => void navegacao.irPara("negocios")}>
          Ver negócios locais
        </Botao>
      </div>
    </section>
  )
}
