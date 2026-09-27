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

/** O bloco `className="…"` que prende um elemento a ≥1024px e o esconde abaixo. */
const PINNED_TO_DESKTOP = /className="[^"]*\bhidden\b[^"]*\blg:block\b[^"]*"/

/** Recorta o corpo de uma função pelo nome, até o primeiro `}` na coluna 0. O
 *  corpo aninhado é indentado, então `\n}` só fecha a própria função. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  expect(start, `função ${name} existe`).toBeGreaterThan(-1)
  const end = source.indexOf("\n}", start)
  expect(end, `função ${name} fecha`).toBeGreaterThan(-1)
  return source.slice(start, end)
}

// /inicio mudou em 25/09/2026: o disclosure "Atalhos da home" saiu. A mesma
// propriedade continua travada, agora provada pelo outro lado — cada destino do
// trilho (preso a >=1024px) tem porta visível no telefone em OUTRO lugar.
describe("/inicio: o que o trilho oferece continua alcançável no telefone", () => {
  const rail = read("apps", "web", "app", "(shell)", "inicio", "right-rail.tsx")
  const explorar = read("apps", "web", "app", "(shell)", "explorar", "page.tsx")
  const busca = read("apps", "web", "app", "(shell)", "explorar", "busca", "page.tsx")
  const shell = read("apps", "web", "app", "components", "bivaque", "app-shell.tsx")
  const page = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")

  it("o trilho continua preso a >=1024px", () => {
    expect(rail).toContain('<aside className="hidden w-80 shrink-0 lg:block"')
  })

  it("o Guia do trilho tem porta no Explorar", () => {
    expect(rail).toContain('action="/guide"')
    expect(explorar).toContain('href: "/guide"')
    expect(explorar).toContain('href: "/explorar/servicos"')
  })

  it("'De mudança?' tem porta fora do trilho", () => {
    expect(rail).toContain('href="/localidade"')
    expect(busca).toContain('href="/localidade"')
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

describe("/community: eventos, grupos e boas práticas alcançam o telefone", () => {
  const source = read("apps", "web", "app", "components", "bivaque", "feed-right-rail.tsx")
  const page = read("apps", "web", "app", "(shell)", "community", "page.tsx")
  const disclosure = functionBody(source, "FeedRailDisclosure")
  const duplicateRail = functionBody(source, "FeedRightRail")

  it("o bloco de conteúdo único NÃO está preso a hidden lg:block", () => {
    expect(disclosure).not.toMatch(PINNED_TO_DESKTOP)
    expect(disclosure).toContain("lg:hidden")
  })

  it("o bloco duplicado — o próprio trilho — CONTINUA preso", () => {
    // A largura mudou com o sistema visual mínimo (w-72 → w-80, 25/09/2026); o
    // que se trava é o trilho continuar só do desktop e com largura fixa.
    expect(duplicateRail).toMatch(PINNED_TO_DESKTOP)
    expect(duplicateRail).toMatch(/\bw-\d+\b/)
  })

  it("o disclosure monta o MESMO painel do trilho", () => {
    expect(disclosure).toContain("FeedRailPanels")
    expect(duplicateRail).toContain("FeedRailPanels")
  })

  it("o painel carrega o que a rota não dá em nenhum outro lugar", () => {
    const panels = functionBody(source, "FeedRailPanels")
    expect(panels).toContain("Próximos encontros")
    expect(panels).toContain("Grupos ativos")
    expect(panels).toContain("Boas práticas")
  })

  it("o dado do trilho e do disclosure vem de UMA leitura", () => {
    // Duas instâncias consultando por conta própria dobrariam as consultas; o
    // hook é o que garante que as duas montagens mostram o mesmo dado. A página
    // chama a leitura UMA vez e entrega o mesmo objeto às duas montagens.
    //
    // O `enabled` que o commit dbdf984 documentou saiu no 27a8baa (serializava a
    // leitura atrás da resolução de membership: medido 2.360 ms → ~4.700 ms). A
    // asserção é sobre a fonte ÚNICA do dado, não sobre o portão — o portão era
    // decisão de latência, e afirmá-lo aqui travaria uma otimização legítima.
    expect(source).toContain("useFeedRailData")
    const chamadas = page.match(/useFeedRailData\(/g) ?? []
    expect(chamadas.length, "uma leitura só para as duas montagens").toBe(1)
    expect(page).toContain("<FeedRailDisclosure data={railData} />")
    expect(page).toContain("<FeedRightRail data={railData} />")
  })
})
