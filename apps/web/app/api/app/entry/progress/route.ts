import type { NextRequest, NextResponse } from "next/server"
import type { Json } from "supabase/database.generated"
import {
  type Progresso,
  progressoFinal,
  progressoInicial,
  validarProgresso,
} from "../../../../../lib/app-api/entry-progresso"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Rascunho da entrada (LAN-F01, ADR-20261102-progresso-da-entrada).
//
// GET  — devolve o rascunho da sessão (ou o progresso inicial), lido com o
//        cliente do usuário: a RLS de `entry_progress` só deixa o dono ler. Quem
//        já tem vínculo com a cidade termina a entrada: o destino vem do estado
//        canônico (o vínculo), nunca do rascunho, e é a etapa final.
// PUT  — grava o rascunho da sessão. A tabela não tem grant nem policy de
//        escrita, então a gravação usa o cliente de serviço com autorização
//        explícita no código; o `user_id` vem SEMPRE da sessão resolvida no
//        servidor, nunca do corpo. É a única rota que escreve essa tabela.

const CORPO_MAXIMO = 32 * 1024

function lerProgresso(linha: unknown): Progresso {
  const validado = validarProgresso(linha)
  // Linha de versão antiga ou fora da forma não vira erro de tela: devolve o
  // progresso inicial, e a pessoa recomeça da porta.
  return validado.ok ? validado.progresso : progressoInicial()
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  // O cliente do usuário carrega o JWT da sessão; as duas leituras passam pela
  // RLS (rascunho e vínculo próprios).
  const userId = sessao.sessao.usuario.id
  const [rascunho, vinculo] = await Promise.all([
    sessao.sessao.cliente
      .from("entry_progress")
      .select("versao, etapa, estado")
      .eq("user_id", userId)
      .maybeSingle(),
    sessao.sessao.cliente
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ])

  if (rascunho.error || vinculo.error) {
    return responder(request, { autenticado: true, erro: "leitura-indisponivel" }, 503, {
      ...sessao.sessao.cabecalhos,
    })
  }

  // ADR-20261101 §1: o servidor decide o destino pelo estado canônico. Com
  // vínculo, a entrada acabou — um rascunho que sobrou (linha antiga, falha de
  // limpeza) não pode mandar a pessoa de volta para a porta.
  const progresso =
    vinculo.data !== null
      ? progressoFinal()
      : rascunho.data === null
        ? progressoInicial()
        : lerProgresso(rascunho.data)

  // O provedor da sessão: quem entrou pelo Google não passa pela porta de
  // e-mail de novo. É `app_metadata.provider` do GoTrue, não algo do rascunho.
  const provedorBruto = sessao.sessao.usuario.appMetadata?.["provider"]
  const provedor =
    provedorBruto === "google" || provedorBruto === "email" ? provedorBruto : undefined

  return responder(
    request,
    {
      autenticado: true,
      via: sessao.sessao.via,
      ...(provedor === undefined ? {} : { provedor }),
      progresso,
    },
    200,
    sessao.sessao.cabecalhos,
  )
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403, sessao.sessao.cabecalhos)

  let bruto: unknown
  try {
    const texto = await request.text()
    if (texto.length > CORPO_MAXIMO) {
      return responder(request, { erro: "grande-demais" }, 413, sessao.sessao.cabecalhos)
    }
    bruto = JSON.parse(texto)
  } catch {
    return responder(request, { erro: "corpo-invalido" }, 400, sessao.sessao.cabecalhos)
  }

  const validado = validarProgresso(bruto)
  if (!validado.ok) {
    return responder(request, { erro: validado.motivo }, 400, sessao.sessao.cabecalhos)
  }

  // Cliente de serviço com autorização explícita: `entry_progress` não tem
  // grant de escrita para o cliente, e o dono da linha vem da sessão — se
  // chegasse do corpo, qualquer pessoa gravaria o rascunho de outra.
  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)
  const { error } = await servico.from("entry_progress").upsert(
    {
      user_id: sessao.sessao.usuario.id,
      versao: validado.progresso.versao,
      etapa: validado.progresso.etapa,
      estado: validado.progresso.estado as unknown as Json,
    },
    { onConflict: "user_id" },
  )

  if (error) {
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.sessao.cabecalhos)
  }

  return responder(
    request,
    { ok: true, progresso: validado.progresso },
    200,
    sessao.sessao.cabecalhos,
  )
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
