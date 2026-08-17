// P0 Task 5: validação do passo pós-elegibilidade, pura e testável.
//
// A localidade NUNCA é texto livre: é o ibge_code do catálogo canônico,
// validado no servidor antes de provisionar. As três negações distintas:
//   1. ausência / formato errado -> 400 "locality is required";
//   2. formato certo mas ausente do catálogo -> 400 "locality is unknown"
//      (validação de existência, não de formato);
//   3. nome ausente ou curto -> 400 "display_name is required".
// Nenhuma mensagem de erro de banco ecoa para o cliente.

export type ProvisionValidationError =
  | "locality is required"
  | "locality is unknown"
  | "display_name is required"

export interface ProvisionInput {
  ibgeCode?: string
  displayName?: string
}

export interface ProvisionValidationResult {
  ok: boolean
  error?: ProvisionValidationError
  ibgeCode?: string
  displayName?: string
}

export function validateProvisionInput(input: ProvisionInput): ProvisionValidationResult {
  const ibgeCode = typeof input.ibgeCode === "string" ? input.ibgeCode : ""
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : ""

  if (!/^[0-9]{7}$/.test(ibgeCode)) {
    return { ok: false, error: "locality is required" }
  }

  if (displayName.length < 2) {
    return { ok: false, error: "display_name is required" }
  }

  return { ok: true, ibgeCode, displayName }
}

// A existência no catálogo é validada pelo chamador (rota) contra a tabela;
// esta função separa formato de existência para o teste negativo ser possível.
export function isLocalityCodeFormat(value: string): boolean {
  return /^[0-9]{7}$/.test(value)
}
