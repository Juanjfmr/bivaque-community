import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"

import { ROTAS } from "@/lib/navegacao/rotas"
import { Casca } from "@/src/casca/Casca"
import { TelaDeProva } from "@/src/telas/TelaDeProva"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A árvore de rotas, montada a partir do catálogo. O TanStack Router é o único
 * dono do histórico: tudo aqui passa por ele, nada por `pushState` cru.
 */
const raiz = createRootRoute({
  component: Casca,
  notFoundComponent: () => <TelaIndisponivel />,
})

// `/app` é a raiz da base: mostra o Início no próprio endereço.
const indice = createRoute({
  getParentRoute: () => raiz,
  path: "/",
  component: () => <TelaDeProva nome="inicio" />,
})

const paginas = ROTAS.filter(
  (rota) => rota.nome !== "mercado" && rota.nome !== "indisponivel",
).flatMap((rota) => {
  const Tela = () => <TelaDeProva nome={rota.nome} />
  const definicoes = [
    createRoute({ getParentRoute: () => raiz, path: rota.caminho, component: Tela }),
  ]
  if (rota.caminhoSemParametro !== null) {
    definicoes.push(
      createRoute({ getParentRoute: () => raiz, path: rota.caminhoSemParametro, component: Tela }),
    )
  }
  return definicoes
})

// Mercado é rota adicional: mostra as sub-abas com Desapegos selecionado, sem
// tirar a pessoa do endereço /app/mercado.
const mercado = createRoute({
  getParentRoute: () => raiz,
  path: "/mercado",
  component: () => <TelaDeProva nome="mercado" />,
})

const arvore = raiz.addChildren([indice, ...paginas, mercado])

export const roteador = createRouter({
  basepath: "/app",
  routeTree: arvore,
  // A rolagem é da entrada do app, restaurada pela camada fina depois da carga.
  scrollRestoration: false,
  defaultNotFoundComponent: () => <TelaIndisponivel />,
})
