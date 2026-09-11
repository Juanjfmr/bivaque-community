// Bio do perfil — a apresentação curta da prancha 51, contrato do
// ADR-20260909-perfil-bio (D1–D4).
//
// Este módulo é a face pura: o limite de 300 (o mesmo número do contador da
// prancha), a semântica de esvaziar (D3 — apagar apaga) e a varredura de
// conteúdo que a tela consegue antecipar. A fronteira real é o banco: a
// constraint de tamanho e a varredura da migration 20260911024732. O que a
// tela valida aqui é resposta imediata, nunca concessão — o servidor revalida.

import { detectCep, detectCpf } from "@bivaque/domain"

// D1: o teto do banco e o do contador da prancha são o mesmo número.
export const BIO_MAX_LENGTH = 300

// D2: a bio segue a visibilidade do perfil. Não existe "Exibir no perfil"
// próprio para ela — quem alcança o perfil lê a bio; por isso a tela não
// desenha um controle para isso e não promete um.
export const BIO_FIELD_LABEL = "Bio"

export function bioLength(raw: string): number {
  return raw.trim().length
}

// Campo opcional: vazio sempre passa. Quando preenchido, valem o limite e a
// mesma varredura de CPF/CEP que o repositório já aplica a texto de membro —
// os mesmos `detectCpf` / `detectCep` que a OM de afiliação usa.
export function validateBio(raw: string): string | null {
  const value = raw.trim()
  if (value.length > BIO_MAX_LENGTH) {
    return `A apresentação deve ter no máximo ${BIO_MAX_LENGTH} caracteres.`
  }
  if (detectCpf(value)) {
    return "A apresentação não pode conter um CPF."
  }
  if (detectCep(value)) {
    return "A apresentação não pode conter um CEP. Endereço não pertence a este campo."
  }
  return null
}

// D3: esvaziar grava nulo. Apagar apaga — não há valor oculto para religar.
export function normalizeBio(raw: string): string | null {
  const value = raw.trim()
  return value.length === 0 ? null : value
}

// O valor que voltou do banco é o estado: `null` (nunca informada ou apagada)
// vira campo vazio, sem inventar texto.
export function bioFromRow(value: string | null | undefined): string {
  return value ?? ""
}
