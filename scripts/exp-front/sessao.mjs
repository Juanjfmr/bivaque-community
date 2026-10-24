export async function sessionCookies(email = "visual@bivaque.example.invalid") {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const password = process.env.USER_PASSWORD ?? "bivaque-e2e-local"
  if (!url || !anonKey)
    throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY devem vir de supabase status -o env")
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`login local falhou: HTTP ${response.status}`)
  const session = await response.json()
  const claims = JSON.parse(
    Buffer.from(session.access_token.split(".")[1], "base64").toString("utf8"),
  )
  const value = `base64-${Buffer.from(JSON.stringify({ ...session, user: { id: claims.sub, email, aud: claims.aud, role: claims.role } })).toString("base64url")}`
  const common = {
    domain: "127.0.0.1",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 86400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }
  return [
    { name: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`, value, ...common },
    { name: "bivaque-consent-version", value: "2", ...common },
  ]
}
