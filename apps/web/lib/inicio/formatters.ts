// RECON-002 (prancha 01-web-inicio): formatação da saudação e dos rótulos de
// data/hora da home. Funções puras — o relógio entra por parâmetro, nunca
// lido dentro do corpo, para que o resultado seja determinístico e o mesmo
// valor sirva a qualquer chamada.

// Faixas da saudação em português: manhã até o meio-dia, tarde até as 18h,
// noite depois disso. A hora vem do fuso do próprio membro (Date local).
export function greetingFor(hour: number): "Bom dia" | "Boa tarde" | "Boa noite" {
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

// "Carlos Ribeiro" → "Carlos". A saudação da prancha usa o primeiro nome; o
// nome completo permanece na sidebar. Vazio ou só-espaço degrada para o
// rótulo neutro que o shell já usa ("Membro"), nunca para buraco.
export function firstNameOf(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return "Membro"
  return trimmed.split(/\s+/)[0] ?? "Membro"
}

// "Sábado, 12 de setembro" — dia da semana e mês por extenso em pt-BR, sem
// ano (a home é o dia de hoje; o ano não acrescenta informação).
export function formatTodayPtBr(date: Date): string {
  const formatted = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

// Chip de data do "próximo encontro" da prancha: "SÁB" sobre "12".
// Recebe o ISO de starts_at e devolve as duas linhas do selo.
export function eventDateChip(iso: string): { weekday: string; day: string } {
  const date = new Date(iso)
  const weekday = date
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase()
  return { weekday, day: String(date.getDate()) }
}

// "9h" em hora cheia, "14:30" quando há minutos — o formato curto pt-BR.
export function formatEventTimePtBr(iso: string): string {
  const date = new Date(iso)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return minutes === 0 ? `${hours}h` : `${hours}:${String(minutes).padStart(2, "0")}`
}
