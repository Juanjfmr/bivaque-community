/**
 * A superfície pública do portão de entrada — uma lista e três modos de casa.
 *
 * Antes desta lista, `apps/web/proxy.ts` comparava prefixo solto
 * (`pathname.startsWith(caminho)`), e por isso `/apiario` entrava como `/api`.
 * A comparação por fronteira (`casaFronteira`) exige que o que vem depois do
 * prefixo seja `/` ou o fim do caminho.
 *
 * Modos:
 * - `exata`: o caminho e a variante com barra final.
 * - `pasta`: o caminho e a subárvore (`/api` e `/api/qualquer`, nunca `/apiario`).
 * - `ativos`: só a subárvore (`/landing/hero.webp`, nunca `/landing`); é o
 *   espaço de assets, não de páginas.
 *
 * `/landing` é o caso que motivou o modo `ativos`: não existe página em
 * `apps/web/app/landing/`, mas `apps/web/public/landing/` guarda os assets da
 * landing anônima (`apps/web/app/landing/landing.tsx`). O
 * caminho exato `/landing` é redirecionado para `/` em `apps/web/next.config.ts`;
 * os assets continuam públicos e em 200.
 *
 * Decisão: `docs/decisions/ADR-20261110-superficie-publica-do-proxy.md`.
 */

export type ModoDaEntrada = "exata" | "pasta" | "ativos"

export type EntradaDaSuperficie = Readonly<{
  /** Caminho canônico, sempre começando com `/` e sem barra final. */
  readonly caminho: string
  readonly modo: ModoDaEntrada
  /** Por que este caminho é público. Sem isto, o próximo leitor só adivinha. */
  readonly motivo: string
}>

export const PUBLIC_SURFACE: readonly EntradaDaSuperficie[] = [
  {
    caminho: "/auth/callback",
    modo: "exata",
    motivo: "troca do código OAuth: a sessão nasce nesta resposta",
  },
  {
    caminho: "/auth/callback-error",
    modo: "exata",
    motivo: "erro do OAuth precisa de tela antes de existir sessão",
  },
  {
    caminho: "/consent",
    modo: "exata",
    motivo: "consentimento do cadastro, antes da admissão",
  },
  {
    caminho: "/privacidade",
    modo: "exata",
    motivo: "página legal: leitura sem conta",
  },
  {
    caminho: "/codigo-de-conduta",
    modo: "exata",
    motivo: "página legal: leitura sem conta",
  },
  {
    caminho: "/termos-de-uso",
    modo: "exata",
    motivo: "página legal: leitura sem conta",
  },
  {
    caminho: "/api",
    modo: "pasta",
    motivo: "cada rota declara a própria postura em lib/security/api-surface.ts",
  },
  {
    caminho: "/_next",
    modo: "ativos",
    motivo: "assets do Next; o matcher já exclui _next/static e _next/image",
  },
  {
    caminho: "/landing",
    modo: "ativos",
    motivo: "assets de public/landing; /landing exato redireciona para / no next.config.ts",
  },
  {
    caminho: "/conta-apagada",
    modo: "exata",
    motivo: "destino pós-exclusão, quando a sessão já não existe",
  },
  {
    caminho: "/ajuda",
    modo: "exata",
    motivo: "Ajuda e páginas legais abrem para quem está fora",
  },
  {
    caminho: "/favicon.ico",
    modo: "exata",
    motivo: "ícone pedido pelo navegador em qualquer página",
  },
  {
    caminho: "/icon.svg",
    modo: "exata",
    motivo: "ícone pedido pelo navegador em qualquer página",
  },
  {
    caminho: "/app",
    modo: "pasta",
    motivo: "SPA em /app: entrada /app/entrar e assets; a sessão é resolvida nas rotas /api/app",
  },
]

function semBarraFinal(caminho: string): string {
  return caminho.length > 1 && caminho.endsWith("/") ? caminho.slice(0, -1) : caminho
}

/**
 * Casa fronteira: o caminho é igual ao prefixo ou continua a partir de `/`.
 * `/api` casa `/api` e `/api/x`; não casa `/apiario`. `/conta-apagada` casa
 * `/conta-apagada/`; não casa `/conta-apagada/x` porque essa entrada é `exata`.
 */
export function casaFronteira(caminho: string, prefixo: string): boolean {
  const alvo = semBarraFinal(caminho)
  const base = semBarraFinal(prefixo)
  return alvo === base || alvo.startsWith(`${base}/`)
}

function casaExata(caminho: string, entrada: string): boolean {
  return semBarraFinal(caminho) === semBarraFinal(entrada)
}

function casaSomenteSubarvore(caminho: string, entrada: string): boolean {
  const base = semBarraFinal(entrada)
  // Exige algo depois da barra: `/landing/` é a variante com barra final do
  // caminho exato, não um asset, e fica fechada como `/landing`.
  return caminho.startsWith(`${base}/`) && caminho.length > base.length + 1
}

/** O caminho é público pela lista acima? */
export function isPublicPath(caminho: string): boolean {
  const alvo = caminho.startsWith("/") ? caminho : `/${caminho}`
  return PUBLIC_SURFACE.some((entrada) => {
    switch (entrada.modo) {
      case "exata":
        return casaExata(alvo, entrada.caminho)
      case "pasta":
        return casaFronteira(alvo, entrada.caminho)
      case "ativos":
        return casaSomenteSubarvore(alvo, entrada.caminho)
      default:
        return false
    }
  })
}
