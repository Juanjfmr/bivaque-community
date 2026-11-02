"use client"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Secao } from "@/components/bivaque/secao"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"

/**
 * Pedidos de serviço da onda 7 (protótipo: features/requests/views.js).
 * Na demonstração não há pedidos no contrato de dados; a tela explica como
 * funciona e o vazio fica honesto. O fluxo completo (criar, propostas,
 * escolher) entra quando houver backend.
 */
export function Pedidos() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  useRolagemEFoco(CARGA_CONCLUIDA)

  return (
    <section data-tela="pedidos" className="grid gap-2">
      <CabecaDePagina
        titulo="Pedidos de serviço"
        subtitulo={`Descreva o que precisa e receba propostas de empresas do ramo em ${casca.cidade}.`}
      />

      <p className="text-[13px] text-(--on-surface-variant)">
        Valores e pagamento são combinados entre vocês. O Bivaque não intermedeia pagamento nem
        garante o serviço.
      </p>

      <Secao titulo="Meus pedidos">
        <EstadoVazio
          titulo="Nenhum pedido ainda"
          texto="Conte o serviço, o bairro e quando precisa. Empresas do ramo respondem com valor, data e prazo."
          icone="build"
        />
      </Secao>

      <Secao titulo="Como funciona">
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-(--on-surface-variant)">
          <li>Crie o pedido com o serviço, o bairro e o prazo.</li>
          <li>Empresas do ramo respondem com orçamento e disponibilidade.</li>
          <li>Você compara e escolhe uma proposta; a conversa abre direto.</li>
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
