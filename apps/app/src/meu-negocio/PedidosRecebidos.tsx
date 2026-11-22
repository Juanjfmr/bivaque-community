import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { Nota } from "@/src/pecas/pecas"
import { Secao } from "@/components/bivaque/secao"
import {
  lerAtendimento,
  lerConversaDoPedido,
  type MensagemDoPedido,
  responderAoPedido,
  salvarAtendimento,
} from "@/lib/dados/prestador"
import { lerPedidos, type ListaDePedidos, mudarPedido, type PedidoDeServico } from "@/lib/dados/negocios"
import { useNavegacao, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { AreaDeTexto, Folha } from "@/src/pecas/pecas"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { mensagemDaAcao, SITUACOES_DO_PEDIDO } from "@/src/negocios/formulario"

/**
 * Pedidos/Atendimento de Meu negócio (TROCA-005).
 *
 * A fila é a dos pedidos RECEBIDOS — o `lado` vem do servidor, e o filtro é o do
 * dado, não uma aba nova. O detalhe abre na Folha única do NAV-001, com a
 * conversa do pedido; responder devolve o estado GRAVADO pelo banco, e a fila
 * mostra a situação nova. Abaixo, a área de atendimento: o alcance que decide se
 * a ficha aparece na busca.
 */

const ABERTAS = new Set(["open", "in_conversation"])

export function PedidosRecebidos({
  tipoDaConta,
  irParaFicha,
}: {
  readonly tipoDaConta: "membro" | "prestador"
  readonly irParaFicha: () => void
}) {
  const navegacao = useNavegacao()
  // A área de atendimento só existe para a conta de PRESTADOR: o alcance do
  // negócio do membro é a cidade e não se liga nem se desliga nesta aba.
  const ehPrestador = tipoDaConta === "prestador"
  const folha = useSobreposicaoDaEntrada("pedido-do-negocio")
  const [pedidos, setPedidos] = useState<ListaDePedidos | null>(null)
  const [erroDosPedidos, setErroDosPedidos] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [alcance, setAlcance] = useState<boolean | null>(null)
  const [comunidade, setComunidade] = useState<string | null>(null)
  const [cidade, setCidade] = useState<string | null>(null)
  const [temFicha, setTemFicha] = useState(true)
  const [erroDoAtendimento, setErroDoAtendimento] = useState<unknown>(null)
  const [salvandoAlcance, setSalvandoAlcance] = useState(false)
  const [mensagemDoAlcance, setMensagemDoAlcance] = useState<string | null>(null)

  const [selecionado, setSelecionado] = useState<PedidoDeServico | null>(null)
  const [mensagens, setMensagens] = useState<readonly MensagemDoPedido[] | null>(null)
  const [erroDaConversa, setErroDaConversa] = useState<unknown>(null)
  const [rodadaDaConversa, setRodadaDaConversa] = useState(0)
  const [resposta, setResposta] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [mensagemDaFolha, setMensagemDaFolha] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const controle = new AbortController()
    setPedidos(null)
    setErroDosPedidos(null)
    setMais(false)
    setErroMais(false)
    // O lado vem do servidor: esta aba só existe para os pedidos RECEBIDOS, e
    // filtrar no navegador perderia pedidos que ficaram na outra página.
    void lerPedidos({ lado: "recebidos", signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setPedidos(lidos)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErroDosPedidos(falha)
      })
    return () => controle.abort()
  }, [rodada])

  async function carregarMais() {
    if (pedidos === null || pedidos.proximo === null || mais) return
    setMais(true)
    setErroMais(false)
    try {
      const lidos = await lerPedidos({ lado: "recebidos", depois: pedidos.proximo })
      setPedidos((atual) =>
        atual === null || atual.proximo !== pedidos.proximo
          ? atual
          : { ...lidos, pedidos: [...atual.pedidos, ...lidos.pedidos] },
      )
    } catch {
      setErroMais(true)
    } finally {
      setMais(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    if (!ehPrestador) return
    const controle = new AbortController()
    setErroDoAtendimento(null)
    void lerAtendimento({ signal: controle.signal })
      .then((lido) => {
        if (controle.signal.aborted) return
        setTemFicha(lido.temFicha)
        setAlcance(lido.alcanceAtivo)
        setComunidade(lido.comunidade)
        setCidade(lido.cidade)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErroDoAtendimento(falha)
      })
    return () => controle.abort()
  }, [rodada])

  const conversa = selecionado?.id ?? null
  // biome-ignore lint/correctness/useExhaustiveDependencies: a conversa muda só com o pedido aberto
  useEffect(() => {
    if (conversa === null) return
    const controle = new AbortController()
    setMensagens(null)
    setErroDaConversa(null)
    setMensagemDaFolha(null)
    void lerConversaDoPedido(conversa, { signal: controle.signal })
      .then((lida) => {
        if (controle.signal.aborted) return
        setSelecionado(lida.pedido)
        setMensagens(lida.mensagens)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErroDaConversa(falha)
      })
    return () => controle.abort()
  }, [conversa, rodadaDaConversa])

  function abrir(pedido: PedidoDeServico) {
    setSelecionado(pedido)
    setResposta("")
    folha.aoMudarAberto(true)
  }

  function fechar() {
    setSelecionado(null)
    setMensagens(null)
    setErroDaConversa(null)
    folha.aoMudarAberto(false)
  }

  function atualizarNaLista(pedido: PedidoDeServico) {
    setPedidos(
      (atual) =>
        atual && {
          ...atual,
          pedidos: atual.pedidos.map((item) => (item.id === pedido.id ? pedido : item)),
        },
    )
  }

  async function enviarResposta() {
    if (selecionado === null || enviando) return
    setEnviando(true)
    setMensagemDaFolha(null)
    try {
      const lida = await responderAoPedido(selecionado.id, resposta)
      setSelecionado(lida.pedido)
      setMensagens(lida.mensagens)
      atualizarNaLista(lida.pedido)
      setResposta("")
      setMensagemDaFolha("Resposta enviada.")
    } catch (falha: unknown) {
      setMensagemDaFolha(mensagemDaAcao(falha))
    } finally {
      setEnviando(false)
    }
  }

  async function encerrar() {
    if (selecionado === null || enviando) return
    setEnviando(true)
    setMensagemDaFolha(null)
    try {
      const atualizado = await mudarPedido(selecionado.id, "encerrar")
      setSelecionado(atualizado)
      atualizarNaLista(atualizado)
      setMensagemDaFolha("Pedido encerrado.")
    } catch (falha: unknown) {
      setMensagemDaFolha(mensagemDaAcao(falha))
    } finally {
      setEnviando(false)
    }
  }

  async function gravarAlcance(ativo: boolean) {
    if (salvandoAlcance) return
    const anterior = alcance
    setAlcance(ativo)
    setSalvandoAlcance(true)
    setMensagemDoAlcance(null)
    try {
      const lido = await salvarAtendimento(ativo)
      setAlcance(lido.alcanceAtivo)
      setMensagemDoAlcance(
        lido.alcanceAtivo
          ? "Sua ficha aparece para os membros da comunidade."
          : "Sua ficha saiu da busca. Os pedidos continuam no histórico.",
      )
    } catch (falha: unknown) {
      setAlcance(anterior)
      // A frase é a do servidor quando ela existe: "Tente de novo" genérico
      // esconderia a recusa real (conta, comunidade, validação).
      setMensagemDoAlcance(mensagemDaAcao(falha))
    } finally {
      setSalvandoAlcance(false)
    }
  }

  const aberto = selecionado !== null && ABERTAS.has(selecionado.situacao)

  return (
    <div className="grid gap-2">
      <Secao titulo="Pedidos recebidos">
        {erroDosPedidos !== null ? (
          <FalhaDaLeitura falha={erroDosPedidos} aoTentar={() => setRodada((atual) => atual + 1)} />
        ) : pedidos === null ? (
          <EsqueletoDeLista linhas={3} />
        ) : pedidos.pedidos.length === 0 && pedidos.proximo === null ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhum pedido recebido ainda. Quando alguém pedir um serviço pelo seu negócio, o pedido
            aparece aqui.
          </p>
        ) : (
          <>
            <Lista>
              {pedidos.pedidos.map((pedido) => (
                <LinhaDeLista
                  key={pedido.id}
                  icone="request_quote"
                  titulo={pedido.descricao.split(/\r?\n/)[0] ?? pedido.descricao}
                  subtitulo={
                    pedido.bairro === null
                      ? (pedido.quando ?? "")
                      : `${pedido.quando ?? ""} · ${pedido.bairro}`
                  }
                  fim={<Etiqueta tom="neutro">{SITUACOES_DO_PEDIDO[pedido.situacao]}</Etiqueta>}
                  onClick={() => abrir(pedido)}
                />
              ))}
            </Lista>
            {erroMais ? (
              <p role="alert" className="text-sm text-(--destructive)">
                Não foi possível carregar mais pedidos. Os anteriores continuam aqui.
              </p>
            ) : null}
            {pedidos.proximo === null ? null : (
              <div className="flex justify-start">
                <Botao tom="contornado" disabled={mais} onClick={() => void carregarMais()}>
                  {mais ? "Carregando…" : erroMais ? "Tentar de novo" : "Ver mais pedidos"}
                </Botao>
              </div>
            )}
          </>
        )}
      </Secao>

      {ehPrestador ? (
        <Secao titulo="Área de atendimento">
          {erroDoAtendimento !== null ? (
            <FalhaDaLeitura
              falha={erroDoAtendimento}
              aoTentar={() => setRodada((atual) => atual + 1)}
            />
          ) : !temFicha ? (
            <Nota>Crie a página do negócio antes de definir a área de atendimento.</Nota>
          ) : alcance === null ? (
            <EsqueletoDeLista linhas={1} />
          ) : (
            <div className="grid gap-2">
              <p className="text-sm text-(--on-surface-variant)">
                {cidade === null ? "Região atendida não definida." : `Região atendida: ${cidade}.`}
              </p>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={alcance}
                  disabled={salvandoAlcance}
                  onChange={(evento) => void gravarAlcance(evento.target.checked)}
                />
                {comunidade === null
                  ? "Atender membros da comunidade que indicou você"
                  : `Atender membros de ${comunidade}`}
              </label>
              <p className="text-[13px] text-(--on-surface-variant)">
                Com o alcance ligado, a ficha aparece para os membros aprovados desta comunidade. Com
                ele desligado, a ficha sai da busca — os pedidos existentes continuam no histórico.
              </p>
              {mensagemDoAlcance === null ? null : (
                <p role="status" className="text-sm text-(--on-surface-variant)">
                  {mensagemDoAlcance}
                </p>
              )}
            </div>
          )}
        </Secao>
      ) : null}

      {!temFicha ? (
        <div className="flex justify-start">
          <Botao tom="texto" onClick={irParaFicha}>
            Ir para a ficha
          </Botao>
        </div>
      ) : null}

      <Folha
        aberta={folha.aberto && selecionado !== null}
        aoFechar={fechar}
        sobreposicao="pedido-do-negocio"
        titulo="Pedido recebido"
        descricao={selecionado === null ? undefined : SITUACOES_DO_PEDIDO[selecionado.situacao]}
      >
        {erroDaConversa !== null ? (
          <FalhaDaLeitura
            falha={erroDaConversa}
            aoTentar={() => setRodadaDaConversa((atual) => atual + 1)}
          />
        ) : selecionado === null || mensagens === null ? (
          <EsqueletoDeLista linhas={3} />
        ) : (
          <div className="grid gap-4" data-pedido-recebido={selecionado.id}>
            <div className="grid gap-1">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
                {selecionado.descricao}
              </p>
              <p className="text-[13px] text-(--on-surface-variant)">
                {selecionado.categoriaNome}
                {selecionado.quando === null ? "" : ` · ${selecionado.quando}`}
              </p>
              {selecionado.bairro === null ? null : (
                <p className="text-[13px] text-(--on-surface-variant)">
                  Bairro do pedido: {selecionado.bairro}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">Conversa</h3>
              {mensagens.length === 0 ? (
                <p className="text-sm text-(--on-surface-variant)">
                  Nenhuma mensagem ainda. Sua primeira resposta move o pedido para Em conversa.
                </p>
              ) : (
                <ul data-lista="mensagens-do-pedido" className="grid gap-2">
                  {mensagens.map((mensagem) => (
                    <li
                      key={mensagem.id}
                      data-mensagem={mensagem.minha ? "minha" : "dela"}
                      className={
                        mensagem.minha
                          ? "justify-self-end rounded-2xl bg-(--surface-low) px-3 py-2 text-sm"
                          : "justify-self-start rounded-2xl bg-(--surface-lowest) px-3 py-2 text-sm ring-1 ring-(--outline-variant)"
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
                      <p className="mt-1 text-[11px] text-(--on-surface-variant)">
                        {mensagem.minha ? "Você" : "Membro"} ·{" "}
                        {new Date(mensagem.criadoEm).toLocaleDateString("pt-BR")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {mensagemDaFolha === null ? null : (
              <p role={aberto ? "status" : "alert"} className="text-sm text-(--on-surface-variant)">
                {mensagemDaFolha}
              </p>
            )}

            {aberto ? (
              <form
                className="grid gap-2"
                onSubmit={(evento) => {
                  evento.preventDefault()
                  void enviarResposta()
                }}
              >
                <AreaDeTexto
                  rotulo="Resposta ao pedido"
                  rows={3}
                  maxLength={2000}
                  value={resposta}
                  placeholder="Responda ao pedido"
                  onChange={(evento) => setResposta(evento.target.value)}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Botao tom="texto" disabled={enviando} onClick={() => void encerrar()}>
                    Encerrar pedido
                  </Botao>
                  <Botao type="submit" disabled={enviando || resposta.trim() === ""}>
                    {enviando ? "Enviando…" : "Enviar resposta"}
                  </Botao>
                </div>
              </form>
            ) : (
              <p role="status" className="text-sm text-(--on-surface-variant)">
                Este pedido está encerrado. O histórico continua disponível.
              </p>
            )}

            {selecionado.conversaId === null ? null : (
              <Botao
                tom="contornado"
                icone="chat_bubble"
                onClick={() =>
                  void navegacao.irPara("conversa", {
                    parametros: { id: selecionado.conversaId ?? "" },
                  })
                }
              >
                Abrir conversa
              </Botao>
            )}
          </div>
        )}
      </Folha>
    </div>
  )
}
