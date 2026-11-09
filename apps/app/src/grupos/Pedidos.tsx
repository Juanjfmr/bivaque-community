import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { lerPedidosDoGrupo, type PedidosDoGrupo } from "@/lib/dados/grupos"

export function Pedidos({ id }: { id: string }) {
  const [dados, setDados] = useState<PedidosDoGrupo | null>(null)
  const [erro, setErro] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const controle = useRef<AbortController | null>(null)
  const paginaEmCurso = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita uma nova leitura
  useEffect(() => {
    const pedido = new AbortController()
    controle.current = pedido
    paginaEmCurso.current = false
    setDados(null)
    setErro(false)
    setErroMais(false)
    setMais(false)
    void lerPedidosDoGrupo(id, { signal: pedido.signal })
      .then((lidos) => {
        if (!pedido.signal.aborted) setDados(lidos)
      })
      .catch(() => {
        if (!pedido.signal.aborted) setErro(true)
      })
    return () => pedido.abort()
  }, [id, rodada])

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
        <div className="grid justify-items-start gap-2">
          {erroMais ? <p role="alert">Não foi possível carregar mais pedidos.</p> : null}
          <Botao
            tom="texto"
            disabled={mais}
            onClick={() => {
              const pedido = controle.current
              if (!pedido || pedido.signal.aborted || paginaEmCurso.current || !dados.proximo)
                return
              paginaEmCurso.current = true
              const cursor = dados.proximo
              setMais(true)
              setErroMais(false)
              void lerPedidosDoGrupo(id, { depois: cursor, signal: pedido.signal })
                .then((pagina) => {
                  if (!pedido.signal.aborted)
                    setDados((atual) =>
                      atual?.proximo === cursor
                        ? { ...pagina, pedidos: [...atual.pedidos, ...pagina.pedidos] }
                        : atual,
                    )
                })
                .catch(() => {
                  if (!pedido.signal.aborted) setErroMais(true)
                })
                .finally(() => {
                  if (!pedido.signal.aborted) {
                    paginaEmCurso.current = false
                    setMais(false)
                  }
                })
            }}
          >
            {mais ? "Carregando…" : "Ver mais pedidos"}
          </Botao>
        </div>
      ) : null}
    </details>
  )
}
