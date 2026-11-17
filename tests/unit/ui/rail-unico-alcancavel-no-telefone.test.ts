import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// P2 — o conteúdo ÚNICO do trilho passou a existir abaixo de 1024px.
//
// Os dois trilhos da P2 são `hidden … lg:block`: abaixo de 1024px eles não
// existem para ninguém. Parte do que carregam é complemento do que já está na
// coluna principal, e complemento pode sumir — mas o que só existe ali não
// pode. O que a P2 fez:
//
//   eb36b3a (/inicio)     — /guide, /explorar/servicos e /localidade não estão
//                           entre os hrefs visíveis de /inicio a 375/768
//                           (medido: /recommendations, /recommendations?aba=request,
//                           /events/<id>, /inicio, /explorar, /communities).
//                           O conteúdo único desce como disclosure FECHADO logo
//                           depois do lançador de intenções.
//   dbdf984 (/community)  — a lista de próximos eventos, a de grupos ativos e as
//                           regras da comunidade não existem em outro lugar da
//                           rota; a leitura virou o hook useFeedRailData para que
//                           trilho e disclosure sejam duas montagens do MESMO dado.
//
// A propriedade travada aqui, nas duas rotas:
//   - o bloco de conteúdo ÚNICO (o disclosure) NÃO está preso a `hidden lg:block`;
//   - o bloco DUPLICADO (o <aside> do trilho) CONTINUA preso;
//   - e o disclosure está de fato MONTADO na página — componente que existe mas
//     não é montado não alcança ninguém.
//
// LIMITE DESTA PROVA: é leitura de fonte, não comportamento. Nenhum breakpoint é
// medido em navegador aqui. Ela falha no dia em que alguém reintroduzir o
// `hidden lg:block` no bloco único, ou apagar a montagem do disclosure.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

// /inicio mudou em 25/09/2026: o disclosure "Atalhos da home" saiu. A mesma
// propriedade continua travada, agora provada pelo outro lado — cada destino do
// trilho (preso a >=1024px) tem porta visível no telefone em OUTRO lugar.
describe("/inicio: o que o trilho oferece continua alcançável no telefone", () => {
  const rail = read("apps", "web", "app", "(shell)", "inicio", "right-rail.tsx")
  // RUN-181: a pasta `(shell)/explorar` saiu inteira (307 para /app/busca). As
  // três provas que liam aqueles arquivos relocam para telas que sobrevivem: os
  // atalhos do Início (que herdam a grade do Explorar, agora apontando para o
  // app) e o detalhe da comunidade, onde "Trocar de cidade" segue de pé. Ler
  // arquivo removido quebraria com ENOENT — a lição do LT-002.
  const atalhos = read("apps", "web", "app", "(shell)", "inicio", "hub-shortcuts.tsx")
  const comunidade = read(
    "apps",
    "web",
    "app",
    "(shell)",
    "communities",
    "[id]",
    "community-detail-screen.tsx",
  )
  const shell = read("apps", "web", "app", "components", "bivaque", "app-shell.tsx")
  const page = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")

  it("o trilho continua preso a >=1024px", () => {
    expect(rail).toContain('<aside className="hidden w-80 shrink-0 lg:block"')
  })

  it("o Guia do trilho tem porta no Início", () => {
    expect(rail).toContain('action="/guide"')
    expect(atalhos).toContain('href: "/guide"')
    // O atalho de Serviços do mesmo bloco agora abre a busca do app.
    expect(atalhos).toContain('href: "/app/busca"')
  })

  it("'De mudança?' tem porta fora do trilho", () => {
    // CIDADE-169: o trilho aponta para a consulta no app; o endereço antigo
    // (/localidade) ainda tem porta viva no detalhe da comunidade e responde
    // 307 para a mesma tela (provado em lan-troca).
    expect(rail).toContain('href={"/app/cidade/atual" as Route}')
    expect(comunidade).toContain('href="/localidade"')
  })

  it("Indicações tem porta no cabeçalho, em toda largura", () => {
    expect(shell).toContain('href="/community?vista=indicacoes"')
  })

  it("abaixo de 1024px a agenda da semana desce para a coluna principal", () => {
    // A mesma leitura (hub.data.events) monta o trilho e o carrossel.
    expect(rail).toContain("<WeekEventsList state={events}")
    expect(page).toMatch(
      /<div className="lg:hidden">\s*<WeekEventsCarousel state=\{hub\.data\.events\}/,
    )
    expect(page).toMatch(/<div className="lg:hidden">\s*<MovingCard \/>/)
  })
})

// O trilho da Comunidade (feed-right-rail) servia a vista "Conversa", que saiu
// da rota no lote 5 N2: o feed da cidade mora no Início e a Comunidade ficou com
// os cabeçalhos e o painel de Indicações. Sem a vista, não há painel único a
// descer no telefone nesta rota — a trava de "conteúdo único alcançável" que
// morava aqui não tem mais objeto. O módulo continua no repositório até a
// limpeza da vista antiga decidir o destino dele.
