import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { vilaRedirectFor } from "../../../../components/shell/vila-redirects"

// O console da vila sai da tela (ADR-20261023-comunidade-do-prototipo, "Navegação
// e estrutura"): a lista fechada de vila-redirects.ts manda todo o console para a
// Comunidade da cidade. O layout redireciona ANTES de resolver a vila, o
// moderador ou o dono — nenhuma leitura de vila acontece aqui. As páginas filhas
// e as ações seguem no repositório, sem rota, e nada é apagado no banco.

export default function CommunityAdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  void children
  redirect(vilaRedirectFor("/communities/[id]/admin"))
}
