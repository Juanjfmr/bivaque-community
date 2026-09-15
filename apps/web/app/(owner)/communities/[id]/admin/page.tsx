import type { Route } from "next"
import Link from "next/link"

export default async function CommunityAdminHome({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityId } = await params

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-8">
      <h1 className="text-lg font-semibold tracking-tight">Administração da comunidade</h1>
      <p className="text-sm text-muted">
        Aprovação e moderação da própria comunidade. Outras seções entram aqui quando a onda
        correspondente fechar (§12 regra 3).
      </p>
      <ul className="space-y-2 text-sm">
        <li>
          <Link
            href={`/communities/${communityId}/admin/pending` as Route}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-[var(--surface-sunken)] px-3 text-foreground hover:underline"
          >
            Pedidos de entrada
          </Link>
        </li>
        <li>
          <Link
            href={`/communities/${communityId}/admin/moderators` as Route}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-[var(--surface-sunken)] px-3 text-foreground hover:underline"
          >
            Moderadores
          </Link>
        </li>
        <li>
          <Link
            href={`/communities/${communityId}/admin/media` as Route}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-[var(--surface-sunken)] px-3 text-foreground hover:underline"
          >
            Imagens da comunidade
          </Link>
        </li>
      </ul>
    </div>
  )
}
