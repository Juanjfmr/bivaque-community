import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import type { ReactNode } from "react"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { transformWithEsbuild } from "vite"
import { describe, expect, it } from "vitest"

// RECON-033 — fidelidade das telas de operação (pranchas 57/58) e das
// divergências obrigatórias da fila.
//
// RECON-036 — o bloco do shell foi substituído: asserir substring do
// arquivo-fonte (label: "Admissões") passava com a navegação quebrada, com
// link morto e sem estado ativo. O shell agora é provado no HTML que o
// próprio componente renderiza. O Vitest da casa roda em node, sem DOM e sem
// o pipeline JSX do Next (apps/web/tsconfig.json usa "jsx": "preserve"),
// então o módulo é compilado aqui com o esbuild do Vite e avaliado com um
// shim de require que só stuba a fronteira do Next (link/navegação) e os
// wrappers mockáveis; react, react-dom e lucide-react são os reais — o SVG
// com classe "lucide" no HTML provém da biblioteca, não de um espelho.
//
// Os demais guardas continuam na fonte porque protegem arquivos que esta
// tarefa não toca.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8")

const adminLayout = read("apps", "web", "app", "(admin)", "layout.tsx")
const operatorShell = read("apps", "web", "app", "components", "shell", "operator-shell.tsx")
const reportsPage = read("apps", "web", "app", "(admin)", "reports", "page.tsx")
const communityScreen = read(
  "apps",
  "web",
  "app",
  "(shell)",
  "communities",
  "[id]",
  "community-detail-screen.tsx",
)
const reportButton = read("apps", "web", "app", "components", "bivaque", "report-button.tsx")
const reportActions = read("apps", "web", "app", "components", "bivaque", "report-actions.ts")

// ── render harness ──────────────────────────────────────────────────────────

let currentPath = "/admissions"

function LinkStub(props: { href: string; children?: ReactNode; [rest: string]: unknown }) {
  const { children, ...rest } = props
  return createElement("a", rest, children)
}

// O stub carrega o valor real do pacote de tokens, lido do mesmo arquivo que
// o componente importa — a asserção é no cabeçalho renderizado, não aqui.
const productName = /productName:\s*"([^"]+)"/.exec(
  read("packages", "tokens", "src", "index.ts"),
)?.[1]

const stubs = new Map<string, Record<string, unknown>>([
  ["next/link", { __esModule: true, default: LinkStub }],
  [
    "next/navigation",
    {
      usePathname: () => currentPath,
      useRouter: () => ({ replace: () => {}, refresh: () => {}, push: () => {} }),
    },
  ],
  ["@bivaque/tokens", { brandTokens: { productName } }],
  [
    "../../../lib/supabase/client",
    { createBrowserClient: () => ({ auth: { signOut: async () => {} } }) },
  ],
  [
    "../bivaque/avatar",
    {
      MemberAvatar: ({ name }: { name: string }) =>
        createElement("span", { "data-member-avatar": true }, name?.charAt(0) ?? "?"),
    },
  ],
])

const webRequire = createRequire(join(root, "apps", "web", "package.json"))

function shimRequire(spec: string): Record<string, unknown> {
  const stub = stubs.get(spec)
  if (stub) return stub
  // react, react/jsx-runtime e lucide-react vêm de apps/web, como no runtime.
  return webRequire(spec) as Record<string, unknown>
}

const shellCjs = await transformWithEsbuild(operatorShell, "operator-shell.tsx", {
  loader: "tsx",
  format: "cjs",
  jsx: "automatic",
  target: "node22",
})
const shellModule = { exports: {} as Record<string, unknown> }
new Function("require", "module", "exports", shellCjs.code)(
  shimRequire,
  shellModule,
  shellModule.exports,
)
const OperatorShell = shellModule.exports.OperatorShell as (props: {
  displayName: string
  cityLabel: string | null
  children?: ReactNode
}) => ReactNode

function renderShell(pathname: string) {
  currentPath = pathname
  return renderToStaticMarkup(
    createElement(
      OperatorShell,
      { displayName: "Operador Manaus", cityLabel: "Manaus, AM" },
      createElement("p", null, "fila sob prova"),
    ),
  )
}

const OPERATOR_ENTRIES = [
  { href: "/admissions", label: "Admissões" },
  { href: "/reports", label: "Denúncias" },
  { href: "/guide-queue", label: "Guia de chegada" },
  { href: "/arrivals", label: "Chegadas" },
  // A prancha desenha Comunidades na operação; enquanto não há fila
  // operacional, a entrada aponta para o diretório do membro e fica como
  // pendência nomeada no card — não fecha o requisito da prancha.
  { href: "/communities", label: "Comunidades" },
]

function navMarkup(html: string, ariaLabel: string) {
  const start = html.indexOf(`<nav aria-label="${ariaLabel}"`)
  expect(start, `nav "${ariaLabel}" ausente no HTML renderizado`).toBeGreaterThanOrEqual(0)
  return html.slice(start, html.indexOf("</nav>", start))
}

function headerMarkup(html: string) {
  const start = html.indexOf("<header")
  expect(start).toBeGreaterThanOrEqual(0)
  return html.slice(start, html.indexOf("</header>", start))
}

describe("shell da operação (pranchas 57/58) — comportamento renderizado", () => {
  it("as telas de operação usam o shell com cabeçalho do produto", () => {
    expect(adminLayout).toContain("OperatorShell")
    expect(adminLayout).not.toContain("Painel do operador")
  })

  it("toda rota de operação tem entrada real na lateral, com destino e rótulo", () => {
    const html = renderShell("/admissions")
    const nav = navMarkup(html, "Operação")
    for (const { href, label } of OPERATOR_ENTRIES) {
      expect(nav, `entrada ${label} ausente`).toContain(`href="${href}"`)
      expect(nav, `rótulo ${label} ausente`).toContain(`<span>${label}</span>`)
    }
    // O mobile renderiza as mesmas entradas — a coluna some abaixo de md.
    const mobileNav = navMarkup(html, "Operação (mobile)")
    for (const { href, label } of OPERATOR_ENTRIES) {
      expect(mobileNav, `entrada ${label} ausente no mobile`).toContain(`href="${href}"`)
      expect(mobileNav, `rótulo ${label} ausente no mobile`).toContain(label)
    }
  })

  it("exatamente uma entrada fica marcada como atual por nav em cada rota", () => {
    for (const { href } of OPERATOR_ENTRIES) {
      // rota-raiz e rota de detalhe compartilham o estado ativo
      for (const path of [href, `${href}/registro-de-exemplo`]) {
        const html = renderShell(path)
        const current = html.match(/aria-current="page"/g) ?? []
        // uma na lateral desktop + uma na barra mobile, nunca mais
        expect(current, `aria-current em ${path}`).toHaveLength(2)
        expect(html, `${href} deveria estar ativa em ${path}`).toContain(
          `href="${href}" aria-current="page"`,
        )
        for (const other of OPERATOR_ENTRIES) {
          if (other.href === href) continue
          expect(html, `${other.label} não pode estar ativa em ${path}`).not.toContain(
            `href="${other.href}" aria-current="page"`,
          )
        }
      }
    }
  })

  it("a busca do cabeçalho envia para a busca global do produto, não para prestadores", () => {
    const html = renderShell("/admissions")
    expect(html).toMatch(/<form\b[^>]*action="\/explorar"[^>]*>/)
    expect(html).not.toContain('action="/explorar/servicos"')
    expect(html).toContain('name="search"')
    expect(html).toContain("Buscar no Bivaque")
  })

  it("há link de pular para o conteúdo e o main é o alvo focável", () => {
    const html = renderShell("/admissions")
    expect(html).toMatch(/<a href="#operacao-conteudo"[^>]*>Pular para o conteúdo<\/a>/)
    expect(html).toMatch(/<main id="operacao-conteudo" tabindex="-1"/)
  })

  it("a marca vive no cabeçalho — não só na lateral que some abaixo de md", () => {
    expect(productName, "productName não encontrado nos tokens").toBeTruthy()
    const header = headerMarkup(renderShell("/admissions"))
    expect(header).toContain(productName as string)
    expect(header).toMatch(/<a[^>]*aria-label="Bivaque, início"/)
    // palavra canônica, não inventada
    expect(operatorShell).toContain("brandTokens.productName")
    expect(operatorShell).not.toContain("COMUNIDADES DO BRASIL")
  })

  it("os ícones vêm de lucide-react — o shell não desenha SVG próprio", () => {
    const svgs = renderShell("/admissions").match(/<svg[^>]*>/g) ?? []
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg, `SVG fora do lucide: ${svg.slice(0, 80)}`).toContain("lucide")
    }
  })

  it("as duas saídas existem nas duas larguras, com a semântica em vigor", () => {
    const html = renderShell("/admissions")
    // "Voltar ao Bivaque" é link real para o produto — desktop e mobile
    const voltar = html.match(/<a[^>]*href="\/inicio"(?:(?!<\/a>)[\s\S])*Voltar ao Bivaque/g)
    expect(voltar, "saída Voltar ao Bivaque ausente ou única").toHaveLength(2)
    // "Sair da operação" é botão (encerra a sessão), não link disfarçado —
    // a semântica exata é human_decision pendente do dono (RECON-036) e a
    // prova de runtime afirma o que o botão faz: signOut e destino /login.
    expect(html.match(/Sair da operação/g)).toHaveLength(2)
    expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Sair da operação/)
    expect(html).not.toMatch(/<a[^>]*>(?:(?!<\/a>)[\s\S])*Sair da operação/)
    expect(operatorShell).toContain("supabase.auth.signOut")
  })
})

describe("fila de denúncias (prancha 58)", () => {
  it("o chip de atraso que a prancha não desenha não volta", () => {
    expect(reportsPage).not.toContain("isOverSla")
    expect(reportsPage).not.toContain("SUPPORT_SLA_HOURS")
  })

  it("o motivo é a lista fechada canônica, não busca em texto livre", () => {
    expect(reportsPage).toContain("MOTIVO_OPTIONS")
    expect(reportsPage).toMatch(/<select[^>]*name="motivo"/)
    expect(reportsPage).not.toMatch(/type="search"[\s\S]{0,80}name="motivo"/)
  })
})

describe("comunidade — pedido pendente (prancha 43)", () => {
  it("o rail Sobre a comunidade aparece também no pedido pendente", () => {
    expect(communityScreen).toMatch(
      /function PendingBody[\s\S]*?<CommunityAboutRail[\s\S]*?memberCount=\{null\}/,
    )
  })
})

describe("denúncia — lista fechada validada no servidor", () => {
  it("o modal do membro consome a lista canônica e grava pela action", () => {
    expect(reportButton).toContain("REPORT_REASONS")
    expect(reportButton).toContain("submitReportAction")
    expect(reportButton).not.toContain('from("reports").insert')
  })

  it("a action recusa categoria fora da lista antes de qualquer escrita", () => {
    expect(reportActions).toContain("isReportReasonValue")
    expect(reportActions).toContain('error: "invalid-reason"')
    expect(reportActions).toContain("EXPLANATION_MAX")
  })
})
