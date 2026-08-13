import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { AVATAR_SIGNED_URL_EXPIRY_SECONDS } from "../../../../lib/security/avatar-authz"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AVATAR_BUCKET = "avatars"

// Authorisation here is the profiles RLS policy, not code in this route: the
// target's profile row is read with the authenticated client, so a row comes
// back only when the viewer is the holder or someone the profile's visibility
// allows (co-locality member). No row means "you may not see this person" —
// 404, never 403, so the endpoint cannot be used as an account-existence
// oracle. The service-role client enters only after authorisation, to sign
// the storage object — the one thing it is needed for here. A failed read is
// infrastructure failure, not a denial, so the error is never swallowed into
// a 404.
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    return NextResponse.json({ error: "config" }, { status: 500 })
  }

  const cookieStore = await cookies()
  const authClient = createServerClient<Database>(url, anonKey, {
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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { data: target, error: targetError } = await authClient
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (targetError) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 })
  }
  if (!target) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const service = createServiceClient()
  const { data: files, error: listError } = await service.storage
    .from(AVATAR_BUCKET)
    .list(userId, { limit: 1 })
  if (listError) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 })
  }
  const file = files?.[0]
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { data: signed, error: signError } = await service.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(`${userId}/${file.name}`, AVATAR_SIGNED_URL_EXPIRY_SECONDS)

  if (signError) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 })
  }
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
