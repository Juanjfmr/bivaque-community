import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { Button, TextArea } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../../../../lib/supabase/server"
import { revokeProviderAccountAction } from "../../../actions"

// Onda G Task 3, Step 6 — console do dono da comunidade: as fichas que ela
// atestou e o ato de revogar (ADR conta-de-prestador, decisão 2). A listagem
// passa pela RPC `list_community_providers`, que reconfere a posse no banco
// com caller explícito — service_role media, o dono vem do contexto
// autenticado. Revogar não apaga: marca data/motivo e desliga o alcance;
// o estado revogado continua visível aqui para auditoria.

type ProviderRow = {
  provider_user_id: string
  display_name: string
  category: ProviderCategory
  revoked_at: string | null
}

export default async function CommunityProvidersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: communityId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server component, sem escrita de cookie.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return null
  }

  const serviceClient = createServiceClient()
  const { data: providersData, error } = await serviceClient.rpc("list_community_providers", {
    p_community_id: communityId,
    p_user_id: user.id,
    p_limit: 200,
  })

  if (error) {
    throw new Error(`Falha ao listar as fichas: ${error.message}`)
  }

  const providers = (providersData as ProviderRow[] | null) ?? []

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Prestadores da comunidade</h1>
        <p className="mt-1 text-sm text-muted">
          Fichas atestadas por esta comunidade. Revogar desliga a vitrine em todas as vilas e fica
          registrado com motivo — não apaga a conta nem a ficha.
        </p>
      </header>

      {providers.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma ficha atestada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li
              key={provider.provider_user_id}
              className="space-y-3 rounded-md border border-border p-3 text-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="font-medium">{provider.display_name}</span>{" "}
                  <span className="text-xs text-muted">
                    {PROVIDER_CATEGORY_LABELS[provider.category] ?? provider.category}
                  </span>
                </div>
                {provider.revoked_at ? (
                  <span className="whitespace-nowrap text-xs text-muted">
                    Revogada em {new Date(provider.revoked_at).toLocaleDateString("pt-BR")}
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-xs font-semibold text-[var(--accent)]">
                    Ativa
                  </span>
                )}
              </div>

              {!provider.revoked_at ? (
                <form action={revokeProviderAccountAction} className="space-y-2">
                  <input type="hidden" name="communityId" value={communityId} />
                  <input type="hidden" name="providerUserId" value={provider.provider_user_id} />
                  <TextArea
                    aria-label={`Motivo da revogação de ${provider.display_name}`}
                    name="reason"
                    placeholder="Motivo registrado na auditoria da revogação"
                    className="w-full"
                  />
                  <Button type="submit" size="sm" variant="tertiary">
                    Revogar ficha
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
