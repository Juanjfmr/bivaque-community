import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  AVATAR_SIGNED_URL_EXPIRY_SECONDS,
  canReadAvatar,
} from "../../../../lib/security/avatar-authz"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AVATAR_BUCKET = "avatars"

// Authorizing the read of third-party avatars is mandatory: the previous
// implementation authenticated the caller and then read with `service_role`,
// which bypasses RLS and lets any signed-in account fetch any other member's
// photo. The unit-tested helper `canReadAvatar` captures the full decision
// (self, same-locality, denied) so the route stays thin and the matrix is
// provable without Docker. Every denial — including the "no locality" case —
// is 404 so the endpoint cannot be used as an existence oracle.
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    return NextResponse.json({ error: "config" }, { status: 500 })
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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let targetLocalityId: string | null = null
  if (user.id !== userId) {
    // The locality_memberships table grants only `select_self`, so the target
    // row is read with service_role. The helper that gates the read runs
    // through the authenticated client so `auth.uid()` resolves to the caller.
    const service = createServiceClient()
    const { data: membership } = await service
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", userId)
      .maybeSingle()
    targetLocalityId = (membership as { locality_id: string } | null)?.locality_id ?? null

    const { data: allowed } = await authClient.rpc("is_locality_member", {
      target_locality_id: targetLocalityId ?? "",
    })

    if (
      !canReadAvatar({
        viewerId: user.id,
        targetUserId: userId,
        targetLocalityId,
        viewerIsLocalityMember: Boolean(allowed),
      })
    ) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
  }

  const service = createServiceClient()
  const { data } = await service.storage.from(AVATAR_BUCKET).list(userId, { limit: 1 })
  const file = data?.[0]
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { data: signed } = await service.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(`${userId}/${file.name}`, AVATAR_SIGNED_URL_EXPIRY_SECONDS)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
