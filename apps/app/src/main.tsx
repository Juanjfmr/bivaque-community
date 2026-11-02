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

// Prévias clicáveis da régua Nextdoor (01/11/2026): só no servidor de
// desenvolvimento, fora do roteador e da casca. `import.meta.env.DEV` fica
// direto no `if`, para o build de produção eliminar o ramo e não levar as prévias.
const caminho = window.location.pathname
const prefixo = `${import.meta.env.BASE_URL}previa/`

if (import.meta.env.DEV && caminho.startsWith(`${prefixo}f01`)) {
  void import("@/src/previa-f01/PreviaF01").then(({ PreviaF01 }) =>
    createRoot(elemento).render(<PreviaF01 />),
  )
} else if (import.meta.env.DEV && caminho.startsWith(`${prefixo}grupos`)) {
  void import("@/src/previa-grupos/PreviaGrupos").then(({ PreviaGrupos }) =>
    createRoot(elemento).render(<PreviaGrupos />),
  )
} else if (import.meta.env.DEV && caminho.startsWith(`${prefixo}pecas`)) {
  void import("@/src/pecas/GaleriaDePecas").then(({ GaleriaDePecas }) =>
    createRoot(elemento).render(<GaleriaDePecas />),
  )
} else {
  createRoot(elemento).render(<Aplicacao />)
}
