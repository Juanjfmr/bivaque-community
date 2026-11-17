import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { interpretarErroDoBanco } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const categorias = ["school", "hospital", "transporter", "courier"] as const
const mensagens: Readonly<Record<string, string>> = {
  limite: "Você já tem cinco sugestões aguardando revisão. Espere a fila andar para sugerir mais.",
  localidade: "Só membros de uma cidade podem sugerir referências para o guia dela.",
  nome: "O nome precisa ter entre 2 e 120 caracteres.",
  descricao: "A descrição pode ter até 500 caracteres.",
  site: "O site precisa começar com http:// ou https://.",
  telefone: "Confira o telefone informado.",
  dados: "Revise os dados da sugestão.",
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  if (conferirEscrita(request, auth.sessao.via) !== "ok") {
    return responder(request, { erro: "csrf" }, 403)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const nome = lido.corpo["nome"]
  const categoria = lido.corpo["categoria"]
  const descricao = lido.corpo["descricao"]
  const site = lido.corpo["site"]
  const telefone = lido.corpo["telefone"]
  if (
    typeof nome !== "string" ||
    nome.trim().length < 2 ||
    nome.trim().length > 120 ||
    typeof categoria !== "string" ||
    !(categorias as readonly string[]).includes(categoria) ||
    typeof descricao !== "string" ||
    descricao.trim().length > 500 ||
    (site !== undefined &&
      (typeof site !== "string" || (site.trim() !== "" && !/^https?:\/\//.test(site.trim())))) ||
    (telefone !== undefined &&
      (typeof telefone !== "string" ||
        (telefone.trim() !== "" && !/^\+?[0-9() -]{8,30}$/.test(telefone.trim()))))
  )
    return responder(request, { erro: "corpo-invalido" }, 400)
  const nomeValido = nome as string
  const categoriaValida = categoria as (typeof categorias)[number]
  const descricaoValida = descricao as string
  const userId = auth.sessao.usuario.id
  const args = {
    p_name: nomeValido.trim(),
    p_category: categoriaValida,
    p_description: descricaoValida.trim(),
    ...(typeof site === "string" && site.trim() ? { p_website_url: site.trim() } : {}),
    ...(typeof telefone === "string" && telefone.trim() ? { p_phone: telefone.trim() } : {}),
  }
  try {
    const result = await auth.sessao.cliente.rpc("suggest_guide_entry", args)
    if (result.error) {
      if (result.error.code === "54000")
        return responder(request, { erro: "limite", mensagem: mensagens["limite"] }, 429)
      if (result.error.code === "42501")
        return responder(request, { erro: "localidade", mensagem: mensagens["localidade"] }, 403)
      if (result.error.code === "22023")
        return responder(request, { erro: "corpo-invalido", mensagem: mensagens["dados"] }, 400)
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Só membros desta cidade podem sugerir referências.",
        dados: "Revise os dados da sugestão.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    return responder(request, { enviada: true }, 201)
  } catch (error) {
    log.error("app guia: new entry suggestion failed", {
      code: typeof error === "object" && error !== null && "code" in error ? error.code : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
