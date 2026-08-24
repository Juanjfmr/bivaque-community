// Serialização de digest sha256 para parâmetros `bytea` via PostgREST.
//
// O PostgREST converte um argumento JSON string em `bytea` usando a entrada
// escape-format do Postgres: um byte por caractere. Um digest hex "nu" (64
// chars) chega como 64 bytes e quebra todo contrato `octet_length = 32` —
// provado em runtime em 2026-08-23: create_community_invitation respondeu
// 'token_digest must be 32 bytes (sha256)' e create_family_invitation violou
// o CHECK com 23514. O prefixo `\x` troca o parser para hex-format: exatos
// 32 bytes.
export function byteaDigestParam(hexDigest: string): string {
  if (!/^[0-9a-f]{64}$/.test(hexDigest)) {
    throw new Error("digest must be 64 hex chars (sha256)")
  }
  return `\\x${hexDigest}`
}
