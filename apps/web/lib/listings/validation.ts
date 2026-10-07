export function validatePropertyNumbers(values: Record<string, string>): string | null {
  for (const field of [
    "rent_reais",
    "condo_reais",
    "iptu_reais",
    "bedrooms",
    "bathrooms",
    "parking_spots",
    "area_m2",
  ]) {
    const raw = values[field]?.trim() ?? ""
    if (!raw) continue
    const value = Number(raw.replace(",", "."))
    if (!Number.isFinite(value) || value < 0 || value > 100_000_000)
      return "Informe valores numéricos válidos, sem valores negativos."
    if (
      ["bedrooms", "bathrooms", "parking_spots"].includes(field) &&
      (!Number.isInteger(value) || value > 100)
    )
      return "Quartos, banheiros e vagas precisam ser inteiros entre 0 e 100."
    if (field === "area_m2" && value <= 0) return "A área informada deve ser maior que zero."
  }
  const date = values["available_from"] ?? ""
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date)
  )
    return "Informe uma data válida."
  return null
}

export function numericFormValues(form: FormData): Record<string, string> {
  return Object.fromEntries(
    [
      "rent_reais",
      "condo_reais",
      "iptu_reais",
      "bedrooms",
      "bathrooms",
      "parking_spots",
      "area_m2",
      "available_from",
    ].map((key) => [key, String(form.get(key) ?? "")]),
  )
}
