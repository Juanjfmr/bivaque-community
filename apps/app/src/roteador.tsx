import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import type { ComponentType } from "react"

import { ROTAS } from "@/lib/navegacao/rotas"
import { Casca } from "@/src/casca/Casca"
import { TelaGaleria } from "@/src/galeria/TelaGaleria"
import { modoDeProvaAtivo } from "@/src/modo-de-prova"
import { Agenda } from "@/src/telas/Agenda"
import { Ajuda } from "@/src/telas/Ajuda"
import { Anuncio } from "@/src/telas/Anuncio"
import { ApagarConta } from "@/src/telas/ApagarConta"
import { Bloqueados } from "@/src/telas/Bloqueados"
import { Busca } from "@/src/telas/Busca"
import { Chamados } from "@/src/telas/Chamados"
import { Comunidade } from "@/src/telas/Comunidade"
import { Conduta } from "@/src/telas/Conduta"
import { Contato } from "@/src/telas/Contato"
import { Conversa } from "@/src/telas/Conversa"
import { Conversas } from "@/src/telas/Conversas"
import { Dono } from "@/src/telas/Dono"
import { Entrar } from "@/src/telas/Entrar"
import { Evento } from "@/src/telas/Evento"
import { Grupo } from "@/src/telas/Grupo"
import { Guia } from "@/src/telas/Guia"
import { Inicio } from "@/src/telas/Inicio"
import { Catalogo, Desapegos, Imoveis, Mercado, Negocios } from "@/src/telas/Mercado"
import { MeusAnuncios } from "@/src/telas/MeusAnuncios"
import { Minhas } from "@/src/telas/Minhas"
import { Negocio } from "@/src/telas/Negocio"
import { Ocultados } from "@/src/telas/Ocultados"
import { Pedido } from "@/src/telas/Pedido"
import { Pedidos } from "@/src/telas/Pedidos"
import { Pergunta } from "@/src/telas/Pergunta"
import { Privacidade } from "@/src/telas/Privacidade"
import { Publicacao } from "@/src/telas/Publicacao"
import { Salvos } from "@/src/telas/Salvos"
import { TelaDeProva } from "@/src/telas/TelaDeProva"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"
import { Voce } from "@/src/telas/Voce"

/**
 * A árvore de rotas, montada a partir do catálogo. O TanStack Router é o único
 * dono do histórico: tudo aqui passa por ele, nada por `pushState` cru.
 */
const raiz = createRootRoute({
  component: Casca,
  notFoundComponent: () => <TelaIndisponivel />,
})

/**
 * As telas reais do produto entram aqui conforme cada onda. Fora do modo de
 * prova, a rota usa a tela real; em modo de prova continua valendo a tela de
 * prova, que é o instrumento da bateria da onda 1 — a medição antiga não muda
 * até a revisão do instrumento de cada onda.
 */
const TELAS_REAIS: Readonly<Partial<Record<string, ComponentType>>> = {
  ajuda: Ajuda,
  anuncio: Anuncio,
  "apagar-conta": ApagarConta,
  bloqueados: Bloqueados,
  chamados: Chamados,
  conduta: Conduta,
  contato: Contato,
  dono: Dono,
  entrar: Entrar,
  ocultados: Ocultados,
  privacidade: Privacidade,
  voce: Voce,
  conversa: Conversa,
  conversas: Conversas,
  negocio: Negocio,
  agenda: Agenda,
  busca: Busca,
  catalogo: Catalogo,
  comunidade: Comunidade,
  desapegos: Desapegos,
  evento: Evento,
  grupo: Grupo,
  guia: Guia,
  imoveis: Imoveis,
  inicio: Inicio,
  mercado: Mercado,
  "meus-anuncios": MeusAnuncios,
  pedido: Pedido,
  pedidos: Pedidos,
  minhas: Minhas,
  negocios: Negocios,
  pergunta: Pergunta,
  publicacao: Publicacao,
  salvos: Salvos,
}

function TelaDaRota({ nome }: { nome: string }) {
  const Real = modoDeProvaAtivo() ? undefined : TELAS_REAIS[nome]
  return Real === undefined ? <TelaDeProva nome={nome} /> : <Real />
}

// `/app` é a raiz da base: mostra o Início no próprio endereço.
const indice = createRoute({
  getParentRoute: () => raiz,
  path: "/",
  component: () => <TelaDaRota nome="inicio" />,
})

const paginas = ROTAS.filter(
  (rota) => rota.nome !== "mercado" && rota.nome !== "indisponivel",
).flatMap((rota) => {
  const Tela = () => <TelaDaRota nome={rota.nome} />
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
  component: () => <TelaDaRota nome="mercado" />,
})

/**
 * A galeria de prova. **Não está no catálogo**: nenhum link do app leva até
 * ela, ela não acende aba e, sem o modo de prova ligado, o endereço é o mesmo
 * fallback de qualquer endereço fora do catálogo. É andaime de bateria, não
 * tela de produto.
 */
const galeria = createRoute({
  getParentRoute: () => raiz,
  path: "/galeria",
  component: () => (modoDeProvaAtivo() ? <TelaGaleria /> : <TelaIndisponivel />),
})

const arvore = raiz.addChildren([indice, ...paginas, mercado, galeria])

export const roteador = createRouter({
  basepath: "/app",
  routeTree: arvore,
  // A rolagem é da entrada do app, restaurada pela camada fina depois da carga.
  scrollRestoration: false,
  defaultNotFoundComponent: () => <TelaIndisponivel />,
})
