/**
 * Relógio do reenvio de link de confirmação/recuperação (prancha 37).
 *
 * A regra que o card e a guia exigem: o contador regressivo não pode ser só
 * visual — ele ecoa o limite do servidor, e o servidor é o GoTrue. O limite
 * real é imposto lá (`/auth/v1/resend` responde 429 com "you can only request
 * this after N seconds" quando estourado); este módulo só traduz o que o
 * servidor já disse em segundos de espera:
 *
 *   1. 429 do servidor → `retryAfterSeconds` do `classifyEntrySend`
 *      (lib/auth/entry-send.ts), lido da mensagem ou do `Retry-After`.
 *   2. Envio aceito (200) → janela padrão do provedor: os fluxos de e-mail do
 *      GoTrue (`signup`, `recover`) têm cooldown documentado de 60s por
 *      endereço, e o `DEFAULT_RETRY_SECONDS` do classificador é o mesmo valor.
 *   3. Falha de rede/transporte → nenhum cooldown: prometer espera sobre um
 *      envio que não aconteceu seria a mentira do botão, não o limite do servidor.
 *
 * O `lastResendAt` vive em sessionStorage, não em query string nem em log: o
 * endereço de e-mail não pode aparecer na URL (contrato RECON-018, proibição
 * explícita), e sobreviver a um recarregamento é o que separa "contador do
 * servidor persistido" de animação de enfeite.
 *
 * Função pura de cálculo; as leituras de storage são finas e guardadas para
 * SSR. Testável sem navegador.
 */

import { classifyEntrySend } from "../../../lib/auth/entry-send"

/** Janela padrão do provedor para reenvio de e-mail (ver cabeçalho). */
export const RESEND_COOLDOWN_SECONDS = 60

const PENDING_KEY = "bivaque:confirmacao-pendente"

export interface PendingConfirmation {
  email: string
  /** Epoch-ms do último envio aceito pelo servidor; null antes do primeiro. */
  lastResendAt: number | null
}

/**
 * Segundos que faltam para o próximo reenvio, dado o último aceite pelo
 * servidor. `serverSeconds` (de um 429 real) tem precedência sobre a janela
 * padrão: se o servidor mandou esperar mais (ou menos), é o servidor que manda.
 */
export function computeResendCooldown(options: {
  lastResendAt: number | null
  serverSeconds?: number | null
  now: number
}): number {
  if (typeof options.serverSeconds === "number" && options.serverSeconds >= 0) {
    return Math.ceil(options.serverSeconds)
  }
  if (options.lastResendAt === null) return 0
  const elapsed = (options.now - options.lastResendAt) / 1000
  const remaining = RESEND_COOLDOWN_SECONDS - elapsed
  return remaining > 0 ? Math.ceil(remaining) : 0
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage
}

export function readPendingConfirmation(): PendingConfirmation | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return null
    const record = parsed as { email?: unknown; lastResendAt?: unknown }
    if (typeof record.email !== "string" || record.email.length === 0) return null
    return {
      email: record.email,
      lastResendAt: typeof record.lastResendAt === "number" ? record.lastResendAt : null,
    }
  } catch {
    return null
  }
}

export function writePendingConfirmation(pending: PendingConfirmation): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // Storage cheio ou bloqueado: o painel perde o eco do endereço mas o
    // reenvio continua limitado pelo servidor na própria sessão da página.
  }
}

/**
 * Classifica a resposta de um `auth.resend`/`resetPasswordForEmail` com o MESMO
 * classificador anti-enumeração do envio de entrada (lib/auth/entry-send.ts):
 * sucesso, endereço inexistente e erro que fala da conta colapsam em "sent";
 * limite e rede continuam distinguíveis. Reusar em vez de reescrever mantém
 * uma única fonte da regra que o ADR de senha não pode deixar vazar.
 */
export function classifyResend(error: unknown) {
  return classifyEntrySend(error)
}
