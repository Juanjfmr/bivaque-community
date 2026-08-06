import { createHash, randomBytes } from "node:crypto"
import { Button, Input } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

type PendingInviteRow = {
  id: string
  invitee_email_digest: Buffer
  created_at: string
  expires_at: string
}

async function sendFamilyInviteAction(formData: FormData) {
  "use server"
  const email = formData.get("email")
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("email inválido")
  }

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
  if (!user) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_verified_holder", {
    p_user_id: user.id,
  })
  if (!isVerified) {
    throw new Error("apenas titulares verificados podem enviar convites")
  }

  const token = randomBytes(32)
  const tokenDigest = createHash("sha256").update(token).digest("hex")
  const emailDigest = createHash("sha256").update(email.toLowerCase().trim()).digest("hex")

  const { error } = await supabase.rpc("create_family_invitation", {
    p_inviter_user_id: user.id,
    p_token_digest: tokenDigest,
    p_invitee_email_digest: emailDigest,
  })

  if (error) {
    if (error.message.includes("maximum 5")) {
      throw new Error("máximo de 5 convites ativos. Revogue um antes de enviar outro.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile")
}

async function revokeFamilyInviteAction(formData: FormData) {
  "use server"
  const invitationId = formData.get("invitationId")
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    throw new Error("invitationId required")
  }

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
  if (!user) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("revoke_family_invitation", {
    p_invitation_id: invitationId,
    p_inviter_user_id: user.id,
  })

  if (error) {
    if (error.message.includes("not found or not revocable")) {
      throw new Error("Convite não encontrado ou já não pode ser revogado.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile")
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function FamilyInviteSection() {
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

  if (!user) {
    return null
  }

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_verified_holder", {
    p_user_id: user.id,
  })

  const { data: pendingData } = await supabase.rpc("list_pending_family_invitations", {
    p_user_id: user.id,
  })

  const pending = (pendingData as PendingInviteRow[] | null) ?? []

  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
      <p className="text-sm font-medium">Convites de família</p>
      <p className="mt-1 text-xs text-muted">
        Convide até 5 familiares por vez. Cada convite expira em 7 dias.
      </p>

      {isVerified ? (
        <form action={sendFamilyInviteAction} className="mt-3 flex gap-2">
          <Input
            type="email"
            name="email"
            placeholder="email@familiar.com"
            required
            className="flex-1"
          />
          <Button type="submit" size="sm" variant="primary">
            Enviar
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Apenas titulares verificados podem enviar convites.
        </p>
      )}

      {pending.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-[var(--surface-sunken)] p-2 text-xs"
            >
              <span className="text-muted">
                Convite enviado em {formatDate(inv.created_at)} — expira em{" "}
                {formatDate(inv.expires_at)}
              </span>
              <form action={revokeFamilyInviteAction}>
                <input type="hidden" name="invitationId" value={inv.id} />
                <Button type="submit" size="sm" variant="tertiary">
                  Revogar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
