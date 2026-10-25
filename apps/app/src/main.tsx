import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { createRoot } from "react-dom/client"
import "./styles.css"

const rootRoute = createRootRoute()
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <h1>Bivaque</h1>,
})
const router = createRouter({
  basepath: "/app",
  routeTree: rootRoute.addChildren([indexRoute]),
})
const queryClient = new QueryClient()
const element = document.getElementById("root")
if (!element) throw new Error("Raiz do Bivaque não encontrada")

createRoot(element).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
)
