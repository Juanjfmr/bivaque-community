"use client"

import { Button, Checkbox, Input, Link, Modal, useOverlayState } from "@heroui/react"
import { ChevronRight, LogOut, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../components/bivaque/skeleton"

// Prancha 52, painel "Conta e privacidade": dados de acesso, recuperação, a
// saída e a exclusão. O método de acesso é o do ADR-20260907-login-com-senha:
// e-mail e senha. Alterar e-mail é o fluxo real do Auth (confirmação nos dois
// endereços); a troca de senha usa a recuperação existente.
//
// A exclusão é a do ADR-20260914-exclusao-de-conta (RECON-052): o titular pede
// em request_account_deletion(), a conta fica indisponível na hora e a purga
// acontece no prazo da tabela jurídica aprovada. O aviso desta tela declara
// exatamente o que sai, o que fica e por quê — nenhum prazo fora daquela tabela
// aparece aqui, e nada de "apagamos tudo na hora".

export default function ConfiguracoesContaPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const signOutModal = useOverlayState()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")

  const deleteModal = useOverlayState()
  const [deletionPending, setDeletionPending] = useState(false)
  const [deletionDueAt, setDeletionDueAt] = useState<string | null>(null)
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setEmail(user?.email ?? null)

    // Estado do próprio pedido, sem parâmetro: a função não aceita perguntar
    // por outra pessoa. Serve para a tela não oferecer "Excluir conta" a quem
    // já pediu — inclusive quando a resposta do pedido se perdeu no caminho.
    const { data: pending } = await supabase.rpc("is_account_deletion_pending")
    setDeletionPending(pending === true)

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const handleEmailChange = async () => {
    const target = newEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setEmailFeedback({ type: "error", message: "Informe um e-mail válido." })
      return
    }
    setEmailBusy(true)
    setEmailFeedback(null)
    const { error } = await supabase.auth.updateUser({ email: target })
    if (error) {
      setEmailFeedback({
        type: "error",
        message:
          error.message.toLowerCase().includes("reauth") ||
          error.message.toLowerCase().includes("recent")
            ? "Confirme o acesso antes de alterar o e-mail e tente de novo."
            : "Não foi possível iniciar a troca de e-mail. Tente novamente.",
      })
    } else {
      setEmailFeedback({
        type: "success",
        message: "Enviamos uma confirmação para o endereço atual e para o novo.",
      })
      setEditingEmail(false)
      setNewEmail("")
    }
    setEmailBusy(false)
  }

  const handleConfirmSignOut = async () => {
    setSigningOut(true)
    setSignOutError("")
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSigningOut(false)
      setSignOutError(error.message)
      return
    }
    // Sair limpa a sessão, o cache privado local e as assinaturas da sessão
    // anterior. `replace` impede que o histórico volte à tela autenticada; se
    // voltar, o middleware redireciona para o login porque a sessão sumiu.
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      // Armazenamento indisponível não impede a saída.
    }
    setSigningOut(false)
    signOutModal.close()
    router.replace("/login")
    router.refresh()
  }

  const handleRequestDeletion = async () => {
    setDeleting(true)
    setDeleteError("")

    const { data, error } = await supabase.rpc("request_account_deletion")
    if (error) {
      setDeleting(false)
      setDeleteError(
        "Não foi possível registrar o pedido agora. Tente novamente em instantes; se persistir, use o canal em Ajuda.",
      )
      return
    }

    const dueAt = (data as { due_at?: string } | null)?.due_at ?? null

    // A sessão já foi apagada no servidor pelo próprio pedido — sair aqui
    // limpa cookies e cache locais, não é o que revoga o acesso.
    try {
      await supabase.auth.signOut()
    } catch {
      // sessão já revogada: nada a fazer
    }
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      // armazenamento indisponível não desfaz o pedido
    }

    setDeleting(false)
    setDeletionDueAt(dueAt)
    setDeletionPending(true)
    deleteModal.close()
  }

  // Saída depois do pedido: a sessão já está revogada no servidor, então o
  // signOut do cliente pode falhar — e falhar aqui não pode prender a pessoa
  // numa tela de conta que ela acabou de pedir para excluir. Por isso este
  // caminho limpa o que dá e SEMPRE volta para o login.
  const handleLeaveAfterDeletion = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } catch {
      // sessão já revogada: nada a fazer
    }
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      // armazenamento indisponível não impede a saída
    }
    setSigningOut(false)
    router.replace("/login")
    router.refresh()
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando conta" className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (deletionPending) {
    const deadline = deletionDueAt
      ? new Date(deletionDueAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null

    return (
      <section aria-labelledby="conta-heading" className="space-y-4">
        <div>
          <h2 id="conta-heading" className="text-lg font-semibold tracking-tight">
            Conta e privacidade
          </h2>
        </div>

        <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <h3 className="text-sm font-medium">Exclusão solicitada</h3>
          <p className="mt-1 text-sm text-muted">
            Sua conta está indisponível: a sessão foi encerrada e não é mais possível entrar com
            ela. Até{" "}
            {deadline ? `${deadline} (15 dias contados do pedido)` : "15 dias contados do pedido"},
            a conta, o perfil, as fotos de perfil e as preferências são apagados.
          </p>
          <p className="mt-2 text-sm text-muted">
            Permanecem os registros de moderação — com seus dados anonimizados — e os logs de
            acesso, guardados por 6 meses por obrigação legal (MCI, art. 15).
          </p>
          <Button
            type="button"
            variant="tertiary"
            className="mt-3 min-h-11"
            onPress={handleLeaveAfterDeletion}
            isDisabled={signingOut}
          >
            {signingOut ? "Saindo..." : "Sair desta tela"}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="conta-heading" className="space-y-4">
      <div>
        <h2 id="conta-heading" className="text-lg font-semibold tracking-tight">
          Conta e privacidade
        </h2>
        <p className="mt-1 text-sm text-muted">
          Gerencie os dados da sua conta e suas preferências de segurança.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-[var(--surface)]">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">E-mail</p>
              {email ? (
                <p className="mt-0.5 text-sm break-words">{email}</p>
              ) : (
                <p className="mt-0.5 text-sm text-muted">Nenhum e-mail vinculado a esta conta.</p>
              )}
            </div>
            {email && !editingEmail && (
              <Button
                type="button"
                variant="tertiary"
                className="min-h-11 shrink-0"
                onPress={() => {
                  setEditingEmail(true)
                  setEmailFeedback(null)
                }}
              >
                Editar
              </Button>
            )}
          </div>

          {editingEmail && (
            <div className="mt-3 space-y-2">
              <label className="block text-sm font-medium" htmlFor="new-email">
                Novo e-mail
              </label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail((event.target as HTMLInputElement).value)}
              />
              <p className="text-xs text-muted">
                A troca exige confirmar o acesso e é concluída pelo link enviado aos dois endereços.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-11"
                  isDisabled={emailBusy}
                  onPress={handleEmailChange}
                >
                  {emailBusy ? "Enviando…" : "Confirmar troca"}
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  className="min-h-11"
                  onPress={() => {
                    setEditingEmail(false)
                    setNewEmail("")
                    setEmailFeedback(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {emailFeedback && (
            <div className="mt-3">
              <FeedbackAlert
                variant={emailFeedback.type === "success" ? "success" : "danger"}
                description={emailFeedback.message}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium">Senha</span>
            <span className="block text-sm text-muted">
              A troca é feita por e-mail de recuperação.
            </span>
          </span>
          <Link
            href="/recuperar-senha"
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-[var(--surface-sunken)]"
          >
            Alterar
          </Link>
        </div>

        <Link
          href="/recuperar-senha"
          className="flex min-h-11 items-center justify-between gap-4 border-b border-border px-4 py-3 hover:bg-[var(--surface-sunken)]"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">Ajuda com acesso</span>
            <span className="block text-sm text-muted">
              Recupere sua conta caso não consiga acessar.
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        </Link>

        <Link
          href="/configuracoes/familia"
          className="flex min-h-11 items-center justify-between gap-4 border-b border-border px-4 py-3 hover:bg-[var(--surface-sunken)]"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">Família</span>
            <span className="block text-sm text-muted">
              Convide familiares e acompanhe os convites pendentes.
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        </Link>

        <Link
          href="/configuracoes/bloqueados"
          className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--surface-sunken)]"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">Pessoas bloqueadas</span>
            <span className="block text-sm text-muted">
              Veja e gerencie pessoas que você bloqueou.
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        </Link>
      </div>

      <button
        type="button"
        onClick={signOutModal.open}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border bg-[var(--surface)] px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)]"
      >
        <LogOut aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--danger)]" />
        <span>Sair da conta</span>
      </button>

      <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
        <button
          type="button"
          onClick={deleteModal.open}
          className="flex min-h-11 w-full items-center gap-3 text-left text-sm font-medium text-[var(--danger)] transition-colors hover:text-[var(--danger)]"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>Excluir conta</span>
        </button>
        <p className="mt-1 text-xs text-muted">
          A exclusão é permanente e não pode ser desfeita. O que sai e o que permanece está no aviso
          antes de confirmar.
        </p>
      </div>

      <Modal state={signOutModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Sair da sua conta?</Modal.Heading>
                <Modal.CloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Você precisará entrar novamente para acessar sua conta.
                </p>
                {signOutError && (
                  <div className="mt-2">
                    <FeedbackAlert variant="danger" description={signOutError} />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={signOutModal.close}>
                  Cancelar
                </Button>
                <Button variant="primary" onPress={handleConfirmSignOut} isDisabled={signingOut}>
                  {signingOut ? "Saindo..." : "Sair"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={deleteModal}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Solicitar exclusão da conta?</Modal.Heading>
                <Modal.CloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm font-medium">
                  A exclusão é permanente e não pode ser desfeita.
                </p>

                <p className="mt-3 text-sm text-muted">Ao confirmar, agora:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                  <li>sua sessão é encerrada e você não consegue mais entrar nesta conta;</li>
                  <li>seu perfil deixa de aparecer para outras pessoas;</li>
                  <li>o que você publicou continua visível, atribuído ao seu nome de exibição.</li>
                </ul>

                <p className="mt-3 text-sm text-muted">Em até 15 dias, contados do pedido:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                  <li>apagamos a conta, as credenciais, o perfil e suas fotos de perfil;</li>
                  <li>apagamos suas preferências e seus vínculos de participação;</li>
                  <li>
                    os convites familiares pendentes são encerrados; a outra conta fica intacta.
                  </li>
                </ul>

                <p className="mt-3 text-sm text-muted">O que permanece, e por quê:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                  <li>
                    registros de moderação (denúncias e decisões), com seus dados anonimizados —
                    sustentam a segurança de outras pessoas;
                  </li>
                  <li>logs de acesso, guardados por 6 meses por obrigação legal (MCI, art. 15).</li>
                </ul>

                <p className="mt-3 text-sm text-muted">
                  Para exercer seus direitos depois disso, use o canal em{" "}
                  <Link href="/ajuda" className="underline">
                    Ajuda
                  </Link>
                  . A resposta sai em até 15 dias.
                </p>

                <div className="mt-3">
                  <Checkbox
                    isSelected={deletionConfirmed}
                    onChange={setDeletionConfirmed}
                    isDisabled={deleting}
                    aria-label="Entendi que a exclusão da conta é permanente e não pode ser desfeita"
                    className="[&_input]:min-h-11 [&_input]:min-w-11"
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-sm">
                        Entendi que a exclusão é permanente e não pode ser desfeita.
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>

                {deleteError && (
                  <div className="mt-3">
                    <FeedbackAlert variant="danger" description={deleteError} />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={deleteModal.close} isDisabled={deleting}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onPress={handleRequestDeletion}
                  isDisabled={!deletionConfirmed || deleting}
                >
                  {deleting ? "Registrando..." : "Solicitar exclusão"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </section>
  )
}
