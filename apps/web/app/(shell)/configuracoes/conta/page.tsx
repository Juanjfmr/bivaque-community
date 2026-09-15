"use client"

import { Button, Input, Link, Modal, useOverlayState } from "@heroui/react"
import { ChevronRight, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../components/bivaque/skeleton"

// Prancha 52, painel "Conta e privacidade": dados de acesso, recuperação e a
// saída. O método de acesso é o do ADR-20260907-login-com-senha: e-mail e
// senha. Alterar e-mail é o fluxo real do Auth (confirmação nos dois
// endereços); a troca de senha usa a recuperação existente. A exclusão NÃO é
// prometida como imediata: não existe job de exclusão aprovado, então a tela
// informa a política real e aponta o canal — nada de botão que apaga a conta
// pelo cliente.

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

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setEmail(user?.email ?? null)
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

  if (loading) {
    return (
      <div role="status" aria-label="Carregando conta" className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
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
        <h3 className="text-sm font-medium text-[var(--danger)]">Excluir conta</h3>
        <p className="mt-1 text-sm text-muted">
          Não existe exclusão automática por esta tela. O pedido segue a Política de Privacidade,
          que descreve o que é apagado, o que precisa ser mantido e em quanto tempo. Nada é apagado
          por este botão.
        </p>
        <Button
          type="button"
          variant="tertiary"
          className="mt-2 min-h-11"
          onPress={deleteModal.open}
        >
          Sobre a exclusão de conta
        </Button>
      </div>

      <Modal state={signOutModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Sair da sua conta?</Modal.Heading>
                <Modal.CloseTrigger />
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
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Excluir conta</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  A exclusão é permanente e não pode ser desfeita. Enquanto não houver um job de
                  exclusão aprovado, o pedido é feito pelo canal indicado na Política de Privacidade
                  — o prazo e o que é mantido por obrigação legal estão lá, não nesta tela.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={deleteModal.close}>
                  Fechar
                </Button>
                <Link
                  href="/privacidade"
                  className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-primary)] px-4 text-sm font-medium text-white"
                >
                  Abrir Política de Privacidade
                </Link>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </section>
  )
}
