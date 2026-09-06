// apps/mobile/src/auth/entry-mode.ts
// Contrato do modo de entrada, separado da tela para poder ser testado puro.
//
// São dois destinos distintos, não abas de um formulário: quem já tem conta
// retorna, quem não tem cria. A distinção existe porque o passo seguinte
// difere (`shouldCreateUser` do OTP, mensagem de erro e admissão), e porque a
// pessoa precisa saber em qual caminho entrou — PROCESSO-DE-CONSTRUCAO §12.3.

export const ENTRY_MODES = ["entrar", "criar-conta"] as const

export type EntryMode = (typeof ENTRY_MODES)[number]

export const DEFAULT_ENTRY_MODE: EntryMode = "entrar"

// O parâmetro chega do expo-router como `string | string[] | undefined`.
// Valor desconhecido não derruba a tela: cai no retorno, que é o caminho
// menos destrutivo (não cria conta por engano).
export function parseEntryMode(value: unknown): EntryMode {
  const raw = Array.isArray(value) ? value[0] : value
  return ENTRY_MODES.includes(raw as EntryMode) ? (raw as EntryMode) : DEFAULT_ENTRY_MODE
}

interface EntryCopy {
  title: string
  description: string
  fieldLabel: string
  submit: string
}

const COPY: Record<EntryMode, EntryCopy> = {
  entrar: {
    title: "Entre no Bivaque",
    description: "Use o e-mail com que você já participa. Sem senha para lembrar.",
    fieldLabel: "Seu e-mail",
    submit: "Receber link para entrar",
  },
  "criar-conta": {
    title: "Comece pelo seu e-mail",
    description: "Ele será sua forma de entrar. Depois vêm as regras e a sua localidade.",
    fieldLabel: "Seu e-mail",
    submit: "Criar conta e continuar",
  },
}

export function entryCopy(mode: EntryMode): EntryCopy {
  return COPY[mode]
}

// Validação local do endereço: serve para habilitar o próximo passo e dar
// retorno imediato, nunca para afirmar que o e-mail existe. Confirmação de
// controle do endereço é o passo seguinte do fluxo (§8).
export function isPlausibleEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length < 6 || trimmed.length > 254) return false
  if (/\s/.test(trimmed)) return false
  const at = trimmed.indexOf("@")
  if (at < 1 || at !== trimmed.lastIndexOf("@")) return false
  const domain = trimmed.slice(at + 1)
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".")
}
