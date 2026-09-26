import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { showsCreateAction } from "../../../apps/web/app/components/shell/create-visibility"

// O botão de criação mora no shell (25/09/2026): toda rota do membro, menos
// onde cobriria o campo de mensagem ou competiria com a ação de um formulário.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

describe("onde o botão de criação aparece", () => {
  it.each([
    "/inicio",
    "/explorar",
    "/communities",
    "/communities/abc",
    "/community",
    "/profile",
    "/mercado",
    "/mercado/abc",
    "/events",
    "/messages",
    "/pedidos",
    "/guide",
    "/inicio/",
  ])("aparece em %s", (path) => {
    expect(showsCreateAction(path)).toBe(true)
  })

  it.each([
    "/messages/abc",
    "/pedidos/abc",
    "/pedidos/novo",
    "/mercado/novo",
    "/mercado/abc/editar",
    "/imoveis/novo",
    "/events/novo",
    "/events/abc/editar",
    "/events/abc/perguntas",
    "/denuncias/nova",
    "/guide/sugerir",
    "/guide/abc/correcao",
    "/communities/abc/invite",
    "/communities/abc/indicar-prestador",
    "/configuracoes",
    "/configuracoes/conta",
    "/cidade/00000000-0000-4000-8000-000000000001",
  ])("some em %s", (path) => {
    expect(showsCreateAction(path)).toBe(false)
  })
})

describe("montagem no shell", () => {
  const shell = read("apps", "web", "app", "components", "bivaque", "app-shell.tsx")
  const menu = read("apps", "web", "app", "components", "shell", "create-menu.tsx")
  const inicio = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")

  it("o shell monta o botão flutuante e o Criar do cabeçalho pela mesma regra", () => {
    expect(shell).toContain("const showCreate = showsCreateAction(pathname)")
    expect(shell).toContain("{showCreate ? <CreateFab onAsk={openAsk} /> : null}")
    expect(shell).toContain("{showCreate ? <CreateButton onAsk={openAsk} /> : null}")
  })

  it("o compositor do shell só é baixado quando alguém pede", () => {
    expect(shell).toContain("dynamic(")
    expect(shell).toContain("{askOpen ? (")
  })

  // No celular a linha de busca recolhe ao rolar para baixo e volta ao subir;
  // aberta a tela ela está à vista, e não some enquanto alguém digita.
  it("a busca do cabeçalho do celular cede espaço ao ler e não some digitando", () => {
    expect(shell).toContain("useHideOnScroll({ keepWhileFocused: searchRowRef })")
    expect(shell).toContain("inert={searchHidden}")
    const hook = read("apps", "web", "app", "components", "shell", "use-hide-on-scroll.ts")
    expect(hook).toContain("keepWhileFocused?.current?.contains(document.activeElement)")
  })

  it("o menu fecha com Esc e devolve o foco a quem abriu", () => {
    expect(menu).toContain('event.key === "Escape"')
    expect(menu).toContain("triggerRef.current?.focus()")
    expect(menu).toContain("aria-expanded={open}")
    expect(menu).toContain('<div className="md:hidden">')
  })

  // Rolar para baixo tira o botão do caminho do conteúdo; ele continua na ordem
  // de foco (sem inert nem aria-hidden) e o foco o traz de volta.
  it("o botão flutuante sai ao rolar para baixo sem sumir do teclado", () => {
    // A regra de rolagem é compartilhada com a busca do cabeçalho do celular.
    expect(menu).toContain("useHideOnScroll({ disabled: open })")
    const hook = read("apps", "web", "app", "components", "shell", "use-hide-on-scroll.ts")
    expect(hook).toContain('document.querySelector("main")')
    expect(menu).toContain("onFocus={reveal}")
    expect(menu).toContain("motion-reduce:transition-none")
    const fab = menu.slice(menu.indexOf("export function CreateFab"))
    expect(fab.slice(0, fab.indexOf("export function CreateButton"))).not.toContain("inert")
  })

  it("a página Comunidade recarrega o feed quando o shell publica", () => {
    const community = read("apps", "web", "app", "(shell)", "community", "page.tsx")
    expect(community).toContain("window.addEventListener(POST_CREATED_EVENT, handleCreated)")
    expect(community).toContain("window.removeEventListener(POST_CREATED_EVENT, handleCreated)")
  })

  it("o Início não monta um segundo botão e recarrega quando o shell publica", () => {
    expect(inicio).not.toContain("<CreateFab")
    expect(inicio).not.toContain("<CreateButton")
    expect(inicio).toContain("window.addEventListener(POST_CREATED_EVENT, handleCreated)")
  })
})
