import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import {
  createReport,
  listOwnReports,
  type ReportMutationError,
} from "../../../../lib/reports/reports"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TROCA-005 — as denúncias do PRÓPRIO membro pela porta do app (Ajuda).
//
// A validação e a gravação são as de `lib/reports`, chamadas também pela tela
// antiga: uma única regra de alvo visível, motivo fechado e duplicata. A RLS de
// `reports` devolve só as linhas do denunciante; o payload abaixo projeta
// apenas o que a pessoa já sabe — nunca `reporter_user_id`, nem o resultado
// interno da moderação. Assim a denúncia não identifica quem denunciou para
// ninguém, incluindo a pessoa denunciada.

const STATUS_DO_ERRO: Readonly<Record<ReportMutationError, number>> = {
  "sessao-expirada": 401,
  "motivo-invalido": 400,
  "alvo-invalido": 404,
  "explicacao-longa": 400,
  "ja-denunciado": 409,
  "proprio-conteudo": 403,
  recusado: 403,
  falha: 503,
}

const MENSAGENS: Readonly<Record<ReportMutationError, string>> = {
  "sessao-expirada": "Sua sessão expirou. Entre de novo para enviar.",
  "motivo-invalido": "Escolha um motivo da lista.",
  "alvo-invalido": "Este conteúdo não está mais disponível.",
  "explicacao-longa": "A explicação está longa demais. Encurte e tente de novo.",
  "ja-denunciado": "Você já denunciou este conteúdo. A denúncia anterior segue em análise.",
  "proprio-conteudo": "Você não pode denunciar o seu próprio conteúdo.",
  recusado: "Sua conta não pode denunciar este conteúdo.",
  falha: "Não foi possível enviar a denúncia agora. Tente novamente.",
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const denuncias = await listOwnReports(auth.sessao.cliente)
    return responder(request, { denuncias }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "dados-invalidos" }, 400)
  const tipo = lido.corpo["tipo"]
  const alvo = lido.corpo["alvo"]
  const motivo = lido.corpo["motivo"]
  const explicacao = lido.corpo["explicacao"] ?? ""
  if (
    typeof tipo !== "string" ||
    typeof alvo !== "string" ||
    typeof motivo !== "string" ||
    typeof explicacao !== "string"
  ) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  try {
    const resultado = await createReport(auth.sessao.cliente, {
      targetType: tipo,
      targetId: alvo,
      reason: motivo,
      explanation: explicacao,
    })
    if (resultado.ok) {
      return responder(request, { denuncia: { id: resultado.reportId } }, 201)
    }
    return responder(
      request,
      { erro: resultado.error, mensagem: MENSAGENS[resultado.error] },
      STATUS_DO_ERRO[resultado.error],
    )
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
