"use client"

import {
  Button,
  Link,
  Modal,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  useOverlayState,
} from "@heroui/react"
import { Bell, ChevronRight, Lock, ShieldCheck, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { PageHeader } from "../../components/bivaque/page-header"
import { Skeleton } from "../../components/bivaque/skeleton"
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "../profile/notification-preferences-actions"

// Prancha 52: a tela de configurações sobre os contratos que já existem.
// O mecanismo de preferência de notificação NÃO é reescrito aqui — as duas
// actions importadas de /profile são as donas da leitura e da gravação em
// `public.notification_preferences`. A tabela só tem escolha real para
// respostas (comments) e eventos (events): "novidades" e a matriz de canais
// da prancha não têm coluna nem serviço por trás, então não viram controle
// decorativo (G1: nenhum controle sem efeito real).
// Sessão e e-mail vêm do Auth real; sem dado, estado vazio honesto. Nenhum
// prazo de exclusão é afirmado na tela: o que acontece e o que a pessoa
// precisa fazer está descrito na Política de Privacidade, para onde a tela
// aponta. O método de acesso exibido é o do ADR-20260907-login-com-senha:
// e-mail e senha, com recuperação por e-mail.

type NotificationPrefs = {
  comments: boolean
  events: boolean
}

// Sem linha gravada, o estado inicial é o default da coluna no banco
// (migration 20260806165606): as duas escolhas ligadas.
const DEFAULT_PREFS: NotificationPrefs = { comments: true, events: true }

type SectionKey = "notificacoes" | "conta" | "privacidade"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [section, setSection] = useState<SectionKey>("notificacoes")
  const [email, setEmail] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const signOutModal = useOverlayState()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setError("Sua sessão expirou. Entre novamente para continuar.")
      setLoading(false)
      return
    }

    setEmail(user.email ?? null)

    // A leitura da preferência é consulta real: falha vira erro recuperável
    // com nova tentativa, nunca formulário vazio sobre uma consulta que não
    // aconteceu.
    try {
      const stored = await getNotificationPreferencesAction()
      if (stored) setPrefs(stored)
    } catch {
      setError("Não foi possível carregar suas preferências. Tente novamente.")
      setLoading(false)
      return
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleSavePrefs = async () => {
    setSaving(true)
    setSaveFeedback(null)

    // Mesma forma que a action de /profile já espera: chave presente com
    // "on" quando ligado, ausente quando desligado.
    const form = new FormData()
    if (prefs.comments) form.append("comments", "on")
    if (prefs.events) form.append("events", "on")

    try {
      await updateNotificationPreferencesAction(form)
      setSaveFeedback({ type: "success", message: "Preferências salvas com sucesso." })
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível salvar suas preferências. Tente novamente.",
      })
    }
    setSaving(false)
  }

  const handleConfirmSignOut = async () => {
    setSigningOut(true)
    setSignOutError("")
    const { error: signOutError } = await supabase.auth.signOut()
    setSigningOut(false)
    if (signOutError) {
      setSignOutError(signOutError.message)
      return
    }
    signOutModal.close()
    router.push("/login")
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando configurações"
        className="mx-auto w-full max-w-2xl px-4 py-4"
      >
        <Skeleton className="h-6 w-40" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="space-y-4 rounded-xl border border-border bg-[var(--surface)] p-6">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-12">
        <ErrorState message={error} onRetry={loadAll} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <PageHeader title="Configurações" />

      <Tabs
        aria-label="Seções de configurações"
        className="mt-6"
        selectedKey={section}
        onSelectionChange={(key) => {
          if (key === "notificacoes" || key === "conta" || key === "privacidade") {
            setSection(key)
          }
        }}
      >
        <TabList
          aria-label="Seções"
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-[var(--surface)] p-2"
        >
          <Tab
            id="notificacoes"
            className="min-h-11 flex-1 gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap"
          >
            <Bell aria-hidden="true" className="h-4 w-4 shrink-0" />
            Notificações
          </Tab>
          <Tab
            id="conta"
            className="min-h-11 flex-1 gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap"
          >
            <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
            Conta
          </Tab>
          <Tab
            id="privacidade"
            className="min-h-11 flex-1 gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap"
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
            Privacidade
          </Tab>
        </TabList>

        <TabPanel id="notificacoes" className="pt-4">
          <section aria-labelledby="notif-heading" className="space-y-4">
            <div>
              <h2 id="notif-heading" className="text-lg font-semibold tracking-tight">
                Notificações
              </h2>
              <p className="mt-1 text-sm text-muted">
                Escolha sobre o que você deseja ser avisado.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-[var(--surface)]">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-medium">Tipos de notificação</h3>
              </div>
              <ul className="divide-y divide-border">
                <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Respostas</span>
                    <span className="block text-sm text-muted">
                      Quando alguém responde às suas publicações ou comentários.
                    </span>
                  </span>
                  <Switch
                    aria-label="Notificações de respostas"
                    isSelected={prefs.comments}
                    onChange={(isSelected) => {
                      setPrefs((prev) => ({ ...prev, comments: isSelected }))
                      setSaveFeedback(null)
                    }}
                  >
                    <Switch.Content className="gap-0">
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </li>
                <li className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Eventos</span>
                    <span className="block text-sm text-muted">
                      Lembretes e atualizações sobre eventos das comunidades.
                    </span>
                  </span>
                  <Switch
                    aria-label="Notificações de eventos"
                    isSelected={prefs.events}
                    onChange={(isSelected) => {
                      setPrefs((prev) => ({ ...prev, events: isSelected }))
                      setSaveFeedback(null)
                    }}
                  >
                    <Switch.Content className="gap-0">
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </li>
              </ul>
              <p className="px-4 py-3 text-sm text-muted">
                Outros avisos, como novidades do Bivaque, ainda não podem ser escolhidos aqui.
              </p>
            </div>

            {saveFeedback && (
              <FeedbackAlert
                variant={saveFeedback.type === "success" ? "success" : "danger"}
                description={saveFeedback.message}
              />
            )}

            <Button
              type="button"
              variant="primary"
              onPress={handleSavePrefs}
              isDisabled={saving}
              className="w-fit min-h-11"
            >
              {saving ? "Salvando…" : "Salvar preferências"}
            </Button>
          </section>
        </TabPanel>

        <TabPanel id="conta" className="pt-4">
          <section aria-labelledby="conta-heading" className="space-y-4">
            <div>
              <h2 id="conta-heading" className="text-lg font-semibold tracking-tight">
                Conta e acesso
              </h2>
              <p className="mt-1 text-sm text-muted">
                Você entra com e-mail e senha. Aqui ficam os dados e as saídas da sua conta.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-[var(--surface)]">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium">E-mail</p>
                {email ? (
                  <p className="mt-0.5 text-sm break-words">{email}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted">Nenhum e-mail vinculado a esta conta.</p>
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

              <div className="px-4 py-3">
                <h3 className="text-sm font-medium text-[var(--danger)]">Excluir conta</h3>
                <p className="mt-1 text-sm text-muted">
                  A exclusão não acontece nesta tela: não há botão que apague a conta por aqui. Para
                  pedir a exclusão, envie um pedido pelo canal de contato indicado na Política de
                  Privacidade. O que é apagado, o que precisa ser mantido e sob qual condição está
                  escrito na própria política.
                </p>
                <Link
                  href="/privacidade"
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline"
                >
                  Abrir Política de Privacidade
                </Link>
              </div>
            </div>

            <Button
              type="button"
              variant="danger"
              onPress={signOutModal.open}
              className="w-full min-h-11"
            >
              Sair da conta
            </Button>
          </section>
        </TabPanel>

        <TabPanel id="privacidade" className="pt-4">
          <section aria-labelledby="priv-heading" className="space-y-4">
            <div>
              <h2 id="priv-heading" className="text-lg font-semibold tracking-tight">
                Privacidade
              </h2>
              <p className="mt-1 text-sm text-muted">
                O que outros membros veem de você e onde você controla isso.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <h3 className="text-sm font-medium">O que outros membros veem</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                <li>Seu nome e sua foto nas comunidades e conversas que você frequenta.</li>
                <li>O conteúdo que você publica onde tem acesso.</li>
                <li>
                  Força Armada e OM somente se você ligar &quot;Exibir no perfil&quot; para cada
                  uma. Por padrão, nenhuma das duas aparece.
                </li>
                <li>
                  Seus dados de verificação (CPF e documentos) não aparecem no perfil nem são
                  exibidos a outros membros.
                </li>
              </ul>
              <Link
                href="/profile"
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium underline"
              >
                <User aria-hidden="true" className="h-4 w-4" />
                Gerenciar o que aparece no seu perfil
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <h3 className="text-sm font-medium">Pessoas bloqueadas</h3>
              <p className="mt-1 text-sm text-muted">
                Bloquear e desbloquear alguém é feito dentro de uma conversa: a pessoa bloqueada
                deixa de conseguir enviar mensagens para você.
              </p>
              <Link
                href="/messages"
                className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline"
              >
                Abrir conversas
              </Link>
            </div>

            <Link
              href="/privacidade"
              className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border bg-[var(--surface)] px-4 py-3 hover:bg-[var(--surface-sunken)]"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">Política de Privacidade</span>
                <span className="block text-sm text-muted">
                  Quais dados guardamos, por quanto tempo e como pedir exclusão.
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            </Link>
          </section>
        </TabPanel>
      </Tabs>

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
    </div>
  )
}
