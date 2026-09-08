import { PageHeader } from "../../components/bivaque/page-header"

// Scaffold do container "Início" da navegação nova (PROCESSO-DE-CONSTRUCAO §7).
// O corpo visual da prancha 01-web-inicio entra pelo contrato
// RECON-01-INICIO-WEB (Task 4 do plano G0).
export default function InicioPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <PageHeader title="Início" />
      <p className="mt-4 text-sm text-muted">
        Home de quem participa. Conteúdo em construção (prancha 01).
      </p>
    </div>
  )
}
