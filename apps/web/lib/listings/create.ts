import { validateNewListing } from "./catalog"

export function lerNovoDesapego(corpo: Record<string, unknown>, localityId: string) {
  const campos = ["titulo", "bairro", "preco", "descricao", "categoria", "condicao"] as const
  if (campos.some((campo) => typeof corpo[campo] !== "string")) return null
  const resultado = validateNewListing({
    title: String(corpo["titulo"]),
    neighborhood: String(corpo["bairro"]),
    priceInput: String(corpo["preco"]),
    description: String(corpo["descricao"]),
    category: String(corpo["categoria"]),
    condition: String(corpo["condicao"]),
    address: "",
    audienceType: "locality",
    localityId,
    communityId: null,
    photoCount: corpo["foto"] === null || corpo["foto"] === undefined ? 0 : 1,
  })
  return resultado.ok ? resultado.value : null
}
