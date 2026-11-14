import { redirect } from "next/navigation"

// O índice de configurações abre na única seção web que permanece: Conta.
export default function ConfiguracoesPage() {
  redirect("/configuracoes/conta")
}
