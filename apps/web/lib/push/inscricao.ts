export type InscricaoValida = Readonly<{
  kind: "web" | "android" | "ios"
  destination: string
  keyP256dh: string | null
  keyAuth: string | null
}>

const DESTINO_MAXIMO = 1024
const CHAVE_MAXIMA = 255
const CHAVE_BASE64URL = /^[A-Za-z0-9_-]+$/

// Endereços que os serviços de push dos navegadores publicam. O destino é dado
// do cliente e o servidor faz uma requisição para ele; sem esta lista, uma
// inscrição aponta para qualquer HTTPS e vira um pedido do servidor a um alvo
// escolhido por quem se inscreveu.
const SERVICOS_DE_PUSH = [
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
] as const
const SERVICOS_DE_PUSH_EXATOS = ["fcm.googleapis.com"] as const

/** O destino é um endpoint de um serviço de push conhecido, por HTTPS. */
export function destinoDePushPermitido(valor: string): boolean {
  try {
    const url = new URL(valor)
    if (url.protocol !== "https:") return false
    const host = url.hostname.toLowerCase()
    return (
      SERVICOS_DE_PUSH_EXATOS.includes(host as (typeof SERVICOS_DE_PUSH_EXATOS)[number]) ||
      SERVICOS_DE_PUSH.some((dominio) => host === dominio || host.endsWith(`.${dominio}`))
    )
  } catch {
    return false
  }
}

function destinoValido(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length === 0 || valor.length > DESTINO_MAXIMO) return null
  return destinoDePushPermitido(valor) ? valor : null
}

function chaveValida(valor: unknown): string | null {
  if (
    typeof valor !== "string" ||
    valor.length === 0 ||
    valor.length > CHAVE_MAXIMA ||
    !CHAVE_BASE64URL.test(valor)
  ) {
    return null
  }
  return valor
}

export function validarDestino(
  corpo: Readonly<Record<string, unknown>>,
): { kind: "web" | "android" | "ios"; destination: string } | null {
  const kind = corpo["kind"]
  const valor = corpo["destination"]
  if (kind === "web") {
    const destination = destinoValido(valor)
    return destination === null ? null : { kind, destination }
  }
  if (
    (kind === "android" || kind === "ios") &&
    typeof valor === "string" &&
    valor.length <= 4096 &&
    /^[\x21-\x7e]+$/.test(valor)
  ) {
    return { kind, destination: valor }
  }
  return null
}

export function validarInscricao(corpo: Readonly<Record<string, unknown>>): InscricaoValida | null {
  const destino = validarDestino(corpo)
  if (destino === null) return null
  if (destino.kind !== "web") {
    if (corpo["keys"] != null) return null
    return { ...destino, keyP256dh: null, keyAuth: null }
  }
  const chaves = corpo["keys"]
  if (chaves === null || typeof chaves !== "object" || Array.isArray(chaves)) return null
  const keyP256dh = chaveValida((chaves as Record<string, unknown>)["p256dh"])
  const keyAuth = chaveValida((chaves as Record<string, unknown>)["auth"])
  if (keyP256dh === null || keyAuth === null) return null
  return { ...destino, keyP256dh, keyAuth }
}
