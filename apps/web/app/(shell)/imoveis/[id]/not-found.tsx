import Link from "next/link"
import { EmptyState } from "../../../components/bivaque/empty-state"

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <EmptyState
        title="Imóvel não encontrado"
        description="O anúncio não existe ou não está disponível para a sua conta."
        action={
          <Link
            href="/imoveis"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium underline"
          >
            Voltar para a busca de imóveis
          </Link>
        }
      />
    </div>
  )
}
