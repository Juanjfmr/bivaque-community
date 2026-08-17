// P0 Task 4: the post-eligibility step route. The full screen (UF -> city
// picker, confirmed name) lands here in P0 Task 5. Until then, a member who
// is verified but has no membership yet must NOT reach the feed: the gate in
// /onboarding/status sends them here, and this placeholder holds the
// invariant without looping back. It never renders content that pretends a
// choice was made — the Task 5 screen replaces it.

export const runtime = "nodejs"

export default function OnboardingLocalityPage() {
  // Sem usuário autenticado o middleware já redireciona para o consent/login.
  // Aqui só exibimos o estado intermediário: elegível, localidade a escolher.
  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-4" aria-labelledby="locality-heading">
        <h1 id="locality-heading" className="text-2xl font-semibold tracking-tight">
          Escolha sua localidade
        </h1>
        <p className="text-sm text-muted">
          Sua elegibilidade foi confirmada. O próximo passo escolhe a sua localidade — esse passo
          ainda está em construção.
        </p>
        <a href="/onboarding/status" className="text-sm underline">
          Voltar para o status
        </a>
      </section>
    </div>
  )
}
