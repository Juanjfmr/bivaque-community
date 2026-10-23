"use client"

// Criação de publicação (prancha 44 painel 1 + prancha 45). Composição: a
// PERGUNTA primeiro, depois o destino real ("Quem pode ver?"), detalhes
// opcionais, anexo opcional e a prévia "Como sua publicação será vista".
//
// Publicar existe SÓ dentro de um grupo (lote 5, tarefa N2 —
// ADR-20261023-comunidade-do-prototipo). O seletor de destino lista os grupos
// em que a pessoa é aprovada; cidade inteira e vila saíram, e a RLS
// posts_insert_locality_member recusa no servidor qualquer publicação sem
// grupo (migration 20261024100000). Quem não participa de grupo nenhum recebe
// o caminho para entrar em um, não um destino inventado.
//
// A intenção já foi escolhida na tela anterior ("Fazer uma pergunta" /
// "Pedir uma indicação"), então este modal NÃO pergunta o formato de novo:
// não existe seletor de Texto/Foto/Link/Enquete antes do conteúdo. Anexar foto
// ou link é opção SOBRE a pergunta e começa vazia; é o ANEXO REAL que deriva o
// `post_type` gravado (ver `derived`). Não há enquete — nem editor, nem estado.
//
// Rascunho (RECON-014): o texto fica no armazenamento do PRÓPRIO navegador
// (feed-post-draft), nunca no servidor; quem foi interrompido recupera o que
// escreveu ao reabrir; descartar é explícito e confirmado — nada apaga em
// silêncio. Publicar continua sendo decisão da pessoa: nenhum rascunho vira
// publicação sozinho.

import { detectCep, detectCpf } from "@bivaque/domain"
import { Button, Input, Modal, Spinner, TextArea, useOverlayState } from "@heroui/react"
import { ImagePlus, Link2 } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import {
  attachmentPublishBlocker,
  derivePostType,
  normalizeAttachment,
  type PostAttachment,
} from "../../../lib/composer/post-attachment"
import { classifyPublishError } from "../../../lib/composer/publish-error"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ModalCloseTrigger } from "./close-button"
import { ConnectionLostState } from "./error-state"
import {
  type AudienceDestination,
  AudiencePicker,
  audienceNoticeText,
  usePostAudience,
} from "./feed-post-audience"
import {
  clearPostDraft,
  hasDraftContent,
  loadPostDraft,
  type PostDraftFields,
  savePostDraftFields,
} from "./feed-post-draft"
import { DraftDiscardDialog, DraftNotices } from "./feed-post-draft-ui"
import { PhotoField } from "./feed-post-photo"
import { PostPiiWarning } from "./feed-post-pii-warning"
import { PostPreview } from "./feed-post-preview"
import {
  type AudienceKey,
  composePostContent,
  parseAudienceKey,
  useCurrentUser,
} from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { showToast } from "./toast"

interface CreatePostModalProps {
  localityId: string
  /** Dica da TELA DE ENTRADA: qual anexo já vem oferecido ao abrir. Nunca
   *  escolhe o formato — o `post_type` sai do anexo real (`derived`), então
   *  abrir por aqui e não anexar nada publica uma pergunta de texto. */
  initialAttachment?: string | undefined
  onCreated: () => void
  onClose: () => void
}

const AUTOSAVE_DELAY_MS = 400

export function CreatePostModal({
  localityId,
  initialAttachment,
  onCreated,
  onClose,
}: CreatePostModalProps) {
  const modal = useOverlayState({ defaultOpen: true, onOpenChange: (open) => !open && onClose() })
  const initialDraft = useRef(loadPostDraft())
  const [attachment, setAttachment] = useState<PostAttachment>(() => {
    const draft = initialDraft.current
    if (draft?.photoPath.trim()) return "photo"
    if (draft?.linkUrl.trim()) return "link"
    return normalizeAttachment(initialAttachment)
  })
  const [content, setContent] = useState(initialDraft.current?.content ?? "")
  const [details, setDetails] = useState(initialDraft.current?.details ?? "")
  const [photoPath, setPhotoPath] = useState(initialDraft.current?.photoPath ?? "")
  const [linkUrl, setLinkUrl] = useState(initialDraft.current?.linkUrl ?? "")
  const [submitting, setSubmitting] = useState(false)
  // O `kind` do classificador decide a SUPERFÍCIE do erro: falha de transporte
  // (offline, DNS, timeout) é o estado "Sem conexão" da prancha 60, com retomada
  // real; rejeição do servidor continua no alerta genérico (anti-enumeração).
  const [error, setError] = useState("")
  const [errorKind, setErrorKind] = useState<"network" | "server" | null>(null)
  const [photoError, setPhotoError] = useState("")
  const [piiWarning, setPiiWarning] = useState(false)
  // Nada escolhido no começo: o destino começa vazio e quem escolhe é a pessoa.
  // Pré-selecionar um grupo faria a publicação sair para um público que ela não
  // olhou — é a mesma classe do vazamento por desatenção que a onda E fechou,
  // agora com grupos.
  const [audienceKey, setAudienceKey] = useState<AudienceKey>("")
  const [draftRestored, setDraftRestored] = useState(hasDraftContent(initialDraft.current))
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  const audience = usePostAudience(localityId)
  const currentUser = useCurrentUser()
  // O compositor oferece SÓ grupos (lote 5 N2): cidade e vila saíram do
  // seletor, e o banco recusa publicação sem grupo.
  const destinations: AudienceDestination[] = audience.groups
  const selected: AudienceDestination | null =
    destinations.find((destination) => destination.key === audienceKey) ?? null
  const hasGroups = audience.groups.length > 0
  // O DESTINO REAL vem do destino DA LISTA, nunca de uma chave solta: se o
  // grupo saiu da lista (a pessoa deixou de participar), não há destino — e o
  // envio não acontece. Derivar do destino exibido degradava para a cidade
  // quando a lista ainda não tinha chegado, e quem publicasse nessa janela
  // mandava o post para um público que não escolheu. Aqui a lista é a única
  // fonte, e `null` = nada escolhido.
  const selectedGroup = selected ? parseAudienceKey(selected.key) : null

  useEffect(() => {
    if (!modal.isOpen) {
      onClose()
    }
  }, [modal.isOpen, onClose])

  useLayoutEffect(() => {
    if (!modal.isOpen) return
    if (!dialogContentRef.current) return
    const focusable = dialogContentRef.current.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable && document.activeElement !== focusable) {
      focusable.focus()
    }
  }, [modal.isOpen])

  // Trocar de anexo LIMPA o outro. É o que mantém o estado representável no
  // banco: `photo_path` e `link_url` não coexistem sob as CHECKs de
  // `public.posts`, e um campo escondido mas preenchido publicaria um anexo que
  // ninguém vê.
  const selectAttachment = useCallback(
    (next: PostAttachment) => {
      const chosen = attachment === next ? null : next
      if (chosen !== "photo") setPhotoPath("")
      if (chosen !== "link") setLinkUrl("")
      setAttachment(chosen)
    },
    [attachment],
  )

  // O ANEXO DERIVA O FORMATO. O objeto que monta o `post_type` e as colunas
  // extras mora em `lib/composer/post-attachment`, junto com a trava do anexo
  // ligado-e-vazio: derivar o tipo num lugar e montar as extras noutro é
  // exatamente como uma coluna extra entra sem o tipo que a CHECK exige.
  // Anexo ligado e vazio cai no ramo `text` — quem impede que isso publique em
  // silêncio é `attachmentPublishBlocker`, no handleSubmit.
  const derived = useMemo(
    () => derivePostType(attachment, photoPath, linkUrl),
    [attachment, photoPath, linkUrl],
  )

  // Autosave do rascunho — melhor esforço, nunca quebra a tela. Campos todos
  // vazios removem o rascunho (a pessoa esvaziou de propósito); publicar ou
  // descartar confirmado são os outros dois caminhos de limpeza.
  const persistDraft = useCallback((fields: PostDraftFields) => {
    if (hasDraftContent({ ...fields, savedAt: 0 })) {
      setStorageUnavailable(!savePostDraftFields(fields))
    } else {
      clearPostDraft()
      setStorageUnavailable(false)
    }
  }, [])

  const draftFields = useMemo<PostDraftFields>(
    () => ({ content, details, linkUrl, photoPath }),
    [content, details, linkUrl, photoPath],
  )

  useEffect(() => {
    const timer = setTimeout(() => persistDraft(draftFields), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draftFields, persistDraft])

  // O debounce acima é cancelado quando o modal fecha antes do timer — sem
  // este flush, a última coisa digitada antes de fechar se perderia, que é
  // exatamente o caso que o rascunho existe para cobrir.
  const latestFields = useRef(draftFields)
  latestFields.current = draftFields
  useEffect(() => () => persistDraft(latestFields.current), [persistDraft])

  const resetForm = useCallback(() => {
    setAttachment(null)
    setContent("")
    setDetails("")
    setPhotoPath("")
    setLinkUrl("")
    setError("")
    setErrorKind(null)
    setPhotoError("")
    setPiiWarning(false)
    setDraftRestored(false)
    // PRIVACY (Step 3 da onda E; vila → grupo no lote 5 N2): a audiência NÃO é
    // tocada. Zerar o destino no fim do envio fazia a publicação seguinte sair
    // para um público que a pessoa não tinha escolhido — o vazamento por
    // desatenção que a onda E fechou. Aqui o destino só muda quando a própria
    // pessoa o escolhe no seletor.
  }, [])

  const handleSubmit = useCallback(async () => {
    setError("")
    setErrorKind(null)
    setPhotoError("")

    if (!content.trim()) {
      setError("A publicação precisa de texto.")
      return
    }
    // Sem grupo não há publicação (ADR-20261023; o banco recusa na policy de
    // insert). O caminho existe aqui porque Enter/atalho não passam pelo botão
    // desabilitado — e a mensagem diz o que fazer, em vez de falhar no servidor.
    if (!selectedGroup) {
      setError("Escolha um grupo para publicar.")
      return
    }
    // O anexo escolhido e o anexo publicado têm de ser o mesmo. Sem esta
    // trava, quem liga "Foto", escolhe o arquivo e publica ENQUANTO o envio
    // acontece (ou quem abre o seletor e não escolhe nada) viajaria como
    // pergunta de TEXTO: o `derived` estaria certo, mas a pessoa perderia uma
    // ação que ela tomou, sem aviso. Não é validação de formato — é não deixar
    // anexo visível virar anexo nenhum em silêncio.
    const blocked = attachmentPublishBlocker(attachment, photoPath, linkUrl)
    if (blocked) {
      setError(blocked)
      return
    }

    const composed = composePostContent(content, details)
    if (!piiWarning && (detectCpf(composed) || detectCep(composed))) {
      setPiiWarning(true)
      return
    }

    setSubmitting(true)

    // O destino sai do grupo RESOLVIDO na lista (ver `selectedGroup`):
    // `community_id` não é mais usado para publicar, e a publicação tem sempre
    // `group_id` — o banco exige.
    const insertData = {
      locality_id: localityId,
      post_type: derived.postType,
      content: composed,
      community_id: null,
      group_id: selectedGroup.id,
    } as const

    // Tipo e extras saem do MESMO objeto `derived`: a coluna extra nunca entra
    // sem o `post_type` que a CHECK correspondente exige.
    const { error: insertError } = await supabase.from("posts").insert({
      ...insertData,
      ...derived.extras,
    } as Database["public"]["Tables"]["posts"]["Insert"])

    if (insertError) {
      // Anti-enumeração: 42501 (RLS), 23505 (unique) e qualquer outra
      // resposta do PostgREST compartilham a mesma mensagem. O `kind`
      // discrimina o que fazer (mostrar feedback inline vs. pedir para
      // checar a conexão); o texto nunca revela o motivo do servidor.
      const view = classifyPublishError(insertError)
      setErrorKind(view.kind)
      setError(view.message)
      // `preserveDraft` é sobre o conteúdo (não limpamos; o rascunho no
      // navegador também sobrevive); o botão volta a ficar clicável para a
      // pessoa corrigir e tentar de novo — manter `submitting` trancaria o
      // caminho de recuperação.
      setSubmitting(false)
      return
    }

    // Publicado: o rascunho cumpriu o papel dele e sai do navegador só agora,
    // pela ação concluída da pessoa — nunca antes, nunca sozinho.
    clearPostDraft()
    resetForm()
    showToast({
      title: "Publicado no seu grupo",
      description: "Os aprovados deste grupo podem ler agora.",
      variant: "success",
    })
    onCreated()
    modal.close()
    setSubmitting(false)
  }, [
    content,
    details,
    derived,
    attachment,
    photoPath,
    linkUrl,
    piiWarning,
    selectedGroup,
    localityId,
    supabase,
    resetForm,
    onCreated,
    modal,
  ])

  const discardConfirm = useOverlayState()

  const discardDraft = useCallback(() => {
    clearPostDraft()
    setAttachment(null)
    setContent("")
    setDetails("")
    setLinkUrl("")
    setPhotoPath("")
    setDraftRestored(false)
    setStorageUnavailable(false)
    discardConfirm.close()
  }, [discardConfirm])

  // Nome do lugar de visibilidade: o grupo escolhido. Sem escolha, a prévia e o
  // aviso dizem que falta escolher, e não descrevem um público que não existe.
  const placeName = selected ? selected.name : null

  const audienceNotice = selected
    ? audienceNoticeText(selected.kind, null)
    : "Escolha um grupo para publicar."

  return (
    <>
      <Modal state={modal}>
        <Modal.Backdrop>
          {/* O compositor é de duas colunas (formulário + "Como sua publicação
              será vista"), como a prancha 45 desenha. O prefixo `lg:` do grid
              responde à LARGURA DA JANELA, não à do diálogo: num monitor de
              1440px o `size="lg"` (512px) abria as duas colunas e sobravam 120px
              para o formulário — medido no navegador em 16/09/2026 (coluna do
              formulário e alerta de erro em 120px de largura). A largura do
              diálogo acompanha o conteúdo. */}
          <Modal.Container size="lg">
            <Modal.Dialog className="max-w-4xl">
              <Modal.Header>
                <Modal.Heading>Criar publicação</Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div ref={dialogContentRef}>
                    <DraftNotices
                      draftRestored={draftRestored}
                      storageUnavailable={storageUnavailable}
                      onRequestDiscard={discardConfirm.open}
                    />

                    {/* A PERGUNTA VEM PRIMEIRO — é a ordem que o cabeçalho deste
                        arquivo declara ("a PERGUNTA primeiro, depois destino
                        real") e que o código não cumpria: o seletor de público
                        renderizava ANTES do campo da pergunta. Ordem medida em
                        19/09/2026 no `dono-vila`: o primeiro campo da tela era o
                        grupo "Quem pode ver?" com "Toda a cidade · Manaus" e
                        "Vila Ajuricaba", e só depois vinha "Pergunta *". O
                        commit 0023e0d tirou o seletor de FORMATO da frente do
                        conteúdo e escreveu essa frase no cabeçalho, mas o
                        seletor de PÚBLICO continuou na frente.
                        Destino é decisão SOBRE a pergunta — quem vai ler o que
                        já foi escrito —, não um passo que a antecede. É a mesma
                        classe que a prancha 45 painel 2 desenha ao contrário,
                        com a pergunta abrindo o formulário e categoria/alcance
                        descendo para depois dela. */}
                    <div className="mt-4">
                      <label htmlFor="post-conteudo" className="mb-1 block text-sm font-medium">
                        Pergunta <span aria-hidden="true">*</span>
                        <span className="sr-only"> (obrigatório)</span>
                      </label>
                      <TextArea
                        id="post-conteudo"
                        aria-label="Pergunta"
                        required
                        aria-required="true"
                        placeholder="O que você quer perguntar?"
                        value={content}
                        onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
                      />
                    </div>

                    <div className="mt-4">
                      <AudiencePicker
                        value={audienceKey}
                        onChange={setAudienceKey}
                        destinations={destinations}
                        loading={audience.loading}
                        error={audience.error}
                        onRetry={audience.retry}
                      />
                      {/* Sem grupo nenhum, o caminho é entrar em um — não um
                          destino inventado. O aviso repete o que o seletor não
                          tem para mostrar. */}
                      {!audience.loading && !audience.error && !hasGroups ? (
                        <div className="mt-2">
                          <FeedbackAlert
                            variant="info"
                            title="Você ainda não participa de um grupo"
                            description="Publicar acontece dentro de um grupo. Veja os grupos da sua cidade e entre em um para publicar."
                            actions={
                              <Link
                                href={"/groups" as Route}
                                className="inline-flex min-h-11 items-center text-sm font-semibold text-ui-brand"
                              >
                                Ver grupos
                              </Link>
                            }
                          />
                        </div>
                      ) : null}
                      <p
                        aria-live="polite"
                        className="mt-2 text-xs text-muted"
                        data-testid="audience-notice"
                      >
                        {audienceNotice}
                      </p>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="post-detalhes" className="mb-1 block text-sm font-medium">
                        Detalhes (opcional)
                      </label>
                      <TextArea
                        id="post-detalhes"
                        aria-label="Detalhes"
                        placeholder="Conte mais sobre sua publicação, se quiser"
                        value={details}
                        onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
                      />
                    </div>

                    {/* Anexo é opção SOBRE a pergunta, nunca passo anterior: vem DEPOIS do texto,
                        começa vazio (nenhum anexo é o default) e não decide o formato
                        sozinho — quem decide é o anexo real, em `derived`. O
                        `min-w-0` neutraliza o `min-inline-size: min-content` padrão do
                        fieldset, que estouraria a coluna do formulário em 375px. */}
                    <fieldset className="mt-4 min-w-0">
                      <legend className="mb-1 block text-sm font-medium">
                        Anexar à pergunta (opcional)
                      </legend>
                      <p className="mb-2 text-xs text-muted">
                        Uma pergunta pode levar uma foto ou um link.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={attachment === "photo" ? "primary" : "tertiary"}
                          aria-pressed={attachment === "photo"}
                          onPress={() => selectAttachment("photo")}
                          className="min-h-11"
                        >
                          <ImagePlus size={16} aria-hidden="true" />
                          Foto
                        </Button>
                        <Button
                          size="sm"
                          variant={attachment === "link" ? "primary" : "tertiary"}
                          aria-pressed={attachment === "link"}
                          onPress={() => selectAttachment("link")}
                          className="min-h-11"
                        >
                          <Link2 size={16} aria-hidden="true" />
                          Link
                        </Button>
                      </div>

                      {attachment === "photo" ? (
                        <div className="mt-3">
                          <PhotoField
                            value={photoPath}
                            onChange={setPhotoPath}
                            onError={setPhotoError}
                          />
                          {photoError ? (
                            <p
                              aria-live="polite"
                              className="mt-1 text-xs text-[var(--semantic-danger)]"
                            >
                              {photoError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {attachment === "link" ? (
                        <Input
                          aria-label="URL"
                          placeholder="URL (https://...)"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
                          className="mt-3"
                        />
                      ) : null}
                    </fieldset>

                    {error ? (
                      <div className="mt-4" data-testid="publish-error">
                        {/* Prancha 60, painel direito: falha de TRANSPORTE é o
                            estado "Sem conexão" — a ação nunca chegou ao servidor,
                            então a retomada é real (republicar) e o rascunho fica.
                            Rejeição do servidor segue no alerta genérico, que é o
                            anti-enumeração do lib/composer/publish-error. */}
                        {errorKind === "network" ? (
                          <ConnectionLostState
                            description={error}
                            onRetry={() => {
                              void handleSubmit()
                            }}
                          />
                        ) : (
                          <FeedbackAlert variant="danger" description={error} />
                        )}
                      </div>
                    ) : null}
                    {piiWarning ? (
                      <PostPiiWarning
                        onConfirm={handleSubmit}
                        onCancel={() => setPiiWarning(false)}
                      />
                    ) : null}

                    {/* O aviso de alcance FECHA o formulário; a ação que ele
                        descreve mora na barra de ações do rodapé, fora da área
                        que rola. O porquê está medido no comentário do rodapé. */}
                    <p className="mt-4 text-xs text-[var(--semantic-action-primary)]">
                      {placeName
                        ? `Visível para membros do Bivaque em ${placeName}.`
                        : "Escolha quem pode ver."}
                    </p>
                  </div>

                  <div className="hidden lg:block">
                    <PostPreview
                      destination={selected}
                      destinationLoading={audience.loading}
                      authorName={currentUser.user?.displayName ?? null}
                      authorLoading={currentUser.loading}
                      content={composePostContent(content, details)}
                      placeName={placeName}
                    />
                  </div>
                </div>
              </Modal.Body>
              {/* A AÇÃO PRIMÁRIA VIVE NA BARRA DE AÇÕES, NÃO NO FIM DO
                  CONTEÚDO. `Modal.Body` é `overflow-y-auto` num diálogo com
                  `max-h-full`: com o primário como último filho do corpo, o
                  centro dele cai FORA da caixa visível do corpo e o
                  `document.elementFromPoint` do centro resolve para o que está
                  pintado ali — medido em 19/09/2026 no `dono-vila`: a 375x568 o
                  centro caía sobre o "Cancelar" (`button--tertiary`) do rodapé
                  em `scrollTop` 123..184, e a 1440 o `modal__dialog--scroll-inside`
                  recortava o botão. Rolagem interna exigida só para ALCANÇAR o
                  primário: 204 px a 375x568 e 105 px a 375x667 (diferença entre o
                  pé do botão e o pé do corpo), e a 375x812 — a altura do projeto
                  e2e — o defeito não aparecia, que é como ele passou dois ciclos.
                  Com a barra de ações fora da área que rola, o primário está
                  sempre inteiro na tela e o hit-test do centro resolve para ele
                  nos cinco tamanhos medidos, sem rolagem nenhuma. */}
              <Modal.Footer>
                <Button variant="tertiary" onPress={modal.close} isDisabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  onPress={handleSubmit}
                  isDisabled={submitting || !content.trim() || !selectedGroup}
                  variant="primary"
                  aria-busy={submitting}
                  data-testid="publish-submit"
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" aria-label="Publicando" />
                      Publicando…
                    </>
                  ) : (
                    "Publicar"
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <DraftDiscardDialog
        open={discardConfirm.isOpen}
        onOpenChange={discardConfirm.setOpen}
        onDiscard={discardDraft}
      />
    </>
  )
}
