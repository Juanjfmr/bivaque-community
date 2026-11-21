import { esquemaDeLink } from "../../capacitor.config"

export function rotaDoLink(link: string, base: string | undefined): string | null {
  try {
    // URL normaliza segmentos com ponto antes de expor pathname.
    if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$|[?#])/i.test(link) || link.includes("\\")) return null
    // A WebView Android pode tratar esquemas próprios como caminho sem host.
    const esquemaNativo = new RegExp(`^${esquemaDeLink}://`, "i")
    const nativo = esquemaNativo.test(link)
    if (nativo && !/^app(?:[/?#]|$)/i.test(link.replace(esquemaNativo, ""))) return null
    const url = new URL(nativo ? link.replace(esquemaNativo, "https://") : link)
    if (url.username || url.password) return null
    let caminho: string
    if (nativo) {
      if (url.host !== "app") return null
      caminho = url.pathname || "/"
    } else {
      if (!base || url.protocol !== "https:" || url.origin !== new URL(base).origin) return null
      if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) return null
      caminho = url.pathname.slice(4) || "/"
    }
    if (caminho.startsWith("//")) return null
    return `${caminho}${url.search}${url.hash}`
  } catch {
    return null
  }
}
