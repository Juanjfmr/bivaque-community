import { createServerClient } from "@supabase/ssr"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { SUPPORT_EMAIL, SUPPORT_SLA_HOURS } from "../../../lib/support"
import { EntryShell } from "../../components/entry/entry-shell"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialIcon } from "../../components/material/material-icon"
import { MaterialTextButton } from "../../components/material/text-button"
import { HELP_TOPICS, TICKET_TOPICS } from "./help-topics"
import "./ajuda.css"

// PORT-006 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo item 7: a
// Ajuda funciona sem login.
//
// Antes ela morava em (shell)/ajuda, atrás do portão de sessão, e quem não
// conseguia entrar ficava sem onde ler as respostas. Agora a rota é pública
// (apps/web/proxy.ts) e mostra o conteúdo de `renderHelp` do protótipo.
//
// O que muda com sessão:
//   * "Meus chamados" — o registro do ADR-20261022-fundacao-dados
//     (public.support_tickets), lido do dono e só do dono;
//   * atalhos para as áreas do app, que não fazem sentido para quem está fora.
//
// O contato de quem está fora é o e-mail de suporte, como `renderContact`: sem
// conta não há chamado registrado, por decisão do dono (22/10/2026).
export const metadata: Metadata = {
  title: "Ajuda · Bivaque",
}

const ACCOUNT_LINKS = [
  { href: "/login", label: "Entrar" },
  { href: "/configuracoes", label: "Configurações" },
]

const USAGE_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/salvos", label: "Salvos" },
  { href: "/notifications", label: "Notificações" },
  { href: "/denuncias", label: "Minhas denúncias" },
]

const LEGAL_LINKS = [
  { href: "/privacidade", label: "Política de Privacidade" },
  { href: "/codigo-de-conduta", label: "Código de Conduta" },
]

type SessionUser = Readonly<{ email: string | null; id: string }>

type Ticket = Readonly<{
  answeredAt: string | null
  body: string
  createdAt: string
  id: string
  reply: string | null
  status: "open" | "answered"
  topic: string
}>

async function readSessionUser(): Promise<SessionUser | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) return null

  const cookieStore = await cookies()
  const auth = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // Leitura pura: a página não escreve sessão.
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await auth.auth.getUser()
  return user ? { email: user.email ?? null, id: user.id } : null
}

async function readTickets(userId: string): Promise<Ticket[] | null> {
  try {
    const supabase = createServiceClient()
    // O cliente de serviço não aplica RLS: o filtro por dono é explícito e usa
    // o id da SESSÃO, nunca um parâmetro de rota.
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, topic, body, status, reply, created_at, answered_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) return null
    return (data ?? []).map((row) => ({
      answeredAt: row.answered_at,
      body: row.body,
      createdAt: row.created_at,
      id: row.id,
      reply: row.reply,
      status: row.status,
      topic: String(row.topic),
    }))
  } catch {
    return null
  }
}

function topicLabel(topic: string): string {
  return TICKET_TOPICS.find(([value]) => value === topic)?.[1] ?? "Outro"
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function DestinationList({ links }: Readonly<{ links: Array<{ href: string; label: string }> }>) {
  return (
    <ul className="help-links">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href}>
            {link.label}
            <MaterialIcon name="chevron_right" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function AjudaPage() {
  const user = await readSessionUser()
  const tickets = user ? await readTickets(user.id) : []

  return (
    <EntryShell
      backHref={user ? "/inicio" : "/"}
      action={
        user ? (
          <MaterialTextButton href="/inicio">Início</MaterialTextButton>
        ) : (
          <MaterialTextButton href="/login">Entrar</MaterialTextButton>
        )
      }
    >
      <main>
        <div className="en en-form legal-doc">
          <h1 className="en-h1">Ajuda</h1>
          <p className="en-lead">
            Como funciona o Bivaque, o que você pode fazer com a sua conta e onde encontrar as
            regras.
          </p>

          {HELP_TOPICS.map((topic) => (
            <section key={topic.id} aria-labelledby={`ajuda-${topic.id}`} className="help-section">
              <h2 className="legal-h" id={`ajuda-${topic.id}`}>
                {topic.title}
              </h2>
              <p className="legal-p muted">{topic.subtitle}</p>
              <div className="help-list">
                {topic.questions.map(([question, answer]) => (
                  <details className="help-q" key={question}>
                    <summary>
                      <b>{question}</b>
                      <MaterialIcon name="expand_more" />
                    </summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div className="help-card" id="fale-com-a-gente">
            <b>Não achou?</b>
            <p>Respondemos por e-mail em até {SUPPORT_SLA_HOURS / 24} dias úteis.</p>
            <MaterialFilledButton href={`mailto:${SUPPORT_EMAIL}`}>
              Fale com a gente
            </MaterialFilledButton>
            <p className="help-note">
              O endereço é {SUPPORT_EMAIL}. É dele que chegam os avisos do Bivaque.
            </p>
          </div>

          {user ? (
            <>
              <section aria-labelledby="ajuda-chamados" className="help-section">
                <h2 className="legal-h" id="ajuda-chamados">
                  Meus chamados
                </h2>
                {tickets === null ? (
                  <p className="legal-p muted" role="status">
                    Não foi possível carregar seus chamados agora. Escreva para {SUPPORT_EMAIL}.
                  </p>
                ) : tickets.length === 0 ? (
                  <p className="legal-p muted">
                    Nenhum chamado ainda. Quando você escrever para a gente, o chamado aparece aqui
                    com o estado.
                  </p>
                ) : (
                  <div className="stack">
                    {tickets.map((ticket) => (
                      <article className="ticket" key={ticket.id}>
                        <div className="ticket-head">
                          <b>{topicLabel(ticket.topic)}</b>
                          <span
                            className="ticket-state"
                            data-status={ticket.status === "answered" ? "ok" : "open"}
                          >
                            <MaterialIcon
                              name={ticket.status === "answered" ? "check_circle" : "schedule"}
                            />
                            {ticket.status === "answered" ? "Respondido" : "Em andamento"}
                          </span>
                        </div>
                        <p className="legal-p muted">Enviado em {shortDate(ticket.createdAt)}</p>
                        <p className="ticket-text">{ticket.body}</p>
                        {ticket.status === "answered" && ticket.reply ? (
                          <p className="ticket-reply">
                            <b>
                              Resposta
                              {ticket.answeredAt ? ` · ${shortDate(ticket.answeredAt)}` : ""}
                            </b>
                            {ticket.reply}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section aria-labelledby="ajuda-atalhos" className="help-section">
                <h2 className="legal-h" id="ajuda-atalhos">
                  Atalhos
                </h2>
                <DestinationList links={ACCOUNT_LINKS} />
                <DestinationList links={USAGE_LINKS} />
                <DestinationList links={LEGAL_LINKS} />
              </section>
            </>
          ) : (
            <section aria-labelledby="ajuda-regras" className="help-section">
              <h2 className="legal-h" id="ajuda-regras">
                Documentos e regras
              </h2>
              <DestinationList links={LEGAL_LINKS} />
            </section>
          )}
        </div>
      </main>
    </EntryShell>
  )
}
