import Link from "next/link"

export default function AuthCallbackErrorPage() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="auth-error-heading">
        <h1 id="auth-error-heading" className="text-2xl font-semibold tracking-tight">
          Não foi possível entrar
        </h1>
        <p className="text-sm text-muted">
          O link de acesso é inválido ou expirou. Tente entrar novamente.
        </p>
        <Link
          href="/login"
          className="rounded-md border border-border bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Voltar para o login
        </Link>
      </section>
    </div>
  )
}
