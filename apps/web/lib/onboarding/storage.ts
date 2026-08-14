export const ONBOARDING_CPF_KEY = "onboarding:cpf"

export function purgeCpfResidue(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(ONBOARDING_CPF_KEY)
}
