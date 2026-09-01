// Modal de publicacao (S5 do mobile: UI do Composer).
//
// Esta UI consome publishPost() do S4. Apenas o tipo Texto nesta
// fatia (Foto/Link/Enquete ficam para S6). O Composer Sheet e'
// full-screen (Modal nativo do RN) porque cobre a UX esperada:
// textarea grande + botao Cancelar/Publicar + feedback inline.
//
// Estados:
//   - open=false: nao renderiza
//   - open=true, status=idle: form pronto, sem erro
//   - open=true, status=submitting: textarea desabilitada,
//     botao Publicar mostra Spinner + "Publicando..."
//   - open=true, status=error: FeedbackAlert danger com copy do
//     classifyPublishError (anti-enumeracao §4.3, mesma copy do web)
//
// Decisao de UX: o rascunho e' preservado em caso de erro de
// transporte (preserveDraft=true no classificador). O caller e'
// responsavel por nao chamar onClose() quando o erro e' de transporte.
//
// Por que seletor de audiencia e' apenas a vila aprovada do membro:
// cross-village post e' uma jornada futura (S6+) e exige picker
// mais elaborado. Nesta fatia, membro aprovado na Vila Ajuricaba
// so pode postar para a sua vila.

import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { type Audience, type PublishInput, publishPost } from "../auth/publish"
import type { PublishErrorView } from "../auth/publish-error"
import { theme } from "../theme"

interface Props {
  open: boolean
  authorId: string
  communityId: string | null
  localityId: string | null
  onClose: () => void
  onPublished: () => void
}

type Status = "idle" | "submitting" | "error"

const PLACEHOLDER = "O que está acontecendo na sua vila?"

export function Composer({ open, authorId, communityId, localityId, onClose, onPublished }: Props) {
  const [content, setContent] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorView, setErrorView] = useState<PublishErrorView | null>(null)

  const reset = useCallback(() => {
    setContent("")
    setStatus("idle")
    setErrorView(null)
  }, [])

  const handleClose = useCallback(() => {
    if (status === "submitting") return
    reset()
    onClose()
  }, [status, onClose, reset])

  const handleSubmit = useCallback(async () => {
    if (status === "submitting") return
    const trimmed = content.trim()
    if (trimmed.length === 0) return
    setStatus("submitting")
    setErrorView(null)

    // Decisao: apenas audience=village nesta fatia. O caller
    // (community.tsx) e' responsavel por oferecer o selector.
    const audience: Audience = "village"
    const input: PublishInput = {
      authorId,
      content: trimmed,
      audience,
      communityId,
      localityId,
    }

    const result = await publishPost(input)
    if (result.kind === "ok") {
      reset()
      onPublished()
      onClose()
      return
    }
    // Erro: copy generica (anti-enumeracao §4.3). Mantem o rascunho
    // se a classificacao indicar preserveDraft.
    setStatus("error")
    setErrorView(result.view)
  }, [content, status, authorId, communityId, localityId, onPublished, onClose, reset])

  const isSubmitting = status === "submitting"
  const canSubmit = content.trim().length > 0 && !isSubmitting

  return (
    <Modal visible={open} animationType="slide" onRequestClose={handleClose} transparent={false}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar publicação"
            onPress={handleClose}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <Text style={styles.headerButtonText}>Cancelar</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Nova publicação</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publicar"
            accessibilityState={{ disabled: !canSubmit }}
            onPress={handleSubmit}
            disabled={!canSubmit}
            testID="composer-submit"
            style={({ pressed }) => [
              styles.headerPrimary,
              !canSubmit && styles.headerPrimaryDisabled,
              pressed && canSubmit && styles.headerButtonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.color.background} />
            ) : (
              <Text style={styles.headerPrimaryText}>Publicar</Text>
            )}
          </Pressable>
        </View>

        <TextInput
          style={styles.textarea}
          placeholder={PLACEHOLDER}
          placeholderTextColor={theme.color.muted}
          value={content}
          onChangeText={setContent}
          editable={!isSubmitting}
          multiline
          autoFocus
          accessibilityLabel="Conteúdo da publicação"
        />

        {status === "error" && errorView ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Text style={styles.errorTitle}>{errorView.message}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerMeta}>
            {status === "submitting" ? "Publicando…" : "Só os aprovados desta vila vão ler"}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  headerTitle: {
    fontSize: theme.text.base,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  headerButton: {
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
  },
  headerButtonPressed: {
    opacity: 0.6,
  },
  headerButtonText: {
    fontSize: theme.text.base,
    color: theme.color.muted,
  },
  headerPrimary: {
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.color.foreground,
    borderRadius: theme.radius.base,
    minWidth: 90,
    alignItems: "center",
  },
  headerPrimaryDisabled: {
    opacity: 0.5,
  },
  headerPrimaryText: {
    color: theme.color.background,
    fontSize: theme.text.sm,
    fontWeight: "600",
  },
  textarea: {
    flex: 1,
    padding: theme.space[6],
    fontSize: theme.text.base,
    color: theme.color.foreground,
    textAlignVertical: "top",
    lineHeight: 1.5,
  },
  errorBox: {
    marginHorizontal: theme.space[4],
    marginBottom: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.danger,
    backgroundColor: theme.color.surface,
  },
  errorTitle: {
    color: theme.color.foreground,
    fontSize: theme.text.sm,
  },
  footer: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  footerMeta: {
    fontSize: theme.text.xs,
    color: theme.color.muted,
  },
})
