import { Icone } from "@/components/bivaque/icone"
import type { OrigemDaConversa } from "@/lib/contexto-conversa"

export function ContextoDaConversa({
  origem,
  aoAbrir,
  compacto = false,
}: {
  readonly origem: OrigemDaConversa
  readonly aoAbrir?: () => void
  readonly compacto?: boolean
}) {
  const conteudo = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--secondary-container)">
        <Icone
          nome={
            origem.tipo === "negocio" ? "storefront" : origem.tipo === "anuncio" ? "sell" : "forum"
          }
          className="size-5"
        />
      </span>
      <span className="grid min-w-0 grow gap-0.5">
        <small className="text-[11px] leading-4 text-(--on-surface-variant)">
          {origem.detalhe}
        </small>
        <b className={compacto ? "truncate text-[13px]" : "break-words text-sm"}>{origem.titulo}</b>
      </span>
      {aoAbrir === undefined ? null : (
        <Icone nome="chevron_right" className="size-5 shrink-0 text-(--on-surface-variant)" />
      )}
    </>
  )
  const classe =
    "flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl bg-(--surface-lowest) px-3 py-2 text-left ring-1 ring-(--outline-variant)"
  if (!aoAbrir)
    return (
      <div data-contexto-conversa="informativo" className={classe}>
        {conteudo}
      </div>
    )
  return (
    <button
      type="button"
      data-contexto-conversa={origem.tipo}
      className={`bv-press ${classe} hover:bg-(--surface-low)`}
      onClick={aoAbrir}
      aria-label={`Ver origem: ${origem.titulo}`}
    >
      {conteudo}
    </button>
  )
}
