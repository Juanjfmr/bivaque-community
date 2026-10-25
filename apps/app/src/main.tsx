import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { createRoot } from "react-dom/client"

import { ProvedorDeCargas } from "@/src/contexto/cargas"
import { roteador } from "@/src/roteador"
import "./styles.css"

const cliente = new QueryClient()
const elemento = document.getElementById("root")
if (!elemento) throw new Error("Raiz do Bivaque não encontrada")

createRoot(elemento).render(
  <QueryClientProvider client={cliente}>
    <ProvedorDeCargas>
      <RouterProvider router={roteador} />
    </ProvedorDeCargas>
  </QueryClientProvider>,
)
