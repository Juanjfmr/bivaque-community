import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { FalhaDaApi } from "@/lib/api/cliente"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

export function FalhaDaLeitura({ falha, aoTentar }: { falha: unknown; aoTentar: () => void }) {
  if (falha instanceof FalhaDaApi) {
    if (falha.codigo === "sem-sessao") return <EstadoDeSessaoVencida />
    if (falha.codigo === "recusado")
      return <EstadoNegado texto="Sua conta não tem acesso a este conteúdo." />
    if (falha.codigo === "nao-encontrado") return <TelaIndisponivel />
  }
  return <EstadoDeErro aoTentar={aoTentar} />
}
