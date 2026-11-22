import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { requisitar } from "@/lib/api/cliente"
import { apagarPkce, lerPkce } from "@/lib/nativo/cofre"
import { aceitarPar } from "@/lib/nativo/sessao"

let processando = false

export async function receberAutenticacao(link: string): Promise<void> {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return
  }
  if (url.protocol !== "bivaque:" || url.host !== "auth-callback" || processando) return
  processando = true
  let trocou = false
  let valido = false
  try {
    const fluxo = await lerPkce()
    await apagarPkce()
    const code = url.searchParams.get("code")
    if (
      fluxo &&
      Date.now() - fluxo.criadoEm >= 0 &&
      Date.now() - fluxo.criadoEm < 600_000 &&
      code &&
      !url.searchParams.has("error")
    ) {
      valido = true
      const resposta = await requisitar("/api/app/sessao/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, code_verifier: fluxo.verificador }),
      })
      if (resposta.ok) {
        await aceitarPar(await resposta.json())
        trocou = true
      }
    }
  } catch {
    // A entrada permite tentar novamente quando a troca falha.
  } finally {
    await Browser.close().catch(() => undefined)
    if (valido) {
      window.history.replaceState(null, "", "/app/entrar")
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
    if (trocou) window.dispatchEvent(new Event("bivaque:autenticacao"))
    processando = false
  }
}

export async function ouvirAutenticacao(): Promise<void> {
  await App.addListener("appUrlOpen", ({ url }) => {
    void receberAutenticacao(url)
  })
  const inicial = await App.getLaunchUrl()
  if (inicial) await receberAutenticacao(inicial.url)
}
