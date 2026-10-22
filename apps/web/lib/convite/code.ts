// PORT-006 (lote 4 da entrada) — o vocabulário do código do convite
// (ADR-20261022-entrada-do-prototipo, item 2).
//
// Este arquivo é seguro para o navegador: nenhum import de `node:crypto`. A
// geração e o digest vivem em `./digest`, que é só do servidor. A separação
// existe porque a tela precisa normalizar o que a pessoa digitou antes de
// enviar, e importar `node:crypto` num componente cliente quebra o bundle.

export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const INVITE_CODE_LENGTH = 8
export const INVITE_CODE_VALID_DAYS = 7

// Texto do protótipo (`entry-invite-code` em login.js), palavra por palavra.
// Errado, vencido e já usado respondem isto — nada no texto separa os casos,
// porque separá-los transformaria o código num oráculo de convites.
export const INVITE_CODE_UNAVAILABLE =
  "Este convite não existe, venceu ou já foi usado. Peça um novo a quem convidou."
export const INVITE_CODE_RATE_LIMITED =
  "Muitas tentativas seguidas. Espere alguns minutos e tente de novo."
export const INVITE_CODE_FORMAT = `O código tem ${INVITE_CODE_LENGTH} caracteres, como 7K4M9QRT.`

// O alfabeto em maiúsculas e sem separadores é a forma canônica; é essa string
// que vira digest. Aceitar "abcd-1234" e "ABCD 1234" como o mesmo código não
// afrouxa nada: a entropia está nos caracteres, não na pontuação.
export function normalizeInviteCode(raw: string): string {
  return raw
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

export function isInviteCodeShape(code: string): boolean {
  if (code.length !== INVITE_CODE_LENGTH) return false
  return [...code].every((character) => INVITE_CODE_ALPHABET.includes(character))
}

type InviteError = Readonly<{ code?: string | null }>

// Tradução única de erro do banco para a tela. `54000` é o teto de tentativas
// (a casa usa esse código para limite); qualquer outro estado do convite cai
// na frase genérica, inclusive os erros que o banco devolve em inglês.
export function inviteMessageFor(error: InviteError): string {
  if (error.code === "54000") return INVITE_CODE_RATE_LIMITED
  return INVITE_CODE_UNAVAILABLE
}
