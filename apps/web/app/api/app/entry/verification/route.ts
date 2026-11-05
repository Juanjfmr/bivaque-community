import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Estado da verificação do vínculo, para o app decidir a etapa de espera
// (LAN-F01). A rota devolve o estado cru do banco; a máquina de etapas do app
// (apps/app/src/previa-f01/fluxo.ts) traduz para a tela. Nada de CPF, nome do
// Portal ou motivo técnico sai daqui — só o resultado que a pessoa já vê.
//
// A leitura é do USUÁRIO, sob RLS: `my_verification_status()` (escopada por
// `auth.uid()`, sem parâmetro de id para errar) e a leitura própria de
// `locality_memberships`. Nenhuma `service_role` aqui — a rota só lê o que a
// própria pessoa já poderia ler.

const STATUS_VALIDOS = ["pending", "verified", "rejected", "temporary_error"] as const
type Status = (typeof STATUS_VALIDOS)[number]

type LinhaDoStatus = Readonly<{
  status: string
  checked_at: string | null
  updated_at: string | null
}>

function statusValido(valor: unknown): Status | null {
  return typeof valor === "string" && (STATUS_VALIDOS as readonly string[]).includes(valor)
    ? (valor as Status)
    : null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const cliente = sessao.sessao.cliente
  const userId = sessao.sessao.usuario.id

  const [verificacao, cidade] = await Promise.all([
    cliente.rpc("my_verification_status"),
    cliente
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ])

  if (verificacao.error || cidade.error) {
    log.error("entry verification read failed", {
      error: verificacao.error?.message ?? cidade.error?.message,
      userId,
    })
    return responder(request, { autenticado: true, erro: "leitura-indisponivel" }, 503)
  }

  const linha = (verificacao.data as LinhaDoStatus[] | null)?.[0] ?? null

  return responder(
    request,
    {
      autenticado: true,
      status: linha === null ? null : statusValido(linha.status),
      checkedAt: linha?.checked_at ?? null,
      updatedAt: linha?.updated_at ?? null,
      membroDaCidade: cidade.data !== null,
    },
    200,
    sessao.sessao.cabecalhos,
  )
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
