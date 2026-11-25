import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { origemDoRoteador } from "@/lib/navegacao/origem"

describe("origem do roteador nativo", () => {
  it("mantém a rota inicial do iOS interna", () => {
    const raiz = createRootRoute()
    const indice = createRoute({
      getParentRoute: () => raiz,
      path: "/",
      component: () => createElement("p", null, "Início"),
    })
    const router = createRouter({
      routeTree: raiz.addChildren([indice]),
      basepath: "/app",
      history: createMemoryHistory({ initialEntries: ["/app/"] }),
      origin: origemDoRoteador({ protocol: "capacitor:" }) ?? "capacitor://localhost",
    })
    const location = router.latestLocation
    const destino = router.buildLocation({
      to: location.pathname,
      search: true,
      params: true,
      hash: true,
      state: true,
    })
    expect(destino.external).toBe(false)
    expect(destino.publicHref).toBe("/app/")
    expect(router.getMatchedRoutes(location.pathname)[0]).toContain(indice)
  })

  it("deixa web e Android com a origem padrão do navegador", () => {
    expect(origemDoRoteador({ protocol: "https:" })).toBeUndefined()
    expect(origemDoRoteador({ protocol: "http:" })).toBeUndefined()
  })
})
