"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Secao } from "@/components/bivaque/secao"
import { buscarPedido, mudarPedido, type PedidoDeServico } from "@/lib/dados/negocios"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { mensagemDaAcao, SITUACOES_DO_PEDIDO } from "@/src/negocios/formulario"

/**
 * O pedido visto pelos DOIS lados (F07, RUN-177).
 *
 * Quem pediu acompanha o que enviou; o dono do negócio acompanha o que recebeu.
 * As ações são as que cada lado pode de verdade: cancelar é de quem pediu;
 * encerrar é dos dois. Cada ação passa pela confirmação da ENTRADA (uma
 * sobreposição por vez — a lição do empilhamento de 16/11), e a situação é
 * relida do banco depois da ação, nunca presumida pela tela.
 */
const ABERTAS = new Set(["open", "in_conversation"])

export function Pedido() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const navegacao = useNavegacao()
  const { aberto: confirmando, aoMudarAberto: setConfirmando } =
    useSobreposicaoDaEntrada("confirmacao")
  const [pedido, setPedido] = useState<PedidoDeServico | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [acao, setAcao] = useState<"cancelar" | "encerrar">("encerrar")
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura por pedido da pessoa
  useEffect(() => {
    const controle = new AbortController()
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

  function pedirConfirmacao(qual: "cancelar" | "encerrar") {
    setAcao(qual)
    setMensagem(null)
    setAviso(null)
    setConfirmando(true)
  }

  function executar() {
    setConfirmando(false)
    if (ocupado) return
    setOcupado(true)
    setMensagem(null)
    void (async () => {
      try {
        const atualizado = await mudarPedido(id, acao)
        setPedido(atualizado)
        setAviso(acao === "cancelar" ? "Pedido cancelado." : "Pedido encerrado.")
      } catch (falha: unknown) {
        setMensagem(mensagemDaAcao(falha))
        // A recusa pode ser só a situação que mudou: reler evita tela mentirosa.
        setRodada((atual) => atual + 1)
      } finally {
        setOcupado(false)
      }
    })()
  }

  const aberto = pedido !== null && ABERTAS.has(pedido.situacao)
  const doDono = pedido?.lado === "dono"

  return (
    <section data-tela="pedido" className="grid gap-2">
      <CabecaDePagina
        titulo="Pedido de serviço"
        subtitulo={doDono ? "Você recebeu este pedido." : "Acompanhe o que ficou combinado."}
      />
      {erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : pedido === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : (
        <>
          <Secao titulo={pedido.negocioNome}>
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom="neutro">{SITUACOES_DO_PEDIDO[pedido.situacao]}</Etiqueta>
              <Etiqueta tom="info">{doDono ? "Recebido" : "Enviado"}</Etiqueta>
            </div>
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
            {mensagem === null ? null : (
              <p role="alert" className="text-sm text-(--destructive)">
                {mensagem}
              </p>
            )}
            {aviso === null ? null : (
              <p role="status" className="text-sm text-(--primary)">
                {aviso}
              </p>
            )}
            {pedido.conversaId === null ? null : (
              <div className="flex flex-wrap gap-2">
                <Botao
                  tom="contornado"
                  icone="chat_bubble"
                  onClick={() =>
                    void navegacao.irPara("conversa", {
                      parametros: { id: pedido.conversaId ?? "" },
                    })
                  }
                >
                  Abrir conversa
                </Botao>
              </div>
            )}
          </Secao>
          <div className="flex flex-wrap justify-end gap-2">
            {aberto && !doDono ? (
              <Botao
                tom="texto"
                icone="cancel"
                disabled={ocupado}
                onClick={() => pedirConfirmacao("cancelar")}
              >
                Cancelar pedido
              </Botao>
            ) : null}
            {aberto ? (
              <Botao
                tom="contornado"
                icone="check_circle"
                disabled={ocupado}
                onClick={() => pedirConfirmacao("encerrar")}
              >
                Encerrar pedido
              </Botao>
            ) : null}
            <Botao tom="contornado" onClick={() => void navegacao.irPara("pedidos")}>
              Ver pedidos
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
          {confirmando ? (
            <Confirmacao
              titulo={acao === "cancelar" ? "Cancelar este pedido?" : "Encerrar este pedido?"}
              texto={
                acao === "cancelar"
                  ? "O negócio deixa de ver o pedido como aberto. Você pode enviar outro depois."
                  : "Os dois lados passam a ver o pedido como encerrado. A conversa continua em Conversas."
              }
              confirmar={acao === "cancelar" ? "Cancelar pedido" : "Encerrar pedido"}
              perigo={acao === "cancelar"}
              aoConfirmar={executar}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
