import type { Page } from "@playwright/test"

// PORT-004 (frente B): a tela de CPF só aparece para quem não tem situação de
// elegibilidade e não é membro de localidade. O seed não tem essa persona: a
// conta visual@ é verificada e membro (vai para a comunidade), a
// verified-no-membership@ vai para a cidade e a rejected@ vê o resultado. Para
// provar o desenho da tela nos specs de leitura — sem criar conta, que é o que
// a jornada faz — a resposta do leitor de situação é fixada no transporte, com
// o mesmo corpo que a rota devolveria. O caminho real, com a rota de verdade,
// continua provado em journey-entrar-e-ser-admitido.spec.ts.
export type StubbedStatus = null | "pending" | "rejected" | "temporary_error" | "verified"

export async function stubVerificationStatus(
  page: Page,
  status: StubbedStatus,
  localityMember = false,
): Promise<void> {
  await page.route("**/api/onboarding/status", (route) =>
    route.fulfill({
      body: JSON.stringify({ localityMember, status }),
      contentType: "application/json",
    }),
  )
}
