import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { normalizeBio, validateBio } from "../../../../lib/profile/bio"
import { normalizarNome, validarNome } from "../../../../lib/profile/nome"
import { cidadeDaSessao, interpretarErroDoBanco } from "../eventos/_comum"
import { lerConta, localizacaoDaSessao } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * O perfil próprio (F10): leitura da conta e edição de nome e apresentação.
 *
 * O dono vem sempre da sessão — não existe forma de ler nem de gravar outra
 * pessoa por esta rota. A leitura é o que a tela "Você" mostra; a escrita
 * devolve o estado GRAVADO, lido de volta, não o que foi enviado.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const corpo = await lerConta(auth.sessao.cliente, auth.sessao.usuario.id)
    if (corpo === null) return responder(request, { erro: "sem-perfil" }, 404)
    return responder(request, corpo, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const corpo = lido.corpo
  const temNome = Object.hasOwn(corpo, "nome")
  const temBio = Object.hasOwn(corpo, "bio")
  if (!temNome && !temBio) return responder(request, { erro: "corpo-invalido" }, 400)

  const mudanca: { display_name?: string; bio?: string | null } = {}
  if (temNome) {
    if (typeof corpo["nome"] !== "string")
      return responder(request, { erro: "corpo-invalido" }, 400)
    const mensagem = validarNome(corpo["nome"])
    if (mensagem !== null) return responder(request, { erro: "dados-invalidos", mensagem }, 400)
    mudanca.display_name = normalizarNome(corpo["nome"])
  }
  if (temBio) {
    if (typeof corpo["bio"] !== "string") return responder(request, { erro: "corpo-invalido" }, 400)
    // A mesma regra da tela antiga: teto de 300 e varredura de CPF/CEP.
    const problema = validateBio(corpo["bio"])
    if (problema !== null)
      return responder(request, { erro: "dados-invalidos", mensagem: problema }, 400)
    mudanca.bio = normalizeBio(corpo["bio"])
  }

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const { data, error } = await client
      .from("profiles")
      .update(mudanca)
      .eq("user_id", userId)
      .select("display_name,bio")
      .maybeSingle()
    if (error) {
      const falha = interpretarErroDoBanco(error.code, {
        recusado: "Sua conta não pode alterar este perfil.",
        dados: "Revise o nome ou a apresentação.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw error
    }
    if (data === null) return responder(request, { erro: "nao-encontrado" }, 404)
    const [cidade, localizacao] = await Promise.all([
      cidadeDaSessao(client, userId),
      localizacaoDaSessao(client),
    ])
    return responder(
      request,
      {
        perfil: {
          nome: data.display_name,
          bio: data.bio,
          cidade: cidade?.nome ?? "",
          localizacao,
        },
      },
      200,
    )
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
