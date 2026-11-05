import type { NextRequest, NextResponse } from "next/server"
import { avancarMarcador } from "../../../../../lib/app-api/marcador-da-entrada"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Etapa "interesses" da entrada pelo app (LAN-F01, ADR-20261102).
//
// A pessoa marca em quais grupos da própria cidade quer entrar; o conjunto é
// gravado em `user_group_interests` pelo RPC canônico
// `record_user_group_interests`, o mesmo que a web usa. O RPC substitui o
// conjunto inteiro e recusa grupo de outra cidade (42501), então a rota não
// reimplementa essa regra: passa a cidade do vínculo da SESSÃO e deixa o banco
// decidir.
//
// O dono da linha vem SEMPRE da sessão resolvida no servidor, nunca do corpo:
// `user_id` ou `locality_id` mandados pelo cliente são ignorados. A gravação usa
// o cliente de serviço com autorização explícita no código, porque
// `user_group_interests` não tem grant para o cliente (é tabela operacional, só
// escrita por RPC). A leitura da cidade também é escopada pelo id da sessão.

const CORPO_MAXIMO = 32 * 1024
const LIMITE_DE_GRUPOS = 20
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type GruposLidos = { readonly ok: true; readonly grupos: string[] } | { readonly ok: false }

/**
 * Lê a lista de grupos do corpo.
 *
 * Lista ausente, que não é array, com item que não é UUID ou com mais de 20
 * itens é recusa; a etapa oferece poucos grupos por vez, e o teto limita o
 * trabalho do banco. Duplicado não é erro: a pessoa pode marcar o mesmo grupo
 * por caminhos diferentes na tela, e a chave primária `(user_id, group_id)`
 * não aceitaria duas vezes o mesmo id na mesma gravação.
 */
function lerGrupos(bruto: unknown): GruposLidos {
  if (!Array.isArray(bruto) || bruto.length > LIMITE_DE_GRUPOS) return { ok: false }

  const grupos: string[] = []
  const vistos = new Set<string>()
  for (const item of bruto) {
    if (typeof item !== "string" || !UUID.test(item)) return { ok: false }
    // UUID não tem caixa: "AB..." e "ab..." são o mesmo grupo, e o Postgres
    // canoniza em minúsculas ao converter para `uuid`. Deduplicar assim evita
    // que a variante de caixa vire uma segunda linha na mesma gravação.
    const id = item.toLowerCase()
    if (vistos.has(id)) continue
    vistos.add(id)
    grupos.push(id)
  }
  return { ok: true, grupos }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403, sessao.sessao.cabecalhos)

  const lido = await lerCorpoJson(request, CORPO_MAXIMO)
  if (!lido.ok) {
    const erro = lido.status === 413 ? "grande-demais" : "corpo-invalido"
    return responder(request, { erro }, lido.status, sessao.sessao.cabecalhos)
  }

  const grupos = lerGrupos(lido.corpo["grupos"])
  if (!grupos.ok) {
    return responder(request, { erro: "grupos-invalidos" }, 400, sessao.sessao.cabecalhos)
  }

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  const userId = sessao.sessao.usuario.id
  // A cidade é a do vínculo já provisionado, lida pelo id da sessão: um
  // `locality_id` no corpo não escolhe a cidade de ninguém. Sem vínculo não há
  // cidade para escopar os interesses — a etapa anterior não terminou.
  const { data: vinculo, error: vinculoError } = await servico
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  if (vinculoError) {
    log.error("entry interests: locality read failed", { error: vinculoError.message })
    return responder(request, { erro: "indisponivel" }, 503, sessao.sessao.cabecalhos)
  }
  if (vinculo === null) {
    return responder(request, { erro: "sem-cidade" }, 409, sessao.sessao.cabecalhos)
  }

  const { error: gravacaoError } = await servico.rpc("record_user_group_interests", {
    p_user_id: userId,
    p_locality_id: vinculo.locality_id,
    p_group_ids: grupos.grupos,
  })
  if (gravacaoError) {
    // Mensagem fixa mais o erro do banco: os ids dos grupos não entram no log,
    // e a mensagem do banco nunca volta para o cliente.
    log.error("entry interests write failed", { error: gravacaoError.message })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  // A retomada precisa saber que interesses já foi feito: o marcador avança para
  // o combinado com o id da sessão.
  if (!(await avancarMarcador(servico, userId, "combinado"))) {
    log.error("entry interests: draft marker write failed", { userId })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  return responder(request, { ok: true, grupos: grupos.grupos }, 200, sessao.sessao.cabecalhos)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
