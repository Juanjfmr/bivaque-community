import { origensNativas } from "./rota-do-app"

export function avaliarModoNativo(request: Request): { nativo: boolean } | { recusa: 400 | 403 } {
  if (request.headers.get("x-bivaque-cliente") !== "loja") return { nativo: false }
  const origem = request.headers.get("origin")
  if (origem !== null && !origensNativas().includes(origem)) return { recusa: 403 }
  if (
    request.headers
      .get("cookie")
      ?.split(";")
      .some((cookie) => cookie.trim().startsWith("sb-"))
  ) {
    return { recusa: 400 }
  }
  return { nativo: true }
}
