import { Skeleton } from "../../components/bivaque/skeleton"

// Espelha a caixa da fila (título, abas, busca, tabela) para que nada desloque
// quando o carregamento terminar (DESIGN_SYSTEM §2: skeleton com a caixa do
// componente real).
export default function AdmissionsLoading() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-11 w-full max-w-xl rounded-lg" />
      <div
        role="status"
        aria-label="Carregando fila de admissões"
        className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        {["linha-1", "linha-2", "linha-3", "linha-4"].map((rowKey) => (
          <div key={rowKey} className="flex items-center gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-11 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  )
}
