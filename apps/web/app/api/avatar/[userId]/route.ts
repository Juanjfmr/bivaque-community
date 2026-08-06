import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AVATAR_BUCKET = "avatars"

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

  const supabase = createServiceClient()
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 1 })
  const file = data?.[0]
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { data: signed } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(`${userId}/${file.name}`, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
