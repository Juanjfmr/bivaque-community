// Cliente Supabase para o app Bivaque no nativo.
//
// Persiste a sessao no Keychain/Keystore via expo-secure-store (S2),
// faz refresh automatico do JWT antes da expiracao, e expõe
// `loadSession()` / `saveSession()` como thin-wrappers do storage.ts.
//
// Por que o cliente e' criado uma vez e reusado (singleton):
// - supabase-js gerencia internamente um state machine de sessao;
//   chamar `createClient` mais de uma vez cria clientes independentes
//   que nao compartilham refresh tokens. Para a golden slice (que
//   faz posts/com_reactions/reports na mesma sessao), precisamos
//   de uma unica instancia.
// - RN/Expo nao tem HMR com cleanup confiavel; o singleton sobrevive
//   ao fast refresh sem precisar resetar o token a cada render.
//
// Por que `autoRefreshToken: true`: o supabase-js detecta
// `expires_at - 60s` e renova automaticamente via /auth/v1/token.
// PersistSession grava no storage apos cada refresh.
//
// Por que `detectSessionInUrl: false`: o app nativo nao lida com
// deep links de auth callback (o fluxo de login do nativo e' diferente,
// por implementar em contrato R3 proprio).
//
// A configuracao EXPO_PUBLIC_* vem do Expo Constants. Sem ela, o
// cliente nao conecta — caller trata como bug de build (throw).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import type { StoredSession } from "./storage"
import { clearSession, loadSession } from "./storage"

const SUPABASE_URL = process.env["EXPO_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"]

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set at build time. " +
      "See apps/mobile/.env or EAS env configuration.",
  )
}

// Adapter que o supabase-js consome para persistir tokens fora de
// localStorage/AsyncStorage. Wrap o expo-secure-store com a API
// async { getItem, setItem, removeItem }.
const expoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: false,
    })
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key)
  },
}

// Singleton do cliente. `globalThis` sobrevive a HMR (Fast Refresh
// recarrega o modulo mas o objeto global persiste).
declare global {
  // eslint-disable-next-line no-var
  var __BIVAQUE_SUPABASE__: SupabaseClient | undefined
}

export const supabase: SupabaseClient =
  globalThis.__BIVAQUE_SUPABASE__ ??
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: expoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Mantemos o lock do refresh em uma implementacao padrao do
      // supabase-js (memoria local). Expo nao tem Web Locks API.
    },
  })

if (!globalThis.__BIVAQUE_SUPABASE__) {
  globalThis.__BIVAQUE_SUPABASE__ = supabase
}

// Helper: hidrata o cliente apos cold start a partir do que o storage
// guardou (S2). Sem isso, o cliente começa sem sessao mesmo que o
// keychain tenha um access_token valido.
export async function hydrateSessionFromStorage(): Promise<StoredSession | null> {
  const session = await loadSession()
  if (!session) return null
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  return session
}

// Helper: aplica o signOut do storage (que ja' chama /auth/v1/logout)
// e limpa a sessao local no cliente.
export async function signOutAndClear(): Promise<void> {
  await clearSession()
  await supabase.auth.signOut()
}
