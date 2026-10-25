import { TelaComunidade } from "@/components/bivaque/tela-comunidade"
import { abaDaComunidade } from "@/lib/navegacao"

// A aba (Indicações ou Grupos) sai do endereço: `?aba=grupos`.
export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const valor = params["aba"]
  const aba = abaDaComunidade(Array.isArray(valor) ? valor[0] : valor)
  return <TelaComunidade aba={aba} />
}
