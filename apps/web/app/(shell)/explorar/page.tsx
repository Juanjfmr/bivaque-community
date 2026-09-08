import { PageHeader } from "../../components/bivaque/page-header"

// Scaffold do container "Explorar" da navegação nova (PROCESSO-DE-CONSTRUCAO §7).
// O corpo visual da prancha 61-web-explorar-servicos — busca acessível,
// resultados de serviços e entradas de Guia e Mercado — entra pelo contrato
// RECON-61-EXPLORAR-WEB (Task 5 do plano G0).
export default function ExplorarPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <PageHeader title="Explorar" />
      <p className="mt-4 text-sm text-muted">
        Busca de serviços e prestadores, com entradas para Guia e Mercado. Conteúdo em construção
        (prancha 61).
      </p>
    </div>
  )
}
