export type AppRoute = {
  name: "inicio" | "comunidade" | "pergunta" | "minhas" | "conversas" | "voce" | "indisponivel"
  id: string | null
}

export type NavigationContext = {
  route: AppRoute
  origin: "inicio" | "comunidade" | "conversas" | "voce"
  parent: AppRoute | null
  filter: "ajudar" | "resolvidas" | "minhas"
  scroll: number
  focus: string | null
}

const ROOT_ROUTES = new Set(["inicio", "comunidade", "conversas", "voce"])
const VALID_ROUTES = new Set([...ROOT_ROUTES, "pergunta", "minhas"])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseAppHash(hash: string): AppRoute {
  const parts = hash.replace(/^#/, "").split("/")
  const name = parts[0] || "inicio"
  if (!VALID_ROUTES.has(name) || parts.length > 2) return { name: "indisponivel", id: null }
  if (name === "pergunta") {
    try {
      const id = decodeURIComponent(parts[1] ?? "")
      return UUID.test(id) ? { name, id } : { name: "indisponivel", id: null }
    } catch {
      return { name: "indisponivel", id: null }
    }
  }
  if (parts.length > 1) return { name: "indisponivel", id: null }
  return { name, id: null } as AppRoute
}

export function appHash(route: AppRoute): string {
  return `#${route.name}${route.id ? `/${encodeURIComponent(route.id)}` : ""}`
}

export function activeAppTab(route: AppRoute, origin: NavigationContext["origin"]): string {
  if (ROOT_ROUTES.has(route.name)) return route.name
  if (route.name === "pergunta" || route.name === "minhas") return "comunidade"
  return origin
}

export function isRootRoute(route: AppRoute): boolean {
  return ROOT_ROUTES.has(route.name)
}
