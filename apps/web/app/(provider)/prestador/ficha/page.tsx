import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@bivaque/domain"
import { Button, Checkbox, Input, TextArea } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { saveProfileAction } from "../actions"

// Onda G Task 4 — edição da ficha. Formulário server-action simples; a RLS
// owner-only autoriza o upsert. Categoria é lista FECHADA (§7.2.1): sem
// "Outros", sem categoria livre.

type ProfileRow = {
  display_name: string
  category: ProviderCategory
  bio: string | null
  contact_phone: string | null
  contact_is_public: boolean
}

export default async function PrestadorFichaPage() {
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
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return null

  const { data: profile } = await authClient
    .from("provider_profiles")
    .select("display_name, category, bio, contact_phone, contact_is_public")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  const current = (profile ?? null) as ProfileRow | null

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Minha ficha</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Isto é o que os membros aprovados da sua comunidade veem na vitrine.
      </p>

      <form action={saveProfileAction} className="mt-6 space-y-5">
        <div>
          <label htmlFor="displayName" className="text-sm font-medium">
            Nome público
          </label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={current?.display_name ?? ""}
            aria-label="Nome público"
            required
            minLength={2}
            maxLength={80}
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="category" className="text-sm font-medium">
            Categoria
          </label>
          {/* select nativo: a lista é fechada no domínio e no enum do banco;
              um componente composto aqui adicionaria superfície sem ganho. */}
          <select
            id="category"
            name="category"
            defaultValue={current?.category ?? ""}
            required
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
          >
            <option value="" disabled>
              Escolha a categoria…
            </option>
            {PROVIDER_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {PROVIDER_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bio" className="text-sm font-medium">
            Descrição curta <span className="font-normal text-muted-foreground">(até 800)</span>
          </label>
          <TextArea
            id="bio"
            aria-label="Descrição curta"
            name="bio"
            defaultValue={current?.bio ?? ""}
            placeholder="O que você faz, para quem e como funciona"
            className="mt-1 w-full"
          />
        </div>

        <div>
          <label htmlFor="contactPhone" className="text-sm font-medium">
            Telefone de contato{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={current?.contact_phone ?? ""}
            aria-label="Telefone de contato"
            placeholder="92 999999999"
            className="mt-1"
          />
        </div>

        <Checkbox name="contactIsPublic" defaultSelected={current?.contact_is_public ?? false}>
          Mostrar meu telefone na ficha pública
        </Checkbox>

        <Button type="submit" variant="primary" size="md">
          Salvar ficha
        </Button>
      </form>
    </main>
  )
}
