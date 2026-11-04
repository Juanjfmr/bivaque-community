import { createClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  confirmarEnvio,
  consumirEnvio,
  ipConfiavel,
  limitadorConfigurado,
} from "../../../../../lib/app-api/entrada-limite"
import {
  emailDeEntrada,
  SEGUNDOS_DE_REENVIO,
  vereditoDoEnvio,
} from "../../../../../lib/app-api/entrada-otp"
import {
  clienteDeServicoOuNulo,
  conferirPorta,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Envio do código de entrada (LAN-F01, ADR-20261101-entrada-unica-por-codigo).
//
// A rota não tem sessão para resolver: ela é a porta. Duas coisas importam:
//
// 1. **Resposta única.** Conta nova e conta existente recebem a mesma resposta
//    "enviado" (o GoTrue cria a conta para o endereço novo). Limite de reenvio
//    e falha de transporte são os únicos estados distinguíveis, porque nenhum
//    dos dois fala sobre a existência da conta.
// 2. **Limite por e-mail, por IP e global, no banco.** No máximo um envio por
//    e-mail a cada 60 s, um teto por hora por e-mail e por IP confiável
//    (cabeçalho que a plataforma escreve, nunca `x-forwarded-for`) e um teto global
//    abaixo do orçamento de e-mail do GoTrue: um cliente só não esgota o e-mail do
//    projeto. O limite é consumido ANTES do GoTrue e não consulta a conta: a
//    resposta 429 é a mesma exista ela ou não. As seis tentativas do código só são
//    devolvidas DEPOIS de o GoTrue confirmar o envio.
//    Em produção, sem `BIVAQUE_LIMITER_PEPPER` a rota responde 503.
// 3. **A porta do app.** A rota exige o cabeçalho do app e recusa origem fora
//    da lista: um formulário de outro site não consegue disparar e-mails nem
//    fixar a credencial de outra pessoa (login CSRF na verificação).

const CORPO_MAXIMO = 4 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  const porta = conferirPorta(request, "cookie")
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return respostaIndisponivel(request)
  if (!limitadorConfigurado()) {
    log.error("entry otp send: limiter secret is not configured")
    return respostaIndisponivel(request)
  }

  let bruto: unknown
  try {
    const texto = await request.text()
    if (texto.length > CORPO_MAXIMO) return responder(request, { erro: "grande-demais" }, 413)
    bruto = JSON.parse(texto)
  } catch {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const email = emailDeEntrada(
    typeof bruto === "object" && bruto !== null ? (bruto as { email?: unknown }).email : undefined,
  )
  if (email === null) return responder(request, { erro: "email-invalido" }, 400)

  // O limitador vem antes do GoTrue. Sem a configuração do servidor ou sem
  // resposta do banco, a rota fecha (503): falhar aberto desligaria o limite
  // justo quando alguém abusa.
  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)
  const limite = await consumirEnvio(servico, email, ipConfiavel(request.headers))
  if ("indisponivel" in limite) {
    log.error("entry otp send: limiter unavailable")
    return respostaIndisponivel(request)
  }
  if (!limite.liberado) {
    return responder(request, { erro: "limite", reenviarEm: limite.reenviarEm }, 429, {
      "retry-after": String(limite.reenviarEm),
    })
  }

  // Cliente anônimo no servidor: a chave pública fica no servidor e o app não
  // precisa falar com o GoTrue. `shouldCreateUser` é o que faz conta nova e
  // conta existente terem o mesmo caminho.
  const cliente = createClient<Database>(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await cliente.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  const veredito = vereditoDoEnvio(error)
  if (veredito.estado === "enviado") {
    // O GoTrue confirmou: só agora o código novo reabre as seis tentativas.
    if (!(await confirmarEnvio(servico, email))) {
      log.error("entry otp send: could not reopen the attempts after the send")
    }
    return responder(request, { enviado: true, reenviarEm: SEGUNDOS_DE_REENVIO }, 200)
  }
  if (veredito.estado === "limite") {
    return responder(request, { erro: "limite", reenviarEm: veredito.reenviarEm }, 429, {
      "retry-after": String(veredito.reenviarEm),
    })
  }
  return respostaIndisponivel(request)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
