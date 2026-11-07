import { createServerClient } from "../../../../../lib/supabase/server"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Cada resumo novo sobrescreve o hash: só o link do e-mail mais recente vale.
const LINK_VENCIDO =
  "Este link não vale mais. Use o link do resumo mais recente, ou desligue o resumo em Você > Avisos."

function pagina(mensagem: string, status: number) {
  return new Response(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumo da cidade — Bivaque</title><main><h1>Resumo da cidade</h1><p>' +
      mensagem +
      '</p><a href="/app/voce">Abrir minhas preferências no Bivaque</a></main></html>',
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      },
    },
  )
}
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")
  if (token === null || !/^[0-9a-f]{64}$/.test(token)) return pagina(LINK_VENCIDO, 400)
  try {
    // O token aleatório com expiração autoriza só desligar este resumo; sem sessão.
    const { data, error } = await createServerClient().rpc("unsubscribe_city_digest", {
      p_token: token,
    })
    if (error)
      return pagina("Não foi possível desligar o resumo agora. Tente abrir este link de novo.", 503)
    return data
      ? pagina("Pronto. Você não receberá mais o resumo da cidade por e-mail.", 200)
      : pagina(LINK_VENCIDO, 400)
  } catch {
    return pagina("Não foi possível desligar o resumo agora. Tente abrir este link de novo.", 503)
  }
}
