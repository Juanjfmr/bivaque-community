import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { lerPedidosDoGrupo, type PedidosDoGrupo } from "@/lib/dados/grupos"

export function Pedidos({ id }: { id: string }) {
  const [dados, setDados] = useState<PedidosDoGrupo | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura
  useEffect(() => {
    const pedido = new AbortController()
    setErro(false)
    void lerPedidosDoGrupo(id, { signal: pedido.signal })
      .then((lidos) => {
        if (!pedido.signal.aborted) setDados(lidos)
      })
      .catch(() => {
        if (!pedido.signal.aborted) setErro(true)
      })
    return () => pedido.abort()
  }, [id, rodada])
  async function carregarMais() {
    if (!dados?.proximo || mais) return
    setMais(true)
    setErro(false)
    try {
      const pagina = await lerPedidosDoGrupo(id, { depois: dados.proximo, signal: controle.signal })
      if (!controle.signal.aborted)
        setDados({ ...pagina, pedidos: [...dados.pedidos, ...pagina.pedidos] })
    } catch {
      if (!controle.signal.aborted) setErro(true)
    } finally {
      if (!controle.signal.aborted) setMais(false)
    }
  }
  return (
    <details
      data-pedidos-entrada="sim"
      className="rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
    >
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        Pedidos de entrada{dados ? ` (${dados.pedidos.length})` : ""}
      </summary>
      {erro ? (
        <div role="alert">
          <p>Não foi possível carregar os pedidos.</p>
          <Botao tom="texto" onClick={() => setRodada((r) => r + 1)}>
            Tentar de novo
          </Botao>
        </div>
      ) : !dados ? (
        <EsqueletoDeLista linhas={2} />
      ) : dados.pedidos.length === 0 ? (
        <p className="text-sm">Nenhum pedido pendente.</p>
      ) : (
        <ul className="grid gap-2">
          {dados.pedidos.map((p) => (
            <li key={p.id} className="rounded-xl bg-(--surface-low) p-3 text-sm">
              <b>{p.nome || "Membro"}</b>
              <p>{p.motivo || "Sem motivo informado."}</p>
            </li>
          ))}
        </ul>
      )}
      {dados?.proximo ? (
        <Botao tom="texto" disabled={mais} onClick={() => void carregarMais()}>
          Ver mais pedidos
        </Botao>
      ) : null}
    </details>
  )
}
