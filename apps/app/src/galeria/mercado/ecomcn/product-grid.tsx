// Adaptado de ecomcn (MIT): slot de cartão obrigatório; sem compras, variantes ou dependências extras.
import type { HTMLAttributes, ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ProductGrid<T extends { id: string }>({
  products,
  loading,
  renderCard,
  empty,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  products: T[]
  loading?: boolean
  renderCard: (product: T) => ReactNode
  empty: ReactNode
}) {
  const grid = cn("grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3", className)
  if (loading) {
    return (
      <div className={grid} aria-busy="true" data-slot="product-grid" {...props}>
        {["a", "b", "c", "d"].map((id) => (
          <div key={id} aria-hidden>
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
        <span className="sr-only">Carregando anúncios</span>
      </div>
    )
  }
  if (products.length === 0) return empty
  return (
    <div className={grid} data-slot="product-grid" {...props}>
      {products.map((product) => (
        <div key={product.id}>{renderCard(product)}</div>
      ))}
    </div>
  )
}
