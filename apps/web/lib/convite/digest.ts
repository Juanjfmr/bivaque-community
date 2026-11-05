import { createHash, createHmac, randomInt } from "node:crypto"
import { normalizarIp } from "../app-api/entrada-limite"
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

// A origem do convite é o IP confiável (o que a plataforma escreve), reduzido
// ao /64 quando IPv6 e hasheado com HMAC-SHA256 do mesmo segredo do limitador.
// O banco guarda só o digest: um dump não devolve IP nenhum, e a mesma origem em
// outro contexto não produz o mesmo valor (prefixo `convite:`).
const SEGREDO_DE_DESENVOLVIMENTO = "bivaque-entrada-desenvolvimento"

function segredoDaOrigem(): string {
  const configurado = process.env["BIVAQUE_LIMITER_PEPPER"]
  if (configurado !== undefined && configurado.trim() !== "") return configurado
  if (process.env.NODE_ENV === "production") {
    throw new Error("BIVAQUE_LIMITER_PEPPER is required in production")
  }
  return SEGREDO_DE_DESENVOLVIMENTO
}

export function inviteOriginDigest(ip: string | null | undefined): string {
  const normalizado =
    ip !== null && ip !== undefined && ip.trim() !== "" ? normalizarIp(ip.trim()) : "desconhecido"
  return createHmac("sha256", segredoDaOrigem())
    .update(`bivaque-family-invite-origin:${normalizado}`)
    .digest("hex")
}
