import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  exigirSessao,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Grupos da etapa de interesses da entrada (LAN-F01).
//
// Devolve os grupos PÚBLICOS da cidade da pessoa, para a tela escolher grupos
// de verdade em vez dos dados de demonstração. A cidade vem da sessão — o app
// não diz de qual cidade quer ver grupos —, então a leitura usa o cliente de
// serviço: o recorte é feito por um id que o pedido não controla.
//
// É leitura: não exige o cabeçalho do app (o CSRF é da escrita), mas responde
// com o CORS do contrato. Nenhum dado de grupo vai para o log; em falha, o log
// leva só a mensagem do banco e o id da sessão. Falha de leitura é 503, nunca
// lista vazia: um banco fora renderizado como "nenhum grupo" esconderia o erro
// no meio da entrada.

const LIMITE_DE_GRUPOS = 50

type GrupoDaEntrada = Readonly<{
  id: string
  nome: string
  descricao: string | null
}>

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  const userId = sessao.sessao.usuario.id

  // Quem ainda não tem vínculo com a cidade recebe a lista vazia: a etapa de
  // interesses só aparece depois de a cidade ser escolhida.
  const cidade = await servico
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (cidade.error) {
    log.error("entry groups: locality read failed", { error: cidade.error.message, userId })
    return responder(request, { erro: "leitura-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  if (cidade.data === null) {
    return responder(request, { autenticado: true, grupos: [] }, 200, sessao.sessao.cabecalhos)
  }

  // Só públicos: grupo privado não é sugestão para quem ainda não é membro, e
  // o nome de um grupo privado não pode virar interesse da entrada.
  const grupos = await servico
    .from("groups")
    .select("id, name, description")
    .eq("locality_id", cidade.data.locality_id)
    .eq("visibility", "public")
    .order("name", { ascending: true })
    .limit(LIMITE_DE_GRUPOS)

  if (grupos.error) {
    log.error("entry groups: groups read failed", { error: grupos.error.message, userId })
    return responder(request, { erro: "leitura-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  const lista: GrupoDaEntrada[] = (grupos.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.name,
    descricao: linha.description,
  }))

  return responder(request, { autenticado: true, grupos: lista }, 200, sessao.sessao.cabecalhos)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
