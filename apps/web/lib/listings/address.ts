// Endereço do anúncio: OPCIONAL e por escolha de quem anuncia (decisão do dono,
// 25/09/2026; migration 20260925174442_endereco_por_escolha). Vazio é "não
// informar", nunca erro. Quando informado, é lido por quem lê o anúncio.

export const ADDRESS_MIN = 3
export const ADDRESS_MAX = 200

/** O aviso que acompanha o campo em todo formulário de anúncio. */
export const ADDRESS_HINT =
  "Opcional. Se preencher, o endereço aparece para quem vê o anúncio — inclusive quem consulta a sua cidade."

export type AddressResult = { ok: true; value: string | null } | { ok: false; error: string }

export function validateAddress(raw: string | null | undefined): AddressResult {
  const value = (raw ?? "").trim().replace(/\s+/g, " ")
  if (value.length === 0) return { ok: true, value: null }
  if (value.length < ADDRESS_MIN) return { ok: false, error: "O endereço está curto demais." }
  if (value.length > ADDRESS_MAX) {
    return { ok: false, error: `O endereço passa de ${ADDRESS_MAX} caracteres.` }
  }
  return { ok: true, value }
}
