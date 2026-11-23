export function comTempoLimite(ms: number): { signal: AbortSignal; cancelar: () => void } {
  const controller = new AbortController()
  const temporizador = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancelar: () => clearTimeout(temporizador) }
}
