// Botao de reacao inline no PostCard (S5 do mobile: UI).
//
// Consome toggleReaction() do S4 (logica pura). O estado local
// `reacted` e' a fonte da verdade para a UI: o servidor e' a fonte
// da verdade no proximo load do feed. Optimistic update: clica -> muda
// o estado local imediatamente -> chama o servidor em background -> em
// caso de erro de transporte, rollback + FeedbackAlert. Em caso de
// "denied" ou "already", a UI ja esta consistente com o servidor.
//
// Decisao: NAO usamos o estado `reacted` vindo do servidor (a tabela
// posts nao tem coluna me_reacted — exigiria uma subquery por post).
// Mantemos o estado local por sessao do React, o que e' honesto
// dado o modelo de "reagir agora" do golden slice. S6 (realtime)
// pode trocar isso por um set de user_ids com subscription.
//
// Accesibilidade: Pressable com accessibilityRole/State/Label/Hint,
// para que leitor de tela leia "Apoiar post de <autor>" / "Apoiado"
// / "Toque para desfazer" dependendo do estado.

import { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import { type ReactionOutcome, toggleReaction } from "../auth/reactions"
import { theme } from "../theme"

interface Props {
  postId: string
  userId: string
  initialCount: number
  initialReacted?: boolean
  onError?: (outcome: Extract<ReactionOutcome, { kind: "denied" | "transport" }>) => void
}

export function ReactionButton({
  postId,
  userId,
  initialCount,
  initialReacted = false,
  onError,
}: Props) {
  const [count, setCount] = useState(initialCount)
  const [reacted, setReacted] = useState(initialReacted)

  const handlePress = useCallback(async () => {
    const wasReacted = reacted
    // Optimistic: atualiza local antes do servidor. Em caso de erro de
    // transporte, rollback. Em "denied"/"already", mantem.
    setReacted(!wasReacted)
    setCount((c) => c + (wasReacted ? -1 : 1))

    const outcome = await toggleReaction(postId, userId, wasReacted)
    if (outcome.kind === "denied" || outcome.kind === "transport") {
      // Rollback otimista
      setReacted(wasReacted)
      setCount((c) => c + (wasReacted ? 1 : -1))
      onError?.(outcome)
      return
    }
    // 'ok' ou 'already' (no-op no servidor): estado local ja esta correto.
  }, [postId, userId, reacted, onError])

  const label = reacted ? "Apoiado — toque para desfazer" : "Apoiar"
  const hint = `${count} ${count === 1 ? "apoio" : "apoios"}`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected: reacted }}
      onPress={handlePress}
      testID={`reaction-${postId}`}
      style={({ pressed }) => [
        styles.button,
        reacted && styles.buttonReacted,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.label, reacted && styles.labelReacted]}>
        {reacted ? "Apoiado" : "Apoiar"}
      </Text>
      <Text style={[styles.count, reacted && styles.countReacted]}>{count}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.background,
  },
  buttonReacted: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.foreground,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: theme.text.sm,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  labelReacted: {
    color: theme.color.foreground,
  },
  count: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
    fontVariant: ["tabular-nums"],
  },
  countReacted: {
    color: theme.color.foreground,
    fontWeight: "600",
  },
})
