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

// Prévia clicável do F01 novo (régua Nextdoor, 01/11/2026): só no servidor de
// desenvolvimento, fora do roteador e da casca. O build de produção não a leva.
const naPreviaDoF01 =
  import.meta.env.DEV &&
  window.location.pathname.startsWith(`${import.meta.env.BASE_URL}previa/f01`)

if (naPreviaDoF01) {
  void import("@/src/previa-f01/PreviaF01").then(({ PreviaF01 }) =>
    createRoot(elemento).render(<PreviaF01 />),
  )
} else {
  createRoot(elemento).render(<Aplicacao />)
}
