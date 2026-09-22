"use client"

// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): o controle de carregar mais.
//
// É um BOTÃO, não rolagem infinita automática. A decisão está no ADR
// (docs/decisions/ADR-20260922-feed-paginado-por-cursor.md): rolagem automática
// cria armadilha de foco — a pessoa que navega por teclado ou leitor de tela
// pede a página seguinte e o foco é arrastado para conteúdo que ela não pediu, e
// o rodapé fica inalcançável porque a lista nunca termina. Aqui nada escuta
// `scroll` e nada observa interseção: a página seguinte só sai quando alguém
// aciona este botão.
//
// Os estados ficam juntos de propósito, porque a REGRA é uma só: falha da página
// seguinte MANTÉM o que já está na tela. Este componente é montado DEPOIS da
// lista, então nada aqui pode esvaziá-la — o pior caso é a lista continuar
// exatamente como estava, com a mensagem e "Tentar novamente" logo abaixo.
//
// Anúncio: o botão é um `<button>` de verdade com o rótulo visível "Carregar
// mais" (nome acessível = rótulo, sem aria-label que o contradiga) e 44 px de
// altura; o progresso e o fim vão para uma região viva `polite`. A falha é
// anunciada de forma ASSERTIVA pelo ErrorState (role="alert").

import { Button } from "@heroui/react"
import { useEffect, useRef, useState } from "react"
import { ErrorState } from "./error-state"

export const FEED_LOAD_MORE_LABEL = "Carregar mais"
export const FEED_END_LABEL = "Você está em dia"
export const FEED_END_ANNOUNCEMENT = "Você chegou ao fim das publicações."
export const FEED_LOADING_ANNOUNCEMENT = "Carregando mais publicações."
export const FEED_LOADED_ANNOUNCEMENT = "Mais publicações carregadas."

interface FeedLoadMoreProps {
  hasMore: boolean
  loading: boolean
  /** Falha da página SEGUINTE. Vazia quando não há falha pendente. */
  error: string
  onLoadMore: () => void
  /** Texto do fim da lista. `Relevantes` usa o dele (lista limitada). */
  endLabel?: string
  className?: string
}

export function FeedLoadMore({
  hasMore,
  loading,
  error,
  onLoadMore,
  endLabel = FEED_END_LABEL,
  className = "",
}: FeedLoadMoreProps) {
  const [announcement, setAnnouncement] = useState("")
  const wasLoading = useRef(loading)

  useEffect(() => {
    if (wasLoading.current === loading) return
    wasLoading.current = loading
    if (loading) {
      setAnnouncement(FEED_LOADING_ANNOUNCEMENT)
      return
    }
    if (error) {
      // O ErrorState já fala de forma assertiva; repetir aqui seria ruído.
      setAnnouncement("")
      return
    }
    setAnnouncement(hasMore ? FEED_LOADED_ANNOUNCEMENT : FEED_END_ANNOUNCEMENT)
  }, [loading, error, hasMore])

  return (
    // `data-testid` (precedente: return-strip): o e2e precisa alcançar ESTE
    // controle — e só ele — para provar que a falha mantém o feed na tela e que
    // o fim da lista é dito uma vez só.
    <div data-testid="feed-load-more" className={`flex flex-col gap-2 ${className}`}>
      {error ? <ErrorState message={error} onRetry={onLoadMore} /> : null}

      {loading ? (
        <Button variant="secondary" className="min-h-11 w-full" isDisabled aria-busy="true">
          {FEED_LOAD_MORE_LABEL}
        </Button>
      ) : error ? null : hasMore ? (
        <Button variant="secondary" className="min-h-11 w-full" onPress={onLoadMore}>
          {FEED_LOAD_MORE_LABEL}
        </Button>
      ) : (
        // Fim da lista: a paginação só diz que acabou quando o servidor devolveu
        // uma página curta ou vazia. Enquanto `hasMore` for verdadeiro, dizer
        // "você está em dia" seria falso — e era o que a versão anterior fazia.
        <p className="py-4 text-center text-sm text-muted">{endLabel}</p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
