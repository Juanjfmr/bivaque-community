import { type NextRequest, NextResponse } from "next/server"
import type { Json } from "supabase/database.generated"
import {
  avaliarEscrita,
  cabecalhosDeCors,
  cabecalhosDePreflight,
} from "../../../../../lib/app-api/contrato"
import {
  type Progresso,
  progressoInicial,
  validarProgresso,
} from "../../../../../lib/app-api/entry-progresso"
import { resolverSessaoDaRequisicao } from "../../../../../lib/app-api/sessao-do-next"
import { createServerClient as criarClienteDeServico } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Rascunho da entrada (LAN-F01, ADR-20261102-progresso-da-entrada).
//
// GET  â€” devolve o rascunho da sessÃ£o (ou o progresso inicial), lido com o
//        cliente do usuÃ¡rio: a RLS de `entry_progress` sÃ³ deixa o dono ler.
// PUT  â€” grava o rascunho da sessÃ£o. A tabela nÃ£o tem grant nem policy de
//        escrita, entÃ£o a gravaÃ§Ã£o usa o cliente de serviÃ§o com autorizaÃ§Ã£o
//        explÃ­cita no cÃ³digo; o `user_id` vem SEMPRE da sessÃ£o resolvida no
//        servidor, nunca do corpo. Ã‰ a Ãºnica rota que escreve essa tabela.
//
// As duas rotas seguem o contrato da SPA ADR Â§5: sessÃ£o Ãºnica (cookie ou
// Bearer), CSRF de escrita com `Origin` + cabeÃ§alho do app, CORS explÃ­cito.

const CORPO_MAXIMO = 32 * 1024

function origensPermitidas(request: NextRequest): string[] {
  const doAmbiente = (process.env["BIVAQUE_APP_ORIGINS"] ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter((origem) => origem !== "")
  // A origem da prÃ³pria web entra sozinha: o app Ã© servido em /app no mesmo
  // domÃ­nio, e exigir configuraÃ§Ã£o para o caso normal seria um portÃ£o inÃºtil.
  return [new URL(request.url).origin, ...doAmbiente]
}

function responder(
  request: NextRequest,
  corpo: unknown,
  status: number,
  extras: Readonly<Record<string, string>> = {},
): NextResponse {
  return NextResponse.json(corpo, {
    status,
    headers: {
      "cache-control": "no-store",
      ...cabecalhosDeCors(request.headers.get("origin"), origensPermitidas(request)),
      ...extras,
    },
  })
}

function lerProgresso(linha: unknown): Progresso {
  const validado = validarProgresso(linha)
  // Linha de versÃ£o antiga ou fora da forma nÃ£o vira erro de tela: devolve o
  // progresso inicial, e a pessoa recomeÃ§a da porta.
  return validado.ok ? validado.progresso : progressoInicial()
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessao = await resolverSessaoDaRequisicao(request)
  if (sessao.estado === "recusada") {
    return responder(request, { autenticado: false, motivo: sessao.sessao.motivo }, 401)
  }

  // O cliente do usuÃ¡rio carrega o JWT da sessÃ£o; a leitura passa pela RLS.
  const { data, error } = await sessao.cliente
    .from("entry_progress")
    .select("versao, etapa, estado")
    .eq("user_id", sessao.usuario.id)
    .maybeSingle()

  if (error) {
    return responder(request, { autenticado: true, erro: "leitura-indisponivel" }, 503, {
      ...sessao.cabecalhos,
    })
  }

  return responder(
    request,
    {
      autenticado: true,
      via: sessao.via,
      progresso: data === null ? progressoInicial() : lerProgresso(data),
    },
    200,
    sessao.cabecalhos,
  )
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const sessao = await resolverSessaoDaRequisicao(request)
  if (sessao.estado === "recusada") {
    return responder(request, { autenticado: false, motivo: sessao.sessao.motivo }, 401)
  }

  const veredito = avaliarEscrita({
    via: sessao.via,
    origem: request.headers.get("origin"),
    cabecalhoDoApp: request.headers.get("x-bivaque-app"),
    origensPermitidas: origensPermitidas(request),
  })
  if (!veredito.ok) {
    return responder(request, { erro: veredito.motivo }, 403, sessao.cabecalhos)
  }

  let bruto: unknown
  try {
    const texto = await request.text()
    if (texto.length > CORPO_MAXIMO) {
      return responder(request, { erro: "grande-demais" }, 413, sessao.cabecalhos)
    }
    bruto = JSON.parse(texto)
  } catch {
    return responder(request, { erro: "corpo-invalido" }, 400, sessao.cabecalhos)
  }

  const validado = validarProgresso(bruto)
  if (!validado.ok) {
    return responder(request, { erro: validado.motivo }, 400, sessao.cabecalhos)
  }

  // Cliente de serviÃ§o com autorizaÃ§Ã£o explÃ­cita: `entry_progress` nÃ£o tem
  // grant de escrita para o cliente, e o dono da linha vem da sessÃ£o â€” se
  // chegasse do corpo, qualquer pessoa gravaria o rascunho de outra.
  const { error } = await criarClienteDeServico()
    .from("entry_progress")
    .upsert(
      {
        user_id: sessao.usuario.id,
        versao: validado.progresso.versao,
        etapa: validado.progresso.etapa,
        estado: validado.progresso.estado as unknown as Json,
      },
      { onConflict: "user_id" },
    )

  if (error) {
    return responder(request, { erro: "gravacao-indisponivel" }, 503, sessao.cabecalhos)
  }

  return responder(request, { ok: true, progresso: validado.progresso }, 200, sessao.cabecalhos)
}

export function OPTIONS(request: NextRequest): NextResponse {
  const cabecalhos = cabecalhosDePreflight(
    request.headers.get("origin"),
    origensPermitidas(request),
  )
  if (Object.keys(cabecalhos).length === 0) {
    return new NextResponse(null, { status: 403, headers: { "cache-control": "no-store" } })
  }
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store", ...cabecalhos },
  })
}
