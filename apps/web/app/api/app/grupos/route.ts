import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { lerNovoGrupo, nomeEmUso } from "../../../../lib/grupos/criacao"
import { contarMembrosAprovados } from "../../../../lib/search/contagem-de-membros"
import { cidadeDaSessao, interpretarErroDoBanco } from "../eventos/_comum"
import {
  apresentarGrupo,
  CAMPOS_DO_GRUPO,
  grupoDaSessao,
  pagina,
  participacao,
  registrarFalha,
} from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const depois = pagina(request)
  if (depois === null) return responder(request, { erro: "pagina-invalida" }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const cidade = await cidadeDaSessao(client, userId)
    if (!cidade) return responder(request, { grupos: [], cidade: "", proximo: null }, 200)
    const grupos = await client
      .from("groups")
      .select(CAMPOS_DO_GRUPO)
      .eq("locality_id", cidade.id)
      .eq("is_deleted", false)
      .order("name")
      .order("id")
      .range(depois, depois + 19)
    if (grupos.error) throw grupos.error
    const linhas = grupos.data ?? []
    const contagem = await contarMembrosAprovados(
      client,
      linhas.map((grupo) => grupo.id),
    )
    const minhas = await client
      .from("group_memberships")
      .select("group_id,status,role")
      .eq("user_id", userId)
      .in(
        "group_id",
        linhas.map((grupo) => grupo.id),
      )
    if (minhas.error) throw minhas.error
    return responder(
      request,
      {
        grupos: linhas.map((grupo) =>
          apresentarGrupo(
            grupo,
            (minhas.data ?? []).find((m) => m.group_id === grupo.id) ?? null,
            userId,
            contagem.get(grupo.id) ?? 0,
          ),
        ),
        cidade: cidade.nome,
        proximo: linhas.length === 20 ? String(depois + 20) : null,
      },
      200,
    )
  } catch (error) {
    registrarFalha("group directory", error)
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const leitura = lerNovoGrupo(lido.corpo)
  if (!leitura.ok) {
    return responder(request, { erro: "dados-invalidos", mensagem: leitura.mensagem }, 400)
  }
  const { nome, descricao, regras, fechado } = leitura.grupo
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    // A cidade vem do vínculo `current` da sessão, nunca do corpo: é o mesmo
    // `p_locality_id` que a RPC vai conferir contra o vínculo verificado.
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const existentes = await client
      .from("groups")
      .select("name")
      .eq("locality_id", cidade.id)
      .eq("is_deleted", false)
    if (existentes.error) throw existentes.error
    if (
      nomeEmUso(
        (existentes.data ?? []).map((linha) => linha.name),
        nome,
      )
    ) {
      return responder(
        request,
        {
          erro: "nome-em-uso",
          mensagem: "Já existe um grupo com esse nome. Busque e entre nele.",
        },
        409,
      )
    }
    const criado = await client.rpc("create_group", {
      p_name: nome,
      p_visibility: fechado ? "private" : "public",
      p_locality_id: cidade.id,
      ...(descricao === "" ? {} : { p_description: descricao }),
      ...(regras === "" ? {} : { p_rules: regras }),
    })
    if (criado.error) {
      const falha = interpretarErroDoBanco(criado.error.code, {
        recusado: "Sua conta não pode criar grupos nesta cidade.",
        dados: "Revise os dados do grupo: algo não é aceito.",
      })
      if (falha.status === 503) registrarFalha("group create", criado.error)
      return responder(request, falha.corpo, falha.status)
    }
    if (typeof criado.data !== "string") throw new Error("create without id")
    // A resposta é o grupo lido de volta com a participação da sessão: a RPC
    // criou o vínculo `owner` e é isso que a tela precisa ver, não o que o
    // formulário achava que ia gravar.
    const grupo = await grupoDaSessao(client, criado.data)
    if (!grupo) throw new Error("created group is not visible")
    const membro = await participacao(client, criado.data, userId)
    const membros = (await contarMembrosAprovados(client, [criado.data])).get(criado.data) ?? 0
    return responder(request, { grupo: apresentarGrupo(grupo, membro, userId, membros) }, 201)
  } catch (error) {
    registrarFalha("group create", error)
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
