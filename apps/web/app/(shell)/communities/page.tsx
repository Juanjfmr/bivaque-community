import { redirect } from "next/navigation"
import { vilaRedirectFor } from "../../components/shell/vila-redirects"

// Vila não existe nesta versão do produto (ADR-20261023-comunidade-do-prototipo).
// Este endereço — e todos os da lista fechada de vila-redirects.ts — passa a
// levar à Comunidade da cidade. Nada é apagado no banco: a lista antiga de
// comunidades e o código das telas ficam no repositório até um ADR de remoção.

export default function CommunitiesPage() {
  redirect(vilaRedirectFor("/communities"))
}
