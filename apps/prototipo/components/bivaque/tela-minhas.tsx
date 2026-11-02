"use client"

import { MessagesSquare, Plus } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { Indicacao } from "@/lib/dados/indicacoes"
import { cidadeAtual, fonteDeIndicacoes } from "@/lib/dados/indicacoes"
import { COMUNIDADE, MINHAS } from "@/lib/demo/textos"
import { EsqueletoDeLista } from "./esqueleto-de-lista"
import { EstadoDeErro } from "./estado-de-erro"
import { EstadoVazio } from "./estado-vazio"
import { Icone } from "./icone"
import { LinhaDePergunta } from "./linha-de-pergunta"
import { useBivaque } from "./provedor"

// "Minhas perguntas e indicações" (`features/profile/views.js`,
// renderMineQuestions): o que a pessoa perguntou ou respondeu.
export function TelaMinhas() {
  const { abrirPerguntar } = useBivaque()
  const [itens, setItens] = useState<Indicacao[] | null>(null)
  const [erro, setErro] = useState(false)
  const pedido = useRef(0)

  const carregar = useCallback(async () => {
    const meu = pedido.current + 1
    pedido.current = meu
    setErro(false)
    setItens(null)
    try {
      const lista = await fonteDeIndicacoes().minhas(cidadeAtual())
      if (meu !== pedido.current) return
      setItens(lista)
    } catch {
      if (meu !== pedido.current) return
      setErro(true)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return (
    <div className="grid gap-4 pt-5 md:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] leading-7.5 tracking-[-0.3px] md:text-[30px]">
            {MINHAS.titulo}
          </h1>
          <p className="mt-1 text-sm text-(--muted-foreground)">{MINHAS.subtitulo}</p>
        </div>
        <Button variant="secondary" onClick={abrirPerguntar} className="shrink-0">
          <Icone glifo={Plus} />
          {COMUNIDADE.perguntar}
        </Button>
      </div>

      {erro ? (
        <EstadoDeErro aoTentar={() => void carregar()} />
      ) : itens === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : itens.length > 0 ? (
        <ul className="grid gap-1 rounded-2xl bg-(--surface-lowest) p-1">
          {itens.map((indicacao) => (
            <li key={indicacao.id}>
              <LinhaDePergunta indicacao={indicacao} />
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVazio titulo={MINHAS.vazio} texto={MINHAS.vazioTexto} glifo={MessagesSquare}>
          <Button variant="secondary" onClick={abrirPerguntar}>
            {COMUNIDADE.pedirIndicacao}
          </Button>
        </EstadoVazio>
      )}
    </div>
  )
}
