import { cabecalhosDeCors, cabecalhosDePreflight } from "./contrato"
import { origensNativas } from "./rota-do-app"

export function corsLocalidades(request: Request): Readonly<Record<string, string>> {
  return cabecalhosDeCors(request.headers.get("origin"), [], origensNativas())
}

export function opcoesLocalidades(request: Request): Response {
  const headers = cabecalhosDePreflight(request.headers.get("origin"), [], origensNativas())
  return new Response(null, {
    status: 204,
    headers: Object.keys(headers).length
      ? { ...headers, "access-control-allow-methods": "GET, OPTIONS" }
      : headers,
  })
}
