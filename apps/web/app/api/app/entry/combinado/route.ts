import { CODE_OF_CONDUCT_VERSION } from "@bivaque/domain"
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

// O "combinado" da entrada (LAN-F01, ADR-20261101-entrada-unica-por-codigo §3 e
// emenda de 04/11): a pessoa vê as quatro regras de convivência depois da prévia
// da cidade e confirma. Não é um segundo aceite jurídico — o aceite é a etapa
// anterior, em consent_acceptances — e por isso a tabela é própria
// (entry_commitments), com a versão do Código de Conduta que estava na tela.
//
// O corpo carrega só a versão exibida, e ela precisa ser a do contrato
// compartilhado: o servidor não aceita versão antiga escolhida pelo cliente nem
// a identidade de quem grava. O autor é o id da SESSÃO; a linha é uma por pessoa
// (upsert por user_id) e a tabela não tem grant de escrita para cliente, então a
// gravação usa o cliente de serviço.

const CORPO_MAXIMO = 4 * 1024

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

  const versao = lido.corpo["versao"]
  if (
    typeof versao !== "number" ||
    !Number.isInteger(versao) ||
    versao !== CODE_OF_CONDUCT_VERSION
  ) {
    return responder(request, { erro: "versao-invalida" }, 400, sessao.sessao.cabecalhos)
  }

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  const userId = sessao.sessao.usuario.id
  const { error } = await servico
    .from("entry_commitments")
    .upsert({ user_id: userId, versao: CODE_OF_CONDUCT_VERSION }, { onConflict: "user_id" })

  if (error) {
    log.error("entry commitment record failed", { error: error.message, userId })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  // O combinado foi aceito: a retomada segue para os avisos, não de volta aos
  // interesses.
  if (!(await avancarMarcador(servico, userId, "avisos"))) {
    log.error("entry commitment: draft marker write failed", { userId })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  return responder(
    request,
    { ok: true, versao: CODE_OF_CONDUCT_VERSION },
    200,
    sessao.sessao.cabecalhos,
  )
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
