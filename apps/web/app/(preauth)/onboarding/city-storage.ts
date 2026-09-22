// A escolha de cidade entre o passo Cidade e o passo Perfil do contexto
// (prancha 39) mora no sessionStorage: é rascunho de navegação, descartável,
// nunca dado sensível. O módulo é puro quanto à leitura/escrita para poder
// ser provado sem DOM.

export const CITY_STORAGE_KEY = "onboarding:city"

export type StoredCity = {
  cityName: string
  ibgeCode: string
  id: string
  stateCode: string
}

export function parseStoredCity(raw: string | null): StoredCity | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredCity>
    if (
      typeof parsed.id === "string" &&
      typeof parsed.ibgeCode === "string" &&
      typeof parsed.cityName === "string" &&
      typeof parsed.stateCode === "string"
    ) {
      return {
        id: parsed.id,
        ibgeCode: parsed.ibgeCode,
        cityName: parsed.cityName,
        stateCode: parsed.stateCode,
      }
    }
    return null
  } catch {
    return null
  }
}

type ReadableStorage = Pick<Storage, "getItem">
type WritableStorage = Pick<Storage, "setItem">

export function readStoredCity(storage: ReadableStorage): StoredCity | null {
  return parseStoredCity(storage.getItem(CITY_STORAGE_KEY))
}

export function writeStoredCity(storage: WritableStorage, city: StoredCity): void {
  storage.setItem(CITY_STORAGE_KEY, JSON.stringify(city))
}
