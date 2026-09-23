import Link from "next/link"

type AuthCallbackErrorPageProps = {
  searchParams: Promise<{ motivo?: string | string[] }>
}

export default async function AuthCallbackErrorPage({ searchParams }: AuthCallbackErrorPageProps) {
  const params = await searchParams
  const consentRetry = params.motivo === "consentimento"

  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="auth-error-heading">
        <h1 id="auth-error-heading" className="text-2xl font-semibold tracking-tight">
          {consentRetry ? "Conta criada, aceite pendente" : "Não foi possível entrar"}
        </h1>
        <p className="text-sm text-muted">
          {consentRetry
            ? "A conta foi criada, mas o aceite não foi registrado agora. Abra a confirmação para tentar novamente; nenhum texto da sua conta foi enviado a outra pessoa."
            : "O link de acesso é inválido ou expirou. Tente entrar novamente."}
        </p>
        <Link
          href={consentRetry ? "/auth/confirmar-email" : "/login"}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-accent px-4 text-center text-sm font-medium text-accent-foreground transition-colors duration-[var(--semantic-motion-duration-fast)] hover:bg-accent/90"
        >
          {consentRetry ? "Abrir confirmação" : "Voltar para o login"}
        </Link>
      </section>
    </div>
  )
}
