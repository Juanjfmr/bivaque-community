import { gravarPkce } from "./cofre"

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function desafioPkce(verificador: string): Promise<string> {
  const resumo = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador))
  return base64url(new Uint8Array(resumo))
}

export async function criarPkce(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const verificador = base64url(bytes)
  const desafio = await desafioPkce(verificador)
  await gravarPkce({ verificador, criadoEm: Date.now() })
  return desafio
}
