import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import {
  ehRecusaDeValidacao,
  type UploadVerificationDocumentResult,
  uploadVerificationDocument,
} from "../../../../../lib/onboarding/upload-verification-document"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Envio do documento de identidade pelo app (LAN-F01, ADR de entrada).
//
// É o mesmo caminho da web: multipart/form-data com o campo `documento`, e toda
// a regra no núcleo `upload-verification-document` — consentimento, recusa de
// quem já tem vínculo, limite de 10 MB, MIME PDF/JPEG/PNG, PDF byte a byte,
// sanitize da imagem, varredura de órfãos, upload no bucket e registro pela RPC
// canônica (envio ou troca). A rota não reimplementa nada disso e não muda as
// mensagens que a tela da web já mostra.
//
// O dono do documento é SEMPRE o id da sessão resolvida no servidor. Um
// `user_id` mandado no formulário é ignorado, como em qualquer rota do app.
//
// A resposta separa duas coisas que a tela trata diferente:
// - recusa de validação (400 `documento-recusado`) leva o `motivo`, que é a
//   mensagem fixa do núcleo e pode ser mostrada à pessoa;
// - falha de infraestrutura (503 `documento-indisponivel`) não leva nada além
//   do código: mensagem de banco ou Storage nunca volta para o cliente, e o log
//   fica só com a mensagem fixa, o id e o código.

// O arquivo é 10 MB, e o teto do CORPO também é 10 MB: o `content-length` do
// multipart inclui o overhead do formulário, então um arquivo exatamente no
// limite do núcleo chega aqui um pouco acima e é recusado antes de ser lido —
// o teto efetivo do arquivo fica alguns bytes abaixo de 10 MB, de propósito:
// carregar o corpo inteiro para só então recusar é o custo que a rota evita.
const LIMITE_DO_CORPO = 10 * 1024 * 1024

type CorpoDoDocumento =
  | { readonly ok: true; readonly bytes: Uint8Array<ArrayBuffer> }
  | { readonly ok: false; readonly status: 413 | 400 }

/**
 * Lê o corpo com teto, mesmo SEM `content-length` — ou com um número menor que
 * o real. O cabeçalho é só uma dica do cliente: quem quiser contornar o teto
 * omite ou mente, e aí o limite tem de valer na leitura. Acima do teto o fluxo
 * é cancelado e nada é acumulado além dos pedaços já aceitos.
 */
async function lerCorpoComTeto(request: NextRequest): Promise<CorpoDoDocumento> {
  const corpo = request.body
  if (corpo === null) return { ok: true, bytes: new Uint8Array(0) }

  const leitor = corpo.getReader()
  const pedacos: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      if (value === undefined) continue
      total += value.byteLength
      if (total > LIMITE_DO_CORPO) {
        await leitor.cancel()
        return { ok: false, status: 413 }
      }
      pedacos.push(value)
    }
  } catch {
    return { ok: false, status: 400 }
  } finally {
    leitor.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let deslocamento = 0
  for (const pedaco of pedacos) {
    bytes.set(pedaco, deslocamento)
    deslocamento += pedaco.byteLength
  }
  return { ok: true, bytes }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403, sessao.sessao.cabecalhos)

  const declarado = Number(request.headers.get("content-length") ?? "")
  if (Number.isFinite(declarado) && declarado > LIMITE_DO_CORPO) {
    return responder(request, { erro: "grande-demais" }, 413, sessao.sessao.cabecalhos)
  }

  const corpo = await lerCorpoComTeto(request)
  if (!corpo.ok) {
    const erro = corpo.status === 413 ? "grande-demais" : "documento-ausente"
    return responder(request, { erro }, corpo.status, sessao.sessao.cabecalhos)
  }

  // Corpo que não é multipart não tem campo nenhum: é o mesmo caso do arquivo
  // ausente, e não um 500. O `FormData` só é lido depois da porta e do teto.
  let formulario: FormData
  try {
    formulario = await new Response(corpo.bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData()
  } catch {
    return responder(request, { erro: "documento-ausente" }, 400, sessao.sessao.cabecalhos)
  }

  const arquivo = formulario.get("documento")
  if (!(arquivo instanceof File)) {
    return responder(request, { erro: "documento-ausente" }, 400, sessao.sessao.cabecalhos)
  }

  const userId = sessao.sessao.usuario.id

  let resultado: UploadVerificationDocumentResult
  try {
    resultado = await uploadVerificationDocument({ userId, file: arquivo })
  } catch {
    // Falta de configuração do servidor ou erro inesperado no núcleo: serviço
    // fora, não erro do pedido. A exceção não vira 500 nem é ecoada.
    return indisponivel(request, sessao.sessao.cabecalhos, userId)
  }

  if (resultado.ok) {
    return responder(request, { ok: true }, 200, sessao.sessao.cabecalhos)
  }

  if (ehRecusaDeValidacao(resultado.error)) {
    return responder(
      request,
      { erro: "documento-recusado", motivo: resultado.error },
      400,
      sessao.sessao.cabecalhos,
    )
  }

  return indisponivel(request, sessao.sessao.cabecalhos, userId)
}

function indisponivel(
  request: NextRequest,
  cabecalhos: Readonly<Record<string, string>>,
  userId: string,
): NextResponse {
  // Mensagem fixa mais id e código: nada de mensagem crua de banco/Storage, nem
  // nome de arquivo, caminho no bucket ou tipo do documento.
  log.error("entry document unavailable", { user_id: userId, code: "infraestrutura" })
  return responder(request, { erro: "documento-indisponivel" }, 503, cabecalhos)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
