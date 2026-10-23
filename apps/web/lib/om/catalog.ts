// Public institutional directory derived from official-source snapshots.
// Never use an OM selection as proof of a user's posting or affiliation.
// The directory intentionally contains no coordinates or personnel data.
import catalog from "./catalog.json"

export interface MilitaryOrganizationOption {
  id: string
  force: "FAB" | "EB" | "MB"
  name: string
  acronym: string
  city: string
  uf: string
}

const entries = catalog as MilitaryOrganizationOption[]

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
}

export function listOrganizationsByCity(city: string, stateCode: string) {
  const expected = fold(city)
  const uf = stateCode.toUpperCase()
  return entries.filter((entry) => entry.uf === uf && fold(entry.city) === expected)
}

/** Resolve IDs only in the user's currently selected city; no global OM enumeration. */
export function findOrganizationInCity(id: string, city: string, stateCode: string) {
  return listOrganizationsByCity(city, stateCode).find((entry) => entry.id === id) ?? null
}
