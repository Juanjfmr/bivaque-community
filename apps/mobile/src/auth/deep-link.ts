// apps/mobile/src/auth/deep-link.ts
// Leitura do retorno de autenticação que chega por deep link.
//
// O fluxo aprovado em ADR-20260901-mobile-session é PKCE: o app pede o link,
// o GoTrue manda o e-mail, a pessoa abre o link no aparelho, o GoTrue verifica
// o token e redireciona para o scheme do app com um `code` na query. O app
// troca esse `code` por sessão usando o verifier que guardou no secure-store.
//
// Esta função é pura de propósito. O que ela decide — "isto é um retorno de
// auth?", "veio código ou veio erro?" — é exatamente o que precisa de teste, e
// é o que não dá para exercitar num emulador sem construir o app inteiro.
// A troca por sessão e o listener ficam com o chamador.
//
// Erro do GoTrue chega em query OU em fragmento, dependendo da versão e do
// tipo de falha. Lemos os dois: um link expirado que caísse na leitura errada
// viraria silêncio na tela, que é o pior resultado possível aqui.

/** Caminho do retorno. Precisa bater com `additional_redirect_urls` no config.toml. */
export const AUTH_CALLBACK_PATH = "auth-callback"

export type AuthDeepLink =
  | { kind: "code"; code: string }
  | { kind: "error"; code: string | null; description: string }

// Mensagens por código de erro do GoTrue. Genéricas quanto à conta: um link
// expirado não deve contar se o endereço existe (mesma regra anti-enumeração
// de apps/web/lib/auth/entry-send.ts).
const ERROR_COPY: Record<string, string> = {
  otp_expired: "Este link expirou. Peça outro para entrar.",
  access_denied: "Este link não vale mais. Peça outro para entrar.",
  bad_oauth_state: "Não foi possível concluir a entrada. Peça outro link.",
}

const DEFAULT_ERROR_COPY = "Não foi possível concluir a entrada. Peça outro link."

export function describeAuthError(code: string | null): string {
  if (!code) return DEFAULT_ERROR_COPY
  return ERROR_COPY[code] ?? DEFAULT_ERROR_COPY
}

// O fragmento (#a=1&b=2) não é lido por URLSearchParams a partir de `search`,
// então é normalizado à mão antes da união.
const paramsOf = (raw: string): URLSearchParams => {
  const hashIndex = raw.indexOf("#")
  const query = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const fragment = hashIndex >= 0 ? raw.slice(hashIndex + 1) : ""
  const queryIndex = query.indexOf("?")
  const search = queryIndex >= 0 ? query.slice(queryIndex + 1) : ""
  return new URLSearchParams([search, fragment].filter(Boolean).join("&"))
}

/**
 * Devolve `null` quando a URL não é um retorno de autenticação — deep links de
 * conteúdo passam por aqui e não podem ser confundidos com login.
 */
export function readAuthDeepLink(url: string | null | undefined): AuthDeepLink | null {
  if (typeof url !== "string" || url.length === 0) return null
  if (!url.includes(AUTH_CALLBACK_PATH)) return null

  const params = paramsOf(url)

  const errorCode = params.get("error_code") ?? params.get("error")
  if (errorCode) {
    return {
      kind: "error",
      code: errorCode,
      description: describeAuthError(errorCode),
    }
  }

  const code = params.get("code")
  if (code) return { kind: "code", code }

  // Bate o caminho mas não traz nem código nem erro: link truncado, aberto
  // duas vezes, ou reescrito por um cliente de e-mail. Tratamos como falha
  // explícita — devolver `null` deixaria a pessoa numa tela parada.
  return { kind: "error", code: null, description: DEFAULT_ERROR_COPY }
}
