import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { fichaDoDono, fotosDaFicha } from "../../../../../lib/providers/app-negocio"
import { sanitizeImage } from "../../../../../lib/storage/sanitize-image"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// F07 (RUN-177) — foto do portfólio da ficha do próprio membro.
//
// A imagem entra pelo SERVIDOR: a SEC-006 removeu o INSERT de imagem do papel
// `authenticated`, justamente para o navegador não gravar a foto original com
// a coordenada do aparelho. A gravação usa `service_role` DEPOIS de reconferir
// a mesma autorização da policy (`can_manage_provider_profile`) e de passar a
// imagem por `sanitizeImage`. Leitura é URL assinada curta (ADR §3.2).

const MIME_TIPOS = ["image/jpeg", "image/png", "image/webp"]
const LIMITE_DE_BYTES = 5242880

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  let formulario: FormData
  try {
    formulario = await request.formData()
  } catch {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const arquivo = formulario.get("file")
  const legendaBruta = formulario.get("legenda")
  const legenda =
    typeof legendaBruta === "string" && legendaBruta.trim() !== "" ? legendaBruta.trim() : null
  if (legenda !== null && legenda.length > 120)
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "A legenda passa de 120 caracteres." },
      400,
    )
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Escolha uma imagem para publicar." },
      400,
    )
  if (!MIME_TIPOS.includes(arquivo.type))
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Use uma imagem JPEG, PNG ou WebP." },
      400,
    )
  if (arquivo.size > LIMITE_DE_BYTES)
    return responder(request, { erro: "dados-invalidos", mensagem: "A imagem passa de 5 MB." }, 400)

  const client = auth.sessao.cliente
  try {
    const ficha = await fichaDoDono(client, auth.sessao.usuario.id)
    if (ficha === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
    const { data: podeGerenciar, error: erroDaChecagem } = await client.rpc(
      "can_manage_provider_profile",
      { p_provider_id: ficha.id },
    )
    if (erroDaChecagem) throw erroDaChecagem
    if (podeGerenciar !== true) return responder(request, { erro: "recusado" }, 403)

    const servico = clienteDeServicoOuNulo()
    if (servico === null) return responder(request, { erro: "indisponivel" }, 503)

    const extensao =
      arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg"
    const caminho = `${ficha.id}/portfolio/${crypto.randomUUID()}.${extensao}`
    let imagem: Buffer
    try {
      imagem = await sanitizeImage(arquivo, LIMITE_DE_BYTES)
    } catch (falha: unknown) {
      return responder(
        request,
        {
          erro: "dados-invalidos",
          mensagem: falha instanceof Error ? falha.message : "Não foi possível preparar a imagem.",
        },
        400,
      )
    }
    const { error: erroDoUpload } = await servico.storage
      .from("provider-photos")
      .upload(caminho, imagem, { contentType: arquivo.type })
    if (erroDoUpload) throw erroDoUpload

    const { count, error: erroDaContagem } = await client
      .from("provider_portfolio_photos")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", ficha.id)
    if (erroDaContagem) throw erroDaContagem
    const { error: erroDaLinha } = await client.from("provider_portfolio_photos").insert({
      provider_id: ficha.id,
      photo_path: caminho,
      caption: legenda,
      position: count ?? 0,
    })
    if (erroDaLinha) throw erroDaLinha
    return responder(request, { fotos: await fotosDaFicha(client, ficha.id) }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
