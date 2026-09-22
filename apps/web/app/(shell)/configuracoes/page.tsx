import { redirect } from "next/navigation"

// A prancha 52 abre pela seção de Notificações. O índice real é a coluna
// vertical do layout; esta rota só encaminha para a primeira seção.
export default function ConfiguracoesPage() {
  redirect("/configuracoes/notificacoes")
}
