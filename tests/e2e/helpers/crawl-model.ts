// Modelo do rastreador de links em runtime (tests/e2e/link-crawl.spec.ts).
//
// scripts/visual/flows/reachability.mjs lê só href literal: link montado em execução não aparece,
// e pedaço de concatenação vira falso "link quebrado". O rastreador anda no app de verdade, como
// cada persona, e segue todo <a href> que a tela renderiza. Este módulo é a parte sem navegador:
// que rotas existem, como um href vira rota, e o que ainda falta visitar.
//
// Sem Playwright aqui, para o teste de unidade exercitar as regras.

export interface RoutePattern {
  /** Forma canônica, com segmentos dinâmicos: "/pedidos/[id]". */
  readonly route: string
  readonly kind: "page" | "handler"
  readonly regex: RegExp
  /** Estáticas vencem dinâmicas quando as duas casam ("/pedidos/novo" x "/pedidos/[id]"). */
  readonly dynamicSegments: number
}

/** "(shell)/pedidos/[id]/page.tsx" -> "/pedidos/[id]". Grupos entre parênteses somem da URL. */
export function routeFromFile(file: string): string {
  const parts = file
    .replaceAll("\\", "/")
    .split("/")
    .slice(0, -1)
    .filter((part) => part !== "" && !(part.startsWith("(") && part.endsWith(")")))
  return `/${parts.join("/")}`
}

export function buildPatterns(pageFiles: string[], handlerFiles: string[]): RoutePattern[] {
  const make = (file: string, kind: RoutePattern["kind"]): RoutePattern => {
    const route = routeFromFile(file)
    const segments = route.split("/").filter(Boolean)
    const body = segments
      .map((segment) => {
        if (segment.startsWith("[[...") || segment.startsWith("[...")) return "(?:/.*)?"
        if (segment.startsWith("[")) return "/[^/]+"
        return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      })
      .join("")
    return {
      route,
      kind,
      regex: new RegExp(`^${body === "" ? "/" : body}/?$`),
      dynamicSegments: segments.filter((segment) => segment.startsWith("[")).length,
    }
  }
  const all = [
    ...pageFiles.map((file) => make(file, "page")),
    ...handlerFiles.map((file) => make(file, "handler")),
  ]
  return all.sort((a, b) => a.dynamicSegments - b.dynamicSegments)
}

export function matchRoute(pathname: string, patterns: RoutePattern[]): RoutePattern | null {
  return patterns.find((pattern) => pattern.regex.test(pathname)) ?? null
}

/**
 * O href como o app o renderizou -> caminho interno a visitar, ou null quando não é navegação
 * interna (outro domínio, mailto:, tel:, âncora da própria página, javascript:).
 */
export function internalTarget(href: string, currentUrl: string): string | null {
  const trimmed = href.trim()
  if (trimmed === "" || trimmed.startsWith("#")) return null
  if (/^(mailto|tel|javascript|data|blob):/i.test(trimmed)) return null
  let url: URL
  try {
    url = new URL(trimmed, currentUrl)
  } catch {
    return null
  }
  if (url.origin !== new URL(currentUrl).origin) return null
  return `${url.pathname}${url.search}`
}

export interface Visit {
  readonly target: string
  readonly from: string
  readonly persona: string
}

/**
 * Fila de visitas com teto por rota: a mesma rota dinâmica aparece centenas de vezes (cada post,
 * cada membro), e visitar duas instâncias prova o molde sem percorrer o seed inteiro.
 */
export class Frontier {
  private readonly queue: Visit[] = []
  private readonly seen = new Set<string>()
  private readonly perRoute = new Map<string, number>()

  constructor(
    private readonly patterns: RoutePattern[],
    private readonly capPerRoute: number,
  ) {}

  /** Devolve a rota casada (ou null se não existe); só enfileira página ainda não esgotada. */
  offer(visit: Visit): RoutePattern | null {
    const pathname = visit.target.split("?")[0] ?? visit.target
    const pattern = matchRoute(pathname, this.patterns)
    if (!pattern || pattern.kind === "handler") return pattern
    const key = `${visit.persona} ${visit.target}`
    if (this.seen.has(key)) return pattern
    const count = this.perRoute.get(`${visit.persona} ${pattern.route}`) ?? 0
    if (count >= this.capPerRoute) return pattern
    this.seen.add(key)
    this.perRoute.set(`${visit.persona} ${pattern.route}`, count + 1)
    this.queue.push(visit)
    return pattern
  }

  /**
   * Entrada declarada: enfileira mesmo com a rota já no teto. Uma tela pode viver atrás de
   * `?tab=` — a mesma rota com outra query é outra tela, e o teto por rota descartaria a segunda
   * porta. Continua deduplicando pelo par persona+target e contando no `perRoute`.
   */
  enter(visit: Visit): RoutePattern | null {
    const pathname = visit.target.split("?")[0] ?? visit.target
    const pattern = matchRoute(pathname, this.patterns)
    if (!pattern || pattern.kind === "handler") return pattern
    const key = `${visit.persona} ${visit.target}`
    if (this.seen.has(key)) return pattern
    this.seen.add(key)
    const routeKey = `${visit.persona} ${pattern.route}`
    this.perRoute.set(routeKey, (this.perRoute.get(routeKey) ?? 0) + 1)
    this.queue.push(visit)
    return pattern
  }

  next(): Visit | undefined {
    return this.queue.shift()
  }
}

export interface AllowedUnreached {
  readonly route: string
  /** Por onde se chega de verdade: e-mail, link compartilhado, botão que navega por código. */
  readonly porta: string
  /**
   * O link desta porta só aparece em certo estado dos dados: ser alcançada por link NÃO a torna
   * velha, só deixar de existir torna.
   */
  readonly dependeDeDados?: boolean
}

/** Rotas de página que nenhuma persona alcançou e que não têm porta declarada. */
export function unreachedRoutes(
  patterns: RoutePattern[],
  reached: Set<string>,
  allowed: readonly AllowedUnreached[],
): string[] {
  const declared = new Set(allowed.map((entry) => entry.route))
  return patterns
    .filter((pattern) => pattern.kind === "page")
    .map((pattern) => pattern.route)
    .filter((route) => !reached.has(route) && !declared.has(route))
    .sort()
}

/** Exceções que ficaram velhas: a rota foi alcançada por link, ou deixou de existir. */
export function staleAllowances(
  patterns: RoutePattern[],
  reached: Set<string>,
  allowed: readonly AllowedUnreached[],
): string[] {
  const pages = new Set(patterns.filter((p) => p.kind === "page").map((p) => p.route))
  return allowed
    .filter((entry) =>
      entry.dependeDeDados
        ? !pages.has(entry.route)
        : reached.has(entry.route) || !pages.has(entry.route),
    )
    .map((entry) => entry.route)
    .sort()
}
