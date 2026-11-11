/**
 * A inscrição que a rota `/api/app/push` aceita (ADR-20261107, item 1).
 *
 * Só o Web Push entra nesta rodada: `kind` fechado em `web`, destino de um
 * serviço de push conhecido por HTTPS e as duas chaves públicas da inscrição. O
 * dono vem da sessão; o corpo nunca carrega `user_id`. A lista de serviços vale
 * de novo no envio (`adaptador.ts`): o destino também pode ser gravado pelo Data
 * API, não só por esta rota.
 */

export type InscricaoWebValida = Readonly<{
  kind: "web"
  destination: string
  keyP256dh: string
  keyAuth: string
  label: string
}>

const DESTINO_MAXIMO = 1024
const CHAVE_MAXIMA = 255
const ROTULO_MAXIMO = 40
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

export function validarInscricao(
  corpo: Readonly<Record<string, unknown>>,
): InscricaoWebValida | null {
  if (corpo["kind"] !== "web") return null

  const destination = destinoValido(corpo["destination"])
  if (destination === null) return null

  const chaves = corpo["keys"]
  if (chaves === null || typeof chaves !== "object" || Array.isArray(chaves)) return null
  const keyP256dh = chaveValida((chaves as Record<string, unknown>)["p256dh"])
  const keyAuth = chaveValida((chaves as Record<string, unknown>)["auth"])
  if (keyP256dh === null || keyAuth === null) return null

  const rotuloBruto = corpo["label"]
  const label =
    typeof rotuloBruto === "string" && rotuloBruto.trim() !== ""
      ? rotuloBruto.trim().slice(0, ROTULO_MAXIMO)
      : "Navegador"

  return { kind: "web", destination, keyP256dh, keyAuth, label }
}

export function validarDestino(corpo: Readonly<Record<string, unknown>>): string | null {
  return destinoValido(corpo["destination"])
}
