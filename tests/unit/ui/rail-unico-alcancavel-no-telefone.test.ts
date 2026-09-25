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

describe("/inicio: os atalhos de conteúdo único alcançam o telefone", () => {
  const source = read("apps", "web", "app", "(shell)", "inicio", "right-rail.tsx")
  const page = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")
  const disclosure = functionBody(source, "InicioRailDisclosure")
  const duplicateRail = functionBody(source, "InicioRightRail")
  const uniqueContent = functionBody(source, "HomeShortcutCards")

  it("o bloco de conteúdo único NÃO está preso a hidden lg:block", () => {
    expect(disclosure).not.toMatch(PINNED_TO_DESKTOP)
    // E o contrário está dito: ele existe abaixo de 1024px, então some a partir
    // de 1024px, onde o trilho completo volta.
    expect(disclosure).toContain("lg:hidden")
  })

  it("o bloco duplicado — o próprio trilho — CONTINUA preso", () => {
    expect(duplicateRail).toMatch(PINNED_TO_DESKTOP)
    expect(duplicateRail).toContain("w-72")
  })

  it("o disclosure monta o MESMO conteúdo único do trilho", () => {
    // Uma fonte só: se o disclosure montasse uma cópia, tirar um atalho do
    // trilho deixaria a cópia viva (ou o contrário).
    expect(disclosure).toContain("HomeShortcutCards")
    expect(duplicateRail).toContain("HomeShortcutCards")
  })

  it("o conteúdo único é exatamente o que não existe em outro lugar da rota", () => {
    // Os três destinos únicos vivem numa tabela só, e o card que o disclosure
    // monta renderiza essa tabela: tirar um atalho daqui tira das duas
    // montagens, que é o que uma fonte única deve fazer.
    const tabela = source.slice(
      source.indexOf("const SHORTCUTS"),
      source.indexOf("export function InicioRightRail"),
    )
    for (const href of ['"/explorar/servicos"', '"/guide"']) {
      expect(tabela, href).toContain(href)
    }
    // /localidade é o card "De mudança?", separado dos atalhos e fora da tabela.
    expect(uniqueContent, "/localidade").toContain('"/localidade"')
    expect(uniqueContent).toContain("SHORTCUTS.map(")
    // O complemento fica fora do disclosure: "Seu próximo encontro" é o mesmo
    // evento, do mesmo loader, que o feed já desenha — repeti-lo no telefone
    // seria ruído.
    expect(uniqueContent).not.toContain("NextMeetingCard")
  })

  it("a página MONTA o disclosure, logo depois do lançador de intenções", () => {
    expect(page).toContain("<InicioRailDisclosure />")
    const launcher = page.indexOf("<IntentLauncher")
    const mounted = page.indexOf("<InicioRailDisclosure />")
    expect(launcher).toBeGreaterThan(-1)
    expect(mounted).toBeGreaterThan(launcher)
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
    expect(duplicateRail).toMatch(PINNED_TO_DESKTOP)
    expect(duplicateRail).toContain("w-72")
  })

  it("o disclosure monta o MESMO painel do trilho", () => {
    expect(disclosure).toContain("FeedRailPanels")
    expect(duplicateRail).toContain("FeedRailPanels")
  })

  it("o painel carrega o que a rota não dá em nenhum outro lugar", () => {
    const panels = functionBody(source, "FeedRailPanels")
    expect(panels).toContain("Proximos eventos")
    expect(panels).toContain("Grupos ativos")
    expect(panels).toContain("Boas praticas")
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
