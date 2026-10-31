export type BusinessContactMode = "app" | "phone" | "whatsapp"

export interface BusinessDetails {
  neighborhood: string | null
  service_area: string | null
  opening_hours: string | null
  community_discount: string | null
  contact_mode: BusinessContactMode
  contact_phone: string | null
  contact_is_public: boolean
}

export const EMPTY_BUSINESS_DETAILS: BusinessDetails = {
  neighborhood: null,
  service_area: null,
  opening_hours: null,
  community_discount: null,
  contact_mode: "app",
  contact_phone: null,
  contact_is_public: false,
}

export const BUSINESS_DETAIL_LIMITS = {
  neighborhood: 80,
  service_area: 200,
  opening_hours: 300,
  community_discount: 300,
} as const

export function validateBusinessDetails(details: BusinessDetails): string | null {
  for (const [key, max] of Object.entries(BUSINESS_DETAIL_LIMITS)) {
    const value = details[key as keyof typeof BUSINESS_DETAIL_LIMITS]
    if (value && value.trim().length > max) return "Uma das informações excedeu o limite indicado."
  }
  if (!["app", "phone", "whatsapp"].includes(details.contact_mode)) {
    return "Escolha como as pessoas podem entrar em contato."
  }
  const phone = details.contact_phone?.trim()
  if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
    return "Informe um telefone com DDD, usando apenas números e o + opcional."
  }
  if (details.contact_is_public && (details.contact_mode === "app" || !phone)) {
    return "Para mostrar o contato, escolha telefone ou WhatsApp e informe o número."
  }
  return null
}
