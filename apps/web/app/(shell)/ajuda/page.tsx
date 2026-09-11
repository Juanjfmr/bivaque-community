import { Mail } from "lucide-react"
import { SUPPORT_EMAIL } from "../../../lib/support"

// Spec C13: orientacoes de acesso/uso, documentos legais reais e o canal de
// suporte configurado. Nada aqui aponta para chat, telefone ou "abrir
// chamado": nenhum dos tres existe no produto. O e-mail de suporte e o mesmo
// canal que o proprio sistema usa nos avisos transacionais (web/lib/support),
// e os documentos vem das rotas legais entregues.
//
// Cada destino e uma linha de altura minima 44 — a auditoria visual mede alvo
// de toque e reprova link de texto solto dentro de paragrafo.

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

const LEGAL_DOCUMENTS = [
  { href: "/privacidade", label: "Política de Privacidade" },
  { href: "/codigo-de-conduta", label: "Código de Conduta" },
]

function DestinationList({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <ul className="mt-2 flex flex-col">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)]"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function AjudaPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-lg font-semibold tracking-tight">Ajuda</h1>
      <p className="mt-1 text-sm text-muted">
        Como funciona o Bivaque, o que você pode fazer com a sua conta e onde encontrar as regras.
      </p>

      <section aria-labelledby="ajuda-acesso" className="mt-8">
        <h2 id="ajuda-acesso" className="text-base font-semibold">
          Acesso e conta
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          Entrar é por link enviado ao seu e-mail. Se o link expirou, solicite outro na tela de
          entrada. Se a sessão expirou no meio do uso, faça login novamente: nada do que estava
          aberto se perde além do rascunho não enviado.
        </p>
        <DestinationList links={ACCOUNT_LINKS} />
      </section>

      <section aria-labelledby="ajuda-uso" className="mt-8">
        <h2 id="ajuda-uso" className="text-base font-semibold">
          Usar o Bivaque
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          Explorar reúne Guia, Mercado, serviços, moradia e eventos da cidade selecionada. Escolher
          uma cidade serve para explorar; participar de comunidade privada continua pedindo
          autorização. O que você marcou para ver depois fica em Salvos, e as respostas, aprovações
          e avisos chegam em Notificações. Conteúdo fora das regras pode ser denunciado pelo menu da
          própria publicação ou conversa.
        </p>
        <DestinationList links={USAGE_LINKS} />
      </section>

      <section aria-labelledby="ajuda-regras" className="mt-8">
        <h2 id="ajuda-regras" className="text-base font-semibold">
          Documentos e regras
        </h2>
        <DestinationList links={LEGAL_DOCUMENTS} />
      </section>

      <section aria-labelledby="ajuda-suporte" className="mt-8">
        <h2 id="ajuda-suporte" className="text-base font-semibold">
          Falar com a equipe
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          O canal de suporte do Bivaque é o e-mail abaixo. Não há chat, telefone ou sistema de
          chamados: escreva para cá e a equipe responde pelo mesmo e-mail.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-action-primary-hover)]"
        >
          <Mail size={16} aria-hidden="true" />
          {SUPPORT_EMAIL}
        </a>
      </section>
    </div>
  )
}
