export type AppRoute = {
  name: "inicio" | "comunidade" | "conversas" | "voce" | "minhas" | "pergunta" | "indisponivel"
  id?: string
}
export type AppNavigation = {
  route: AppRoute
  parent?: AppRoute
  origin: "inicio" | "comunidade" | "conversas" | "voce"
  filter: "help" | "resolved" | "mine"
  scroll: number
  focus: string | null
}
const roots = ["inicio", "comunidade", "conversas", "voce"] as const
export function parseAppHash(hash: string): AppRoute {
  const parts = hash.replace(/^#/, "").split("/")
  const name = parts[0] || "inicio"
  if (
    parts.length > 2 ||
    ![...roots, "minhas", "pergunta"].includes(name as never) ||
    (parts.length === 2 && name !== "pergunta")
  )
    return { name: "indisponivel" }
  if (name === "pergunta") {
    try {
      return parts[1] ? { name, id: decodeURIComponent(parts[1]) } : { name: "indisponivel" }
    } catch {
      return { name: "indisponivel" }
    }
  }
  return { name: name as AppRoute["name"] }
}
export function appHash(route: AppRoute): string {
  return `#${route.name}${route.id ? `/${encodeURIComponent(route.id)}` : ""}`
}
export function needsCommunityParent(route: AppRoute, state: unknown): boolean {
  return route.name === "pergunta" && !(state as { bivaque?: boolean } | null)?.bivaque
}
export function activeAppTab(
  route: AppRoute,
  origin: AppNavigation["origin"],
): AppNavigation["origin"] {
  if (roots.includes(route.name as (typeof roots)[number]))
    return route.name as AppNavigation["origin"]
  if (route.name === "pergunta" || route.name === "minhas") return "comunidade"
  return origin
}
