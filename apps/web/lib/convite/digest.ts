import { createHash, randomInt } from "node:crypto"
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "./code"

// PORT-006 (lote 4 da entrada) — o segredo do convite, só no servidor.
//
// O banco guarda só o sha256 (migration 20261023120000), então o código em
// claro existe em dois lugares apenas: o retorno de `generateInviteCode`, que a
// tela do titular mostra uma vez, e o payload do outbox que o entrega por
// e-mail — a mesma escolha já feita para o destinatário cru do e-mail.
//
// 8 caracteres de um alfabeto de 31 dão ~8,5e11 combinações. O sorteio é
// uniforme: `randomInt` rejeita o resto em vez de enviesar o módulo, que com 31
// símbolos desperdiçaria 5 valores de cada 256.

export function generateInviteCode(): string {
  let code = ""
  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(0, INVITE_CODE_ALPHABET.length)]
  }
  return code
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

// O mesmo normalizador do banco para o e-mail convidado: `lower(trim(email))`.
export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function inviteCodeHash(code: string): string {
  // Reaproveita a normalização do módulo de vocabulário sem importar de lá o
  // que é só do navegador: a função é pura e não conhece `node:crypto`.
  return sha256Hex(
    code
      .normalize("NFKC")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ""),
  )
}

export function inviteEmailDigest(email: string): string {
  return sha256Hex(normalizeInviteEmail(email))
}

// O IP não é guardado: só o hash, e com prefixo de domínio para que o mesmo
// endereço, em outro contexto, não produza o mesmo digest.
export function inviteOriginDigest(origin: string | null | undefined): string {
  const value = origin?.trim()
  return sha256Hex(`bivaque-family-invite-origin:${value && value.length > 0 ? value : "unknown"}`)
}

// A primeira entrada de `x-forwarded-for` é a origem do cliente; o resto é
// cadeia de proxy e não identifica ninguém.
export function originFromForwardedFor(header: string | null | undefined): string | null {
  const first = header?.split(",")[0]?.trim()
  return first && first.length > 0 ? first : null
}
