import { assetUrl } from "@/lib/assets"
import type { Anuncio } from "@/lib/dados/contrato"
import { normalizar } from "@/lib/texto"
import { registro, texto } from "@/src/telas/comum"
import { type FilterState, getValues } from "./ecomcn/filter-params"

export function apresentar(anuncio: Anuncio) {
  const visual = registro(anuncio.apresentacao)
  return {
    ...anuncio,
    imagem: assetUrl(texto(visual["imagem"])),
    vendedor: texto(visual["seller"], "Membro da comunidade"),
    tipo: anuncio.kind === "property" ? "imoveis" : "desapegos",
  }
}

export type AnuncioVisual = ReturnType<typeof apresentar>

export function filtrarAnuncios(
  anuncios: AnuncioVisual[],
  tipo: string,
  consulta: string,
  filtros: FilterState,
) {
  const bairros = getValues(filtros, "bairro")
  const precos = getValues(filtros, "preco")
  return anuncios.filter((anuncio) => {
    const preco = (anuncio.price_cents ?? 0) / 100
    return (
      anuncio.tipo === tipo &&
      normalizar(`${anuncio.title} ${anuncio.description ?? ""}`).includes(
        normalizar(consulta.trim()),
      ) &&
      (bairros.length === 0 || bairros.includes(anuncio.neighborhood ?? "")) &&
      (precos.length === 0 ||
        precos.some((faixa) =>
          faixa === "ate500"
            ? preco <= 500
            : faixa === "ate1500"
              ? preco > 500 && preco <= 1500
              : preco > 1500,
        ))
    )
  })
}
