// Sign out da sessão Bivaque no nativo.
//
// Fluxo (ADR-20260901-mobile-session §Decision):
// 1. POST /auth/v1/logout no servidor — invalida o refresh_token em
//    auth.refresh_tokens (server-side). Sem isso, o token roubado
//    fica válido até expires_at.
// 2. clearSession() — remove tokens do Keychain/Keystore.
// 3. purge() — zera rascunhos e uploads pendentes.
//
// Falha de transporte no passo 1 NÃO bloqueia o passo 2/3:
// se a sessão local é removida mesmo quando o servidor não respondeu,
// o membro não consegue mais agir no app (sem token), o que é o
// objetivo do logout. O servidor será limpo na próxima vez que o
// refresh_token expirar.
//
// copy de erro é genérica — não distinguimos "servidor inacessível"
// de "refresh_token já revogado" para não vazar estado da conta.

import { purge } from "./purge"
import { clearSession } from "./storage"

const SUPABASE_URL_ENV = "EXPO_PUBLIC_SUPABASE_URL"
const SUPABASE_ANON_KEY_ENV = "EXPO_PUBLIC_SUPABASE_ANON_KEY"

export class SignOutError extends Error {
  constructor(public readonly stage: "transport" | "storage") {
    super(stage === "transport" ? "Sair da conta falhou" : "Limpar sessao local falhou")
    this.name = "SignOutError"
  }
}

export async function signOut(accessToken: string | null): Promise<void> {
  if (accessToken) {
    const supabaseUrl = process.env[SUPABASE_URL_ENV]
    const supabaseAnonKey = process.env[SUPABASE_ANON_KEY_ENV]
    if (!supabaseUrl || !supabaseAnonKey) {
      // Configuração ausente é bug do build, não falha de transporte.
      // Não ecoamos detalhes — caller trata como erro generico.
      throw new SignOutError("transport")
    }
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      })
      // Qualquer status != 200 (4xx, 5xx) é tratado como falha de
      // transporte: o membro não consegue mais agir sem o token local,
      // que é o objetivo do logout. O servidor será limpo na próxima
      // vez que o refresh_token expirar (ADR-20260901 §Decision).
      // Decisao: nao vazar para UI o motivo exato (anti-enumeracao §4.3).
      if (!response.ok) {
        // log silencioso; segue para cleanup local
      }
    } catch {
      // Falha de rede (timeout, DNS, offline). Não bloqueia o cleanup
      // local. Mesmo rationale do bloco acima.
    }
  }

  await clearSession().catch(() => {
    throw new SignOutError("storage")
  })

  await purge().catch(() => {
    // best-effort; rascunhos podem persistir, mas a sessão está morta.
    // Decisao documentada: nao bloquear signOut por falha de purge.
  })
}
