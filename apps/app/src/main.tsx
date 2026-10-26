import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { createRoot } from "react-dom/client"

import { ProvedorDeAvisos } from "@/components/bivaque/avisos"
import { useCorDaBarraDoSistema } from "@/src/casca/tema"
import { ProvedorDeCargas } from "@/src/contexto/cargas"
import { ProvedorDaCasca } from "@/src/contexto/casca"
import { roteador } from "@/src/roteador"
import "./styles.css"

const cliente = new QueryClient()
const elemento = document.getElementById("root")
if (!elemento) throw new Error("Raiz do Bivaque não encontrada")

function Aplicacao() {
  useCorDaBarraDoSistema()
  return (
    <QueryClientProvider client={cliente}>
      <ProvedorDaCasca>
        <ProvedorDeAvisos>
          <ProvedorDeCargas>
            <RouterProvider router={roteador} />
          </ProvedorDeCargas>
        </ProvedorDeAvisos>
      </ProvedorDaCasca>
    </QueryClientProvider>
  )
}

createRoot(elemento).render(<Aplicacao />)
