import { Icone } from "@/components/bivaque/icone"
import type { ItemDaConversa } from "@/src/conversas/item"

/**
 * O item de que a conversa trata, no topo da conversa (REGUA-003): a foto, o
 * título e o preço do anúncio — ou o nome do negócio, ou do grupo em comum. Um
 * toque abre o item. Sem foto, um ícone do tipo ocupa o lugar dela.
 */
export function CabecaDoItem({
  item,
  icone,
  aoAbrir,
}: {
  readonly item: ItemDaConversa
  readonly icone: "sell" | "storefront" | "forum"
  readonly aoAbrir?: () => void
}) {
  const conteudo = (
    <>
      {item.foto ? (
        <img
          src={item.foto}
          alt=""
          className="size-12 shrink-0 rounded-xl bg-(--surface-low) object-cover"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-(--secondary-container)">
          <Icone nome={icone} className="size-5" />
        </span>
      )}
      <span className="grid min-w-0 grow gap-0.5">
        <b data-item-da-conversa="titulo" className="truncate text-sm">
          {item.titulo}
        </b>
        {item.preco === null ? null : (
          <span data-item-da-conversa="preco" className="text-sm text-(--on-surface-variant)">
            {item.preco}
          </span>
        )}
      </span>
      {aoAbrir === undefined ? null : (
        <Icone nome="chevron_right" className="size-5 shrink-0 text-(--on-surface-variant)" />
      )}
    </>
  )
  const classe =
    "flex min-h-16 w-full min-w-0 items-center gap-3 rounded-xl bg-(--surface-lowest) px-3 py-2 text-left ring-1 ring-(--outline-variant)"
  if (aoAbrir === undefined)
    return (
      <div data-cabeca-do-item="sim" className={classe}>
        {conteudo}
      </div>
    )
  return (
    <button
      type="button"
      data-cabeca-do-item="sim"
      className={`bv-press ${classe} hover:bg-(--surface-low)`}
      onClick={aoAbrir}
      aria-label={`Ver ${item.titulo}`}
    >
      {conteudo}
    </button>
  )
}
