export default function OnboardingWelcomePage() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="welcome-heading">
        <h1 id="welcome-heading" className="text-2xl font-semibold tracking-tight">
          Bem-vindo à comunidade de Manaus
        </h1>

        <p className="text-sm text-muted">
          Você foi verificado. Comece por uma destas ações para se integrar à cidade.
        </p>

        <a
          href="/groups"
          className="flex flex-col gap-1 rounded-md border border-border p-4 transition-colors hover:bg-surface"
        >
          <h2 className="font-medium">Entrar em um grupo público</h2>
          <p className="text-sm text-muted">
            Grupos públicos são abertos a todos os membros verificados de Manaus.
          </p>
        </a>

        <a
          href="/recommendations"
          className="flex flex-col gap-1 rounded-md border border-border p-4 transition-colors hover:bg-surface"
        >
          <h2 className="font-medium">Ver recomendações</h2>
          <p className="text-sm text-muted">Indicações e pedidos de outros membros da cidade.</p>
        </a>

        <a
          href="/profile"
          className="flex flex-col gap-1 rounded-md border border-border p-4 transition-colors hover:bg-surface"
        >
          <h2 className="font-medium">Completar perfil</h2>
          <p className="text-sm text-muted">
            Defina nome, foto e visibilidade para outros membros te encontrarem.
          </p>
        </a>

        <a href="/community" className="text-center text-sm text-accent underline">
          Ir para a comunidade →
        </a>
      </section>
    </div>
  )
}
