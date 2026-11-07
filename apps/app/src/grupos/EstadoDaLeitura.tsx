import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { FalhaDaApi } from "@/lib/api/cliente"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

export function EstadoDaLeitura({ erro, aoTentar }: { erro: unknown; aoTentar: () => void }) {
  if (erro instanceof FalhaDaApi) {
    if (erro.status === 401) return <EstadoDeSessaoVencida />
    if (erro.status === 403) return <EstadoNegado texto="Sua conta não tem acesso a este grupo." />
    if (erro.status === 404) return <TelaIndisponivel />
  }
  return <EstadoDeErro aoTentar={aoTentar} />
}
