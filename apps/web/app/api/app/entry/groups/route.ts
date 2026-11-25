import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { type CidadeDaSessao, cidadeDaSessao } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Grupos da etapa de interesses da entrada (LAN-F01).
//
// Devolve os grupos PÚBLICOS da cidade da pessoa, para a tela escolher grupos
// de verdade em vez dos dados de demonstração. A cidade vem da sessão — o app
// não diz de qual cidade quer ver grupos — e a leitura usa o cliente da sessão,
// sob RLS: `locality_memberships` e a policy de `groups` já sabem quem é membro
// de qual cidade. Sem vínculo, a resposta é 409, nunca lista vazia (um cadastro
// que ainda não terminou não vira "nenhum grupo").
//
// É leitura: não exige o cabeçalho do app (o CSRF é da escrita), mas responde
// com o CORS do contrato. Nenhum dado de grupo vai para o log; em falha, o log
// leva só a mensagem do banco e o id da sessão. Falha de leitura é 503: um banco
// fora renderizado como "nenhum grupo" esconderia o erro no meio da entrada.

const LIMITE_DE_GRUPOS = 50

type GrupoDaEntrada = Readonly<{
  id: string
  nome: string
  descricao: string | null
}>

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const cliente = sessao.sessao.cliente
  const userId = sessao.sessao.usuario.id

  // Quem ainda não tem vínculo com a cidade não tem etapa de interesses. A
  // cidade é a `current` da sessão — quem está de mudança tem duas linhas e a
  // leitura sem o filtro pegava a que está deixando (BUG-CIDADE-GRUPOS).
  let cidade: CidadeDaSessao | null
  try {
    cidade = await cidadeDaSessao(cliente, userId)
  } catch (erro) {
    log.error("entry groups: locality read failed", {
      error: erro instanceof Error ? erro.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  if (cidade === null) {
    // Sem vínculo não há cidade para escopar grupos: a etapa de interesses só
    // existe depois do provisionamento confirmado. 409 é a resposta honesta —
    // lista vazia faria a tela dizer "nenhum grupo" para um cadastro que ainda
    // não terminou.
    return responder(request, { erro: "sem-cidade" }, 409, sessao.sessao.cabecalhos)
  }

  // Só públicos e não apagados: grupo privado não é sugestão para quem ainda
  // não é membro, e o nome de um grupo privado não pode virar interesse da
  // entrada. Grupo apagado sai da lista como sai da participação.
  const grupos = await cliente
    .from("groups")
    .select("id, name, description")
    .eq("locality_id", cidade.id)
    .eq("visibility", "public")
    .eq("is_deleted", false)
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
