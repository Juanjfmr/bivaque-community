import { createServerClient } from "@supabase/ssr"
import { RefreshCw, X } from "lucide-react"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { FeedbackAlert } from "../../../app/components/bivaque/feedback-alert"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// Onda T Task 5, Step 2 — o console do fundador enxerga.
//
// Substitui o painel de demanda que morreu com a waitlist geográfica (P0
// Task 8, Step 3): volume de transferências declaradas e ainda não
// degradadas, por localidade de destino. É o dado que decide para onde a
// operação vai em seguida. list_locality_arrivals_volume (20260820051230) é
// operator-only e não expõe nada além de nome da cidade e contagem.
export const dynamic = "force-dynamic"

interface ArrivalVolumeRow {
  locality_id: string
  city_name: string
  arrivals_count: number
}

export default async function AdminArrivalsPage() {
  // The (admin) layout already gated this render on is_current_user_operator
  // for the session's own user, but the RPC re-checks with an explicit id —
  // service_role carries no auth.uid() of its own, so the caller must be
  // read from the session's cookies here, the same way the layout did.
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server component, no writes.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return null
  }

  const serviceClient = createServiceClient()
  const { data: volumeData, error } = await serviceClient.rpc("list_locality_arrivals_volume", {
    p_user_id: user.id,
  })

  if (error) {
    throw new Error(`Falha ao ler o volume de chegadas: ${error.message}`)
  }

  const volume = (volumeData as ArrivalVolumeRow[] | null) ?? []

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="arrivals-heading"
    >
      <h1 id="arrivals-heading" className="text-2xl font-semibold tracking-tight">
        Chegadas declaradas
      </h1>
      <p className="text-sm text-muted">
        Transferências declaradas e ainda ativas, por cidade de destino — quem está a caminho, não
        quem já mora lá.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs text-muted">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--semantic-action-primary)]"
          />
          Janela: chegadas ativas neste momento
        </span>
        <span className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs text-muted">
          Origem dos dados: list_locality_arrivals_volume
        </span>
        <Link
          href={"/arrivals" as Route}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)]"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </Link>
      </div>

      {volume.length === 0 ? (
        <>
          <div className="flex flex-col items-center gap-4 rounded-md border border-border p-10 text-center">
            <span
              aria-hidden="true"
              className="grid h-12 w-12 place-items-center rounded-full bg-[var(--semantic-selected)]"
            >
              <X size={20} className="text-muted" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">
              Nenhuma transferência declarada no momento
            </h2>
            <p className="max-w-md text-sm text-muted">
              A RPC list_locality_arrivals_volume devolveu uma lista vazia. Sem chegadas ativas em
              nenhuma cidade, este painel não tem o que mostrar — e isso não é erro, é o estado
              real.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={"/arrivals" as Route}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)]"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Atualizar agora
              </Link>
              <Link
                href="/admissions"
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)]"
              >
                Voltar para Admissões
              </Link>
              <Link
                href="/admissions"
                className="inline-flex min-h-11 items-center rounded-md bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors hover:bg-[var(--semantic-action-primary-hover)]"
              >
                Abrir Admissões
              </Link>
            </div>
          </div>
          <FeedbackAlert
            variant="warning"
            title="Estado vazio honesto."
            description="A tela não inventa volume para preencher colunas nem promete ação por linha que ainda não existe. Quando chegar o destino de cada chegada (abrir pedido, mudar janela, ver histórico), a prancha é refeita — sem prazo declarado."
          />
        </>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--semantic-selected)] text-left text-xs text-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                Cidade de destino
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Chegadas
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Próximo passo
              </th>
            </tr>
          </thead>
          <tbody>
            {volume.map((row, index) => (
              <tr key={row.locality_id} className="border-b border-border">
                <td className="px-4 py-3">
                  <span className="mr-3 text-xs text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{row.city_name}</span>
                </td>
                <td className="px-4 py-3 text-muted">
                  {row.arrivals_count} {row.arrivals_count === 1 ? "chegada" : "chegadas"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">sem ação por linha hoje</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {volume.length > 0 && (
        <FeedbackAlert
          variant="warning"
          title="Lacuna encontrada pela análise de chegabilidade."
          description="A página atual é apenas leitura: mostra volume por cidade, mas não abre a chegada, não filtra por janela nem permite ações operacionais por linha. Quando a página ganhar destino próprio, ele aparece aqui — NÃO declarar prazo de entrega."
        />
      )}

      <p className="text-xs text-muted">
        A página inteira é read-only. O RPC é operator-only e respeita a RLS do painel do operador:
        nenhum dado pessoal cru sai daqui.
      </p>
    </section>
  )
}
