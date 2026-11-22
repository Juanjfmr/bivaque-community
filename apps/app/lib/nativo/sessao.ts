import { apagarRenovacao, gravarRenovacao, lerRenovacao } from "./cofre"

let acesso: string | null = null
let expiracao = 0
let renovacao: string | null = null
let pendente: Promise<string | null> | null = null
let geracao = 0

export function origemDaApi(): string {
  try {
    const url = new URL(import.meta.env["VITE_API_BASE"])
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error()
    return url.origin
  } catch {
    throw new Error("Configure VITE_API_BASE com a origem absoluta da API no app nativo")
  }
}

export async function acessoAtual(): Promise<string | null> {
  if (pendente) return pendente
  if (!precisaRenovar()) return acesso
  return renovarSessao()
}

export function acessoEmMemoria(): string | null {
  return acesso
}

export function precisaRenovar(): boolean {
  return acesso === null || expiracao * 1000 - Date.now() < 300_000
}

export function limparMemoria(): void {
  acesso = null
  expiracao = 0
  renovacao = null
  geracao += 1
}

export async function aceitarPar(par: unknown): Promise<void> {
  if (typeof par !== "object" || par === null) throw new Error("resposta inválida")
  const dados = par as Record<string, unknown>
  if (
    typeof dados["access_token"] !== "string" ||
    !dados["access_token"] ||
    typeof dados["refresh_token"] !== "string" ||
    !dados["refresh_token"] ||
    typeof dados["expires_at"] !== "number" ||
    !Number.isFinite(dados["expires_at"])
  )
    throw new Error("resposta inválida")
  acesso = dados["access_token"]
  renovacao = dados["refresh_token"]
  expiracao = dados["expires_at"]
  await gravarRenovacao(renovacao).catch(() => undefined)
}

export function renovarSessao(): Promise<string | null> {
  if (pendente) return pendente
  const geracaoInicial = geracao
  pendente = (async () => {
    const token = renovacao ?? (await lerRenovacao())
    if (!token || geracao !== geracaoInicial) return null
    const inicio = Date.now()
    let espera = 250
    while (true) {
      if (geracao !== geracaoInicial) return null
      let resposta: Response
      let falha = "indisponivel"
      let retryAfter = 0
      try {
        resposta = await fetch(`${origemDaApi()}/api/app/sessao/renovar`, {
          method: "POST",
          credentials: "omit",
          headers: {
            "content-type": "application/json",
            "x-bivaque-app": "bivaque-spa",
            "x-bivaque-cliente": "loja",
          },
          body: JSON.stringify({ refresh_token: token }),
          signal: AbortSignal.timeout(3000),
        })
      } catch {
        falha = "rede"
        resposta = new Response(null, { status: 503 })
      }
      if (resposta.status === 429 || resposta.status === 503) {
        if (resposta.status === 429 || resposta.headers.has("retry-after")) falha = "indisponivel"
        const valor = resposta.headers.get("retry-after")
        if (valor) {
          const segundos = Number(valor)
          const atraso = Number.isFinite(segundos)
            ? segundos * 1000
            : Date.parse(valor) - Date.now()
          retryAfter = Math.max(0, Math.min(3000, Number.isFinite(atraso) ? atraso : 0))
        }
        const atraso = Math.max(espera, retryAfter)
        if (espera > 500 || Date.now() - inicio + atraso + 3000 > 9000) throw new Error(falha)
        await new Promise((resolve) => setTimeout(resolve, atraso))
        espera *= 2
        continue
      }
      if (geracao !== geracaoInicial) return null
      if (resposta.status === 401) {
        limparMemoria()
        await apagarRenovacao().catch(() => undefined)
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/app/entrar")) {
          const entrada = new URL("/app/entrar", window.location.origin)
          entrada.searchParams.set(
            "redirect",
            `${window.location.pathname}${window.location.search}`,
          )
          window.location.assign(entrada.href)
        }
        return null
      }
      if (!resposta.ok) throw new Error("renovação indisponível")
      const par: unknown = await resposta.json()
      if (geracao !== geracaoInicial) return null
      await aceitarPar(par)
      if (geracao !== geracaoInicial) {
        await apagarRenovacao().catch(() => undefined)
        return null
      }
      return acesso
    }
  })().finally(() => {
    pendente = null
  })
  return pendente
}
