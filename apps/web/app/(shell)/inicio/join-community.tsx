import { Users } from "lucide-react"
import { ButtonLink } from "../../components/ui/button"

// Quem ainda não participa de comunidade não ganha uma prévia vazia no meio da
// página: ganha, no topo, o passo que falta — é na comunidade que o Início
// ganha vida. Leva à descoberta real (/communities).
export function JoinCommunityCard() {
  return (
    <section
      aria-labelledby="entrar-comunidade-titulo"
      className="motion-card-enter flex flex-col gap-4 rounded-ui-lg bg-ui-brand-soft p-5 ring-1 ring-ui-line sm:flex-row sm:items-center"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ui-surface text-ui-brand shadow-ui">
        <Users size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="entrar-comunidade-titulo" className="text-base font-semibold text-ui-ink">
          Entre na sua comunidade
        </h2>
        <p className="mt-0.5 text-sm text-ui-ink-2">
          É nela que você conversa com quem mora perto e acompanha o que acontece na vila.
        </p>
      </div>
      <ButtonLink href="/communities" variant="primary">
        Ver comunidades
      </ButtonLink>
    </section>
  )
}
