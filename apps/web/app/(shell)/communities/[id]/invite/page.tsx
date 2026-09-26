// Onda E Task 6 — community member invite management page (server shell).
//
// The form + token display lives in the client `CommunityInviteSection`
// (this page is a server component because the route is auth-gated by the
// shell layout, but the action needs to capture the token). The data is
// fetched on the client by the section.

import { CommunityInviteSection } from "./invite-section"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CommunityInvitePage({ params }: PageProps) {
  const { id: communityId } = await params

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Convidar membros</h1>
        <p className="mt-1 text-sm text-muted">
          O link vale só para esta comunidade. Quem aceitar ainda passa pela aprovação de quem cuida
          dela.
        </p>
      </header>

      <CommunityInviteSection communityId={communityId} />
    </div>
  )
}
