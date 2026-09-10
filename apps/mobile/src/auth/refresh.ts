// Helper de refresh para a sessão Bivaque no nativo.
//
// A renovação real do JWT é feita pelo supabase-js (configurado com
// autoRefreshToken: true no client). Este módulo apenas expõe a
// pergunta "este token está perto de expirar?" para que a UI possa
// esconder indicadores de sessão-viva antes do refresh silencioso
// acontecer.
//
// Janela: 60s antes de expires_at. Conservador (pode ser ajustado para
// 30s ou 120s conforme métrica de UX). Refresh transparente do
// supabase-js normalmente termina antes disso.

const REFRESH_WINDOW_SECONDS = 60

export function isNearExpiry(
  expiresAt: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  return expiresAt - nowSeconds <= REFRESH_WINDOW_SECONDS
}

export function isExpired(
  expiresAt: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  return expiresAt <= nowSeconds
}
