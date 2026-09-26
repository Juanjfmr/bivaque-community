import type { Route } from "next"
import Link from "next/link"
import PrestadorCatalogoPage from "../../../(provider)/prestador/catalogo/page"

export default function BusinessCatalogPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
      <Link
        href={"/negocio" as Route}
        className="inline-flex h-11 items-center rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors duration-150 hover:bg-ui-subtle"
      >
        Voltar para seu negócio
      </Link>
      <PrestadorCatalogoPage businessPage />
    </div>
  )
}
