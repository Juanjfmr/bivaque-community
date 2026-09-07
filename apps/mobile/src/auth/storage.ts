// Wrapper tipado sobre expo-secure-store para a sessão do Bivaque.
// Single source of truth para o que vai e o que sai do Keychain/Keystore.
//
// Schema (mínimo, conforme ADR-20260901-mobile-session §Decision):
//   access_token: string    — JWT do Supabase Auth
//   refresh_token: string   — usado para renovar antes do access_token expirar
//   expires_at: number      — unix epoch (segundos) da expiração do access_token
//   user_id: string         — UUID do membro (sub claim do JWT)
//   locality_id: string     — UUID da locality ativa (não persistido no JWT)
//
// Sem PII, sem foto, sem endereço, sem refresh-token-rotacionado.
// O storage é caro (Keychain no iOS, EncryptedSharedPreferences no
// Android) — só persistimos o mínimo necessário para sobreviver
// kill+relaunch e revogar pelo /auth/v1/logout.

import * as SecureStore from "expo-secure-store"

export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user_id: string
  locality_id: string
}

const STORAGE_KEY = "bivaque.session.v1"

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session), {
    // iOS: accessibility restrita ao aparelho; não sincroniza com iCloud Backup.
    // Android: EncryptedSharedPreferences, fora do backup automatico.
    // Ver ADR-20260901-mobile-session §Decision (iCloud/Google backup).
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: false,
  })
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY)
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Storage corrompido (escrita parcial, downgrade de app, tamper).
    // Tratamos como ausência: força re-login. Não ecoamos o erro cru
    // para o caller (anti-enumeração §4.3).
    await clearSession().catch(() => {
      // best-effort; na próxima chamada loadSession ainda vai tentar clear
    })
    return null
  }
  const validated = validateStoredSession(parsed)
  if (!validated) {
    // JSON válido mas shape errado (downgrade de app, tamper, race).
    // Mesma política: limpa e força re-login.
    await clearSession().catch(() => {
      // best-effort
    })
    return null
  }
  return validated
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
}

function validateStoredSession(value: unknown): StoredSession | null {
  if (typeof value !== "object" || value === null) return null
  const v = value as Record<string, unknown>
  if (
    typeof v["access_token"] !== "string" ||
    typeof v["refresh_token"] !== "string" ||
    typeof v["expires_at"] !== "number" ||
    typeof v["user_id"] !== "string" ||
    typeof v["locality_id"] !== "string"
  ) {
    return null
  }
  return {
    access_token: v["access_token"],
    refresh_token: v["refresh_token"],
    expires_at: v["expires_at"],
    user_id: v["user_id"],
    locality_id: v["locality_id"],
  }
}
