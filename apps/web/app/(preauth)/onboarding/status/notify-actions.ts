"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { log } from "../../../../lib/logger"

// PORT-004 (lote 4, frente B): "Avise-me quando liberar" grava uma preferência
// do próprio dono (`public.onboarding_release_notices`). Não cria envio nenhum:
// a decisão da análise já avisa e manda e-mail; esta linha só registra que a
// pessoa quer ser avisada quando liberar.
//
// A escrita vai pelo cliente com a sessão da pessoa — o `user_id` é
// `auth.uid()`, não um valor vindo do formulário — e quem autoriza é a policy
// de RLS (`user_id = auth.uid()`), provada em
// `supabase/tests/onboarding-release-notices.sql` (positivo e negativo). O
// cliente de serviço não é usado aqui de propósito: com ele a policy não
// estaria sendo exercitada no caminho real.

export type ReleaseNoticeResult = { ok: true } | { ok: false; error: string }

export async function subscribeToReleaseNotice(): Promise<ReleaseNoticeResult> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente para continuar." }
  }

  // Uma linha por pessoa: pedir de novo não duplica nem sobrescreve o pedido
  // original, então a data do primeiro pedido continua sendo a verdade.
  const { error } = await supabase
    .from("onboarding_release_notices")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true })

  if (error) {
    log.error("release notice preference write failed", { code: error.code })
    return { ok: false, error: "Não foi possível registrar o aviso agora. Tente de novo." }
  }

  return { ok: true }
}
