import { assetUrl } from "@/lib/assets"
import { cn } from "@/lib/utils"
import { Etiqueta } from "./etiqueta"
import { Icone } from "./icone"

/**
 * A capa 16/9 (inventário §7, `shell/primitives.js`: `cover`).
 *
 * O protótipo resolve a imagem por chave (`image(ref)`), mostra o rótulo como
 * pílula quando existe e cai num fundo com ícone quando não há foto. O mapa de
 * assets é dado de demonstração (onda 1d); sem ele, a capa mostra o fallback —
 * que é o comportamento do protótipo para uma chave inexistente.
 */
export function Capa({
  fonte,
  alt,
  rotulo,
  icone,
  className,
}: {
  fonte?: string | null | undefined
  alt: string
  rotulo?: string | undefined
  icone?: React.ComponentProps<typeof Icone>["nome"] | undefined
  className?: string
}) {
  const url = assetUrl(fonte)
  return (
    <div
      data-capa="foto"
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-(--surface-container)",
        className,
      )}
    >
      {url === "" ? (
        <span
          data-capa="vazio"
          className="grid h-full w-full place-items-center text-(--on-surface-variant)"
        >
          <Icone nome={icone ?? "photo_camera"} className="size-8" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- asset embutido, sem otimizador no Vite
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      )}
      {rotulo === undefined ? null : (
        <span className="absolute top-2 left-2">
          <Etiqueta tom="neutro">{rotulo}</Etiqueta>
        </span>
      )}
    </div>
  )
}
