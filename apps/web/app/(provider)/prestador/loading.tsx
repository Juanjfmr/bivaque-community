export default function ProviderLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Orçamentos para você</h1>
      <div role="status" aria-live="polite" className="mt-6 space-y-3">
        <span className="sr-only">Carregando seus pedidos…</span>
        <div className="h-11 w-64 animate-pulse rounded-lg bg-[var(--semantic-surface)]" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--semantic-surface)]" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-[var(--semantic-surface)]" />
      </div>
    </div>
  )
}
