import { createServerClient } from "@supabase/ssr"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  consumirTentativa,
  invalidarCodigo,
  ipConfiavel,
  limitadorConfigurado,
  TENTATIVAS_POR_CODIGO,
} from "../../../../../../lib/app-api/entrada-limite"
import {
  codigoDeEntrada,
  emailDeEntrada,
  SEGUNDOS_DE_REENVIO,
  vereditoDaVerificacao,
} from "../../../../../../lib/app-api/entrada-otp"
import {
  aplicarCookies,
  clienteDeServicoOuNulo,
  conferirPorta,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../../lib/app-api/rota-do-app"
import { opcoesDoCookieDaSessao } from "../../../../../../lib/auth/cookie-options"
import { log } from "../../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Verificação do código de entrada (LAN-F01, ADR-20261101-entrada-unica-por-codigo).
//
// Só esta rota cria a sessão do app: o `verifyOtp` devolve a sessão e os cookies
// do `@supabase/ssr` são gravados na resposta. O caminho de erro é deliberadamente
// único — código errado, vencido ou reusado respondem "Código inválido ou
// vencido", sem dizer qual foi e sem o erro cru do GoTrue.
//
// Seis tentativas por código e 30 por IP em 10 minutos (ADR §2). A tentativa é
// consumida no banco ANTES de o GoTrue ser chamado: primeiro o escopo do IP
// confiável (um cliente só não gira por muitos endereços), depois o do e-mail;
// tentativas paralelas não passam do teto. No 6º erro o código é invalidado no
// servidor (`generateLink` sem envio troca o token por outro que ninguém recebe,
// com o tipo de link certo pelo estado da conta), e a 7ª tentativa — mesmo com o
// código que antes estava certo — falha com a mesma mensagem única, sem tocar o
// GoTrue. Em produção, sem `BIVAQUE_LIMITER_PEPPER` a rota responde 503.
//
// A porta do app (cabeçalho próprio + origem na lista) também protege contra
// login CSRF: um site de terceiro não consegue verificar um código e fixar a
// sessão da vítima na conta do atacante.

const CORPO_MAXIMO = 4 * 1024

type CookieParaGravar = Readonly<{
  name: string
  value: string
  options?: Record<string, unknown>
}>

export async function POST(request: NextRequest): Promise<NextResponse> {
  const porta = conferirPorta(request, "cookie")
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return respostaIndisponivel(request)
  if (!limitadorConfigurado()) {
    log.error("entry otp verify: limiter secret is not configured")
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

  const corpo =
    typeof bruto === "object" && bruto !== null ? (bruto as Record<string, unknown>) : {}
  const email = emailDeEntrada(corpo["email"])
  const codigo = codigoDeEntrada(corpo["codigo"])
  if (email === null || codigo === null) {
    return responder(request, { erro: "codigo-invalido" }, 400)
  }

  // O limitador de tentativas fecha em falha: sem ele a rota viraria o adivinhador
  // de código sem teto que a auditoria de 04/11 apontou.
  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)
  const veredito = await consumirTentativa(servico, email, ipConfiavel(request.headers))
  if ("indisponivel" in veredito) {
    log.error("entry otp verify: limiter unavailable")
    return respostaIndisponivel(request)
  }
  if ("limiteDoIp" in veredito) {
    return responder(request, { erro: "limite", reenviarEm: veredito.limiteDoIp }, 429, {
      "retry-after": String(veredito.limiteDoIp),
    })
  }
  if ("esgotado" in veredito) return responder(request, { erro: "codigo-invalido" }, 400)
  const tentativa = veredito.tentativa

  // Os cookies saem daqui, não do cliente: o `@supabase/ssr` escreve a sessão
  // na resposta depois de o GoTrue validar o código. Guardar a lista e aplicá-la
  // depois monta a resposta já com o corpo certo e os cookies.
  const paraGravar: CookieParaGravar[] = []
  const cliente = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies) {
        for (const cookie of cookies) paraGravar.push(cookie)
      },
    },
    // As mesmas opções do callback do OAuth: `Secure` em produção. Sem isto o
    // cookie da sessão nascia sem `Secure` e podia viajar em HTTP.
    cookieOptions: opcoesDoCookieDaSessao(),
  })

  const { data, error } = await cliente.auth.verifyOtp({
    email,
    token: codigo,
    type: "email",
  })

  const resposta = (corpoDaResposta: unknown, status: number): NextResponse =>
    aplicarCookies(responder(request, corpoDaResposta, status), paraGravar)

  if (error !== null) {
    const causa = vereditoDaVerificacao(error)
    if (causa.estado === "limite") {
      return resposta({ erro: "limite", reenviarEm: SEGUNDOS_DE_REENVIO }, 429)
    }
    if (causa.estado === "codigo-invalido") {
      if (tentativa >= TENTATIVAS_POR_CODIGO && !(await invalidarCodigo(servico, email))) {
        // A 7ª tentativa já é barrada pelo limite; o log não leva o e-mail.
        log.error("entry otp verify: could not invalidate the code after the last attempt")
      }
      return resposta({ erro: "codigo-invalido" }, 400)
    }
    return respostaIndisponivel(request)
  }

  if (data.session === null) {
    // Sem sessão não há entrada: o GoTrue validou o código mas não devolveu
    // sessão, e seguir adiante fingiria um login que não existe.
    return resposta({ erro: "codigo-invalido" }, 400)
  }

  return resposta({ autenticado: true }, 200)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
