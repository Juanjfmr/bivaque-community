import { useLocation } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { buscarNegocio, type Negocio } from "@/lib/dados/negocios"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { FalhaDaLeitura } from "./FalhaDaLeitura"
import { FormularioDePedido } from "./FormularioDePedido"

/**
 * O pedido de serviço com endereço próprio (F07, RUN-177).
 *
 * É a MESMA folha da ficha do negócio, aberta por URL: `/app/pedidos/novo` com
 * o negócio em `?destino=`. A ficha linka para cá (o endereço sobrevive à
 * recarga e ao link compartilhado) e o menu Criar chega sem destino, que é o
 * caso de quem ainda não escolheu o negócio — aí a tela oferece a lista em vez
 * de inventar um destinatário.
 */
export function PedidoNovo() {
  const navegacao = useNavegacao()
  const busca = useLocation({ select: (linha) => linha.search as Record<string, unknown> })
  const destino = typeof busca["destino"] === "string" ? busca["destino"] : ""
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    if (destino === "") return
    const controle = new AbortController()
    setNegocio(null)
    setErro(null)
    void buscarNegocio(destino, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setNegocio(lido)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [destino, rodada])

  return (
    <section data-tela="pedido-novo" className="grid gap-2">
      <CabecaDePagina
        titulo="Pedir orçamento"
        subtitulo="Descreva o que precisa. Valores e pagamento são combinados entre vocês."
      />
      {destino === "" ? (
        <EstadoVazio
          titulo="Escolha o negócio"
          texto="O pedido é enviado a um negócio da sua cidade. Encontre um na lista e conte o que precisa."
          icone="storefront"
          acao={{ rotulo: "Ver negócios", aoAcionar: () => void navegacao.irPara("negocios") }}
        />
      ) : erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : negocio === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : negocio.podePedir ? (
        <FormularioDePedido
          key={negocio.id}
          negocioId={negocio.id}
          nome={negocio.nome}
          aoFechar={() => void navegacao.voltar()}
          aoSalvar={(pedidoId) =>
            void navegacao.irPara("pedido", { parametros: { id: pedidoId }, replace: true })
          }
        />
      ) : (
        <EstadoVazio
          titulo="Esta é a sua ficha"
          texto="Os pedidos de serviço são enviados a outros negócios. Você recebe os seus em Pedidos."
          icone="request_quote"
          acao={{ rotulo: "Ver pedidos", aoAcionar: () => void navegacao.irPara("pedidos") }}
        />
      )}
    </section>
  )
}
