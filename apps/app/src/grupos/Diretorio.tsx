import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { type ListaDeGrupos, lerGrupos } from "@/lib/dados/grupos"
import { useNavegacao } from "@/lib/navegacao/react"
import { EstadoDaLeitura } from "./EstadoDaLeitura"

export function Diretorio() {
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<ListaDeGrupos | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura
  useEffect(() => {
    const pedido = new AbortController()
    setDados(null)
    setErro(null)
    void lerGrupos({ signal: pedido.signal })
      .then((lidos) => {
        if (!pedido.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!pedido.signal.aborted) setErro(falha)
      })
    return () => pedido.abort()
  }, [rodada])
  async function carregarMais() {
    if (!dados?.proximo || mais) return
    setMais(true)
    setErroMais(false)
    try {
      const pagina = await lerGrupos({ depois: dados.proximo, signal: controle.signal })
      if (!controle.signal.aborted)
        setDados({ ...pagina, grupos: [...dados.grupos, ...pagina.grupos] })
    } catch {
      if (!controle.signal.aborted) setErroMais(true)
    } finally {
      if (!controle.signal.aborted) setMais(false)
    }
  }
  if (erro) return <EstadoDaLeitura erro={erro} aoTentar={() => setRodada((r) => r + 1)} />
  if (!dados) return <EsqueletoDeLista linhas={3} />
  return (
    <div data-diretorio-grupos="sim" className="grid gap-3">
      {dados.grupos.length === 0 ? (
        <EstadoVazio
          titulo="Ainda sem grupos nesta cidade"
          texto="Grupos reúnem quem tem a mesma rotina, o mesmo ciclo ou o mesmo interesse."
          icone="group"
        />
      ) : (
        dados.grupos.map((grupo) => (
          <article
            key={grupo.id}
            className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
          >
            <h2 className="text-lg">{grupo.nome}</h2>
            <p className="text-sm text-(--on-surface-variant)">{grupo.descricao}</p>
            <small>
              {grupo.fechado ? "Fechado" : "Aberto"}
              {grupo.membro ? " · Participando" : grupo.pendente ? " · Aguardando aprovação" : ""}
            </small>
            <Botao
              tom="tonal"
              onClick={() => void navegacao.irPara("grupo", { parametros: { id: grupo.id } })}
            >
              Ver grupo
            </Botao>
          </article>
        ))
      )}
      {erroMais ? <p role="alert">Não foi possível carregar mais grupos. Tente de novo.</p> : null}
      {dados.proximo ? (
        <Botao tom="tonal" disabled={mais} onClick={() => void carregarMais()}>
          {mais ? "Carregando…" : "Ver mais grupos"}
        </Botao>
      ) : null}
    </div>
  )
}
