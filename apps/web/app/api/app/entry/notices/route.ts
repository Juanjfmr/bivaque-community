import type { NextRequest, NextResponse } from "next/server"
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

// Etapa "avisos" da entrada pelo app (LAN-F01, ADR-20261101 §3).
//
// A escolha é só uma: ativar os quatro tipos que a tabela canônica
// (`notification_preferences`) conhece, ou deixar para depois. O corpo é o
// enum, nunca colunas soltas: o dono da linha vem SEMPRE da sessão resolvida no
// servidor, e e-mail, telefone, push token e as demais colunas não passam por
// aqui — a preferência de e-mail tem o caminho dela.
//
// A gravação usa o cliente de serviço com autorização explícita no código, como
// o rascunho da entrada: a rota decide os quatro booleanos de uma vez, para a
// etapa não deixar a preferência pela metade.

const CORPO_MAXIMO = 4 * 1024

const AVISOS = ["ativados", "agora-nao"] as const
type Avisos = (typeof AVISOS)[number]

function ehAvisos(valor: unknown): valor is Avisos {
  return valor === "ativados" || valor === "agora-nao"
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

  const avisos = lido.corpo["avisos"]
  if (!ehAvisos(avisos)) {
    return responder(request, { erro: "avisos-invalidos" }, 400, sessao.sessao.cabecalhos)
  }

  // "ativados" liga os quatro tipos; "agora-nao" desliga os quatro. Nada de
  // mesclar com o estado anterior: a etapa vale por inteiro. A gravação usa o
  // cliente da sessão: a RLS da tabela já deixa o dono ler, inserir e atualizar
  // a própria linha.
  const ativados = avisos === "ativados"
  const userId = sessao.sessao.usuario.id
  const { error } = await sessao.sessao.cliente.from("notification_preferences").upsert(
    {
      user_id: userId,
      messages: ativados,
      comments: ativados,
      events: ativados,
      mentions: ativados,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) {
    log.error("entry notices: notification preferences write failed", {
      error: error.message,
      userId,
    })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  // O aviso é a última etapa: a entrada termina aqui, e o rascunho não fica
  // para trás. A tabela não tem escrita para o cliente — o ciclo de vida do
  // rascunho é da rota, com autorização explícita no código.
  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)
  const { error: limpezaError } = await servico
    .from("entry_progress")
    .delete()
    .eq("user_id", userId)
  if (limpezaError) {
    log.error("entry notices: draft cleanup failed", {
      error: limpezaError.message,
      userId,
    })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  return responder(request, { ok: true, avisos }, 200, sessao.sessao.cabecalhos)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
