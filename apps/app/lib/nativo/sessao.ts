import { apagarRenovacao, gravarRenovacao, lerRenovacao } from "./cofre"

let acesso: string | null = null
let expiracao = 0
let renovacao: string | null = null
let pendente: Promise<string | null> | null = null

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

export function acessoAtual(): string | null {
  return acesso
}

export function precisaRenovar(): boolean {
  return acesso === null || expiracao * 1000 - Date.now() < 300_000
}

export function limparMemoria(): void {
  acesso = null
  expiracao = 0
  renovacao = null
}

export function renovarSessao(): Promise<string | null> {
  if (pendente) return pendente
  pendente = (async () => {
    const token = renovacao ?? (await lerRenovacao())
    if (!token) return null
    const inicio = Date.now()
    let espera = 250
    while (true) {
      let resposta: Response
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
        if (Date.now() - inicio + espera >= 9000) throw new Error("rede")
        await new Promise((resolve) => setTimeout(resolve, espera))
        espera *= 2
        continue
      }
      if (resposta.status === 401) {
        limparMemoria()
        await apagarRenovacao().catch(() => undefined)
        return null
      }
      if (!resposta.ok) throw new Error("renovação indisponível")
      const par: unknown = await resposta.json()
      if (typeof par !== "object" || par === null) throw new Error("resposta inválida")
      const dados = par as Record<string, unknown>
      if (
        typeof dados["access_token"] !== "string" ||
        typeof dados["refresh_token"] !== "string" ||
        typeof dados["expires_at"] !== "number"
      )
        throw new Error("resposta inválida")
      acesso = dados["access_token"]
      renovacao = dados["refresh_token"]
      expiracao = dados["expires_at"]
      await gravarRenovacao(renovacao).catch(() => undefined)
      return acesso
    }
  })().finally(() => {
    pendente = null
  })
  return pendente
}
