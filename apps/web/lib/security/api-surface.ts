/**
 * A postura de cada rota de `apps/web/app/api/**` — as 84 rotas, uma por linha,
 * com a guarda que a rota de fato usa e a prova negativa (ou o motivo explícito
 * de ser pública).
 *
 * O proxy libera `/api` inteiro por contrato (SPA ADR §5: cada rota resolve a
 * própria sessão), mas liberar o caminho não é declarar quem pode entrar. Este
 * manifesto é a declaração: oito posturas, cada rota com marcador de guarda no
 * próprio arquivo e uma citação verificável. `tests/unit/security/api-surface.test.ts`
 * falha quando aparece rota sem classificação, classificação órfã, marcador
 * ausente ou prova citada que não existe.
 *
 * Decisão: `docs/decisions/ADR-20261110-superficie-publica-do-proxy.md`.
 * Posturas e contrato da porta: `docs/decisions/ADR-20261024-front-react-spa.md` §5.
 */

export type IdDaPostura =
  | "sessao-pela-porta-da-rota"
  | "operador"
  | "credencial-de-worker"
  | "token-de-sessao"
  | "porta-sem-sessao"
  | "catalogo-publico"
  | "descadastro-por-token"
  | "infraestrutura-sem-guarda"

export type Postura = Readonly<{
  readonly id: IdDaPostura
  readonly rotulo: string
  /** Critério que decide a classificação; serve à revisão, não ao teste. */
  readonly criterio: string
}>

export const POSTURAS: readonly Postura[] = [
  {
    id: "sessao-pela-porta-da-rota",
    rotulo: "Sessão pela porta da rota",
    criterio: "A rota chama `exigirSessao` (cookie da web ou Bearer do app) e responde 401.",
  },
  {
    id: "operador",
    rotulo: "Operador",
    criterio: "Bearer do Auth + `is_current_user_operator`; sem operador, 403.",
  },
  {
    id: "credencial-de-worker",
    rotulo: "Credencial de worker",
    criterio: "Segredo de worker em cabeçalho; sem segredo configurado, falha fechado.",
  },
  {
    id: "token-de-sessao",
    rotulo: "Token de sessão",
    criterio: "Bearer validado por `auth.getUser(token)`; a identidade vem do token.",
  },
  {
    id: "porta-sem-sessao",
    rotulo: "Porta sem sessão",
    criterio: "Entrada anônima por natureza: o código/token do fluxo é a credencial.",
  },
  {
    id: "catalogo-publico",
    rotulo: "Catálogo público",
    criterio: "Leitura sem PII usada pela entrada anônima; não há sessão a exigir.",
  },
  {
    id: "descadastro-por-token",
    rotulo: "Descadastro por token",
    criterio: "Token aleatório do link do e-mail autoriza só desligar o resumo.",
  },
  {
    id: "infraestrutura-sem-guarda",
    rotulo: "Infraestrutura sem guarda",
    criterio: "Health, manifesto e service worker precisam responder antes de haver sessão.",
  },
]

export type ProvaDaRota =
  | Readonly<{ readonly tipo: "teste"; readonly arquivo: string; readonly caso: string }>
  | Readonly<{ readonly tipo: "publica"; readonly motivo: string }>

export type RotaClassificada = Readonly<{
  readonly rota: string
  readonly postura: IdDaPostura
  readonly marcador: string
  readonly prova: ProvaDaRota
}>

/** Quantas rotas o manifesto cobre. Um rota nova exige classificação explícita. */
export const TOTAL_DE_ROTAS = 84

function teste(arquivo: string, caso: string): ProvaDaRota {
  return { tipo: "teste", arquivo, caso }
}

function publica(motivo: string): ProvaDaRota {
  return { tipo: "publica", motivo }
}

// Prova compartilhada das 61 rotas que passam por `exigirSessao`: a sessão
// recusada vira 401 sem gravar cookie, antes de a rota tocar no banco.
const PORTA = teste(
  "tests/unit/app-api/sessao-renovacao.test.ts",
  "sessão recusada não grava cookie e responde 401",
)

// Provas de runtime das rotas que não tinham teste de negação próprio; vivem no
// teste deste manifesto, que chama a rota sem credencial e exige 401.
const AQUI = (caso: string) => teste("tests/unit/security/api-surface.test.ts", caso)

type Linha = readonly [rota: string, marcador: string, prova: ProvaDaRota]

const SESSAO: readonly Linha[] = [
  ["/api/app/avisos", "exigirSessao(", PORTA],
  ["/api/app/avisos/lidos", "exigirSessao(", PORTA],
  ["/api/app/avisos/preferencias", "exigirSessao(", PORTA],
  ["/api/app/busca", "exigirSessao(", PORTA],
  ["/api/app/conversas", "exigirSessao(", PORTA],
  ["/api/app/conversas/[id]", "exigirSessao(", PORTA],
  ["/api/app/conversas/[id]/mensagens", "exigirSessao(", PORTA],
  ["/api/app/entry/combinado", "exigirSessao(", PORTA],
  ["/api/app/entry/consent", "exigirSessao(", PORTA],
  ["/api/app/entry/cpf", "exigirSessao(", PORTA],
  ["/api/app/entry/document", "exigirSessao(", PORTA],
  ["/api/app/entry/groups", "exigirSessao(", PORTA],
  ["/api/app/entry/interests", "exigirSessao(", PORTA],
  ["/api/app/entry/invite", "exigirSessao(", PORTA],
  ["/api/app/entry/notices", "exigirSessao(", PORTA],
  ["/api/app/entry/progress", "exigirSessao(", PORTA],
  ["/api/app/entry/provision", "exigirSessao(", PORTA],
  ["/api/app/entry/verification", "exigirSessao(", PORTA],
  ["/api/app/eventos", "exigirSessao(", PORTA],
  ["/api/app/eventos/[id]", "exigirSessao(", PORTA],
  ["/api/app/eventos/[id]/perguntas", "exigirSessao(", PORTA],
  ["/api/app/eventos/[id]/presenca", "exigirSessao(", PORTA],
  ["/api/app/grupos", "exigirSessao(", PORTA],
  ["/api/app/grupos/[id]", "exigirSessao(", PORTA],
  ["/api/app/grupos/[id]/fotos", "exigirSessao(", PORTA],
  ["/api/app/grupos/[id]/participacao", "exigirSessao(", PORTA],
  ["/api/app/grupos/[id]/pedidos", "exigirSessao(", PORTA],
  ["/api/app/grupos/[id]/publicacoes", "exigirSessao(", PORTA],
  ["/api/app/grupos/publicacoes/[id]", "exigirSessao(", PORTA],
  ["/api/app/grupos/publicacoes/[id]/acoes", "exigirSessao(", PORTA],
  ["/api/app/grupos/publicacoes/[id]/comentarios", "exigirSessao(", PORTA],
  ["/api/app/grupos/publicacoes/[id]/denuncia", "exigirSessao(", PORTA],
  ["/api/app/grupos/salvas", "exigirSessao(", PORTA],
  ["/api/app/guia", "exigirSessao(", PORTA],
  ["/api/app/guia/[id]", "exigirSessao(", PORTA],
  ["/api/app/guia/[id]/salvo", "exigirSessao(", PORTA],
  ["/api/app/guia/[id]/sugestao", "exigirSessao(", PORTA],
  ["/api/app/guia/salvos", "exigirSessao(", PORTA],
  ["/api/app/inicio", "exigirSessao(", PORTA],
  ["/api/app/mercado", "exigirSessao(", PORTA],
  ["/api/app/mercado/[id]", "exigirSessao(", PORTA],
  ["/api/app/mercado/[id]/interesse", "exigirSessao(", PORTA],
  ["/api/app/mercado/[id]/situacao", "exigirSessao(", PORTA],
  ["/api/app/mercado/meus", "exigirSessao(", PORTA],
  ["/api/app/negocios", "exigirSessao(", PORTA],
  ["/api/app/negocios/[id]", "exigirSessao(", PORTA],
  ["/api/app/negocios/[id]/pedidos", "exigirSessao(", PORTA],
  ["/api/app/pedidos", "exigirSessao(", PORTA],
  ["/api/app/pedidos/[id]", "exigirSessao(", PORTA],
  ["/api/app/perguntas", "exigirSessao(", PORTA],
  ["/api/app/perguntas/[id]", "exigirSessao(", PORTA],
  ["/api/app/perguntas/[id]/respostas", "exigirSessao(", PORTA],
  ["/api/app/voce", "exigirSessao(", PORTA],
  ["/api/app/voce/apagar-conta", "exigirSessao(", PORTA],
  ["/api/app/voce/bloqueados", "exigirSessao(", PORTA],
  ["/api/app/voce/bloqueados/[id]", "exigirSessao(", PORTA],
  ["/api/app/voce/familia", "exigirSessao(", PORTA],
  ["/api/app/voce/familia/[id]", "exigirSessao(", PORTA],
  ["/api/app/voce/ocultados", "exigirSessao(", PORTA],
  ["/api/app/voce/ocultados/[id]", "exigirSessao(", PORTA],
  ["/api/app/voce/publicacoes", "exigirSessao(", PORTA],
  // Avatar resolve a sessão inline (cookie da web) e devolve 401 antes de ler o
  // perfil; a 404-not-403 vem depois, já sob a policy de `profiles`.
  ["/api/avatar/[userId]", "auth.getUser()", AQUI("GET /api/avatar sem cookie responde 401")],
]

const OPERADOR: readonly Linha[] = [
  [
    "/api/admin/admissions",
    "is_current_user_operator",
    AQUI("GET /api/admin/admissions sem Bearer responde 401"),
  ],
  [
    "/api/admin/portal-health",
    "is_current_user_operator",
    AQUI("GET /api/admin/portal-health sem Bearer responde 401"),
  ],
  [
    "/api/admin/reports/[id]",
    "is_current_user_operator",
    teste(
      "tests/unit/admin/report-api.test.ts",
      "sessão recusada e CSRF recusado não chegam ao privilégio",
    ),
  ],
  [
    "/api/admin/rls-health",
    "is_current_user_operator",
    AQUI("GET /api/admin/rls-health sem Bearer responde 401"),
  ],
]

const WORKER: readonly Linha[] = [
  [
    "/api/admin/document-removals",
    "x-outbox-secret",
    teste(
      "tests/unit/admin/document-worker.test.ts",
      "recusa sessão de membro e segredo inválido (403)",
    ),
  ],
  [
    "/api/internal/account-deletion",
    "x-account-deletion-secret",
    teste(
      "tests/unit/infra/account-deletion-route.test.ts",
      "rejects a wrong or missing secret with 401",
    ),
  ],
  [
    "/api/internal/outbox",
    "x-outbox-secret",
    AQUI("POST /api/internal/outbox sem segredo responde 401"),
  ],
  [
    "/api/internal/resumo",
    "x-outbox-secret",
    teste(
      "tests/unit/resumo/rotas.test.ts",
      "job sem configuração e sem segredo não acessa o banco",
    ),
  ],
  [
    "/api/internal/verification-reconcile",
    "x-reconcile-secret",
    teste(
      "tests/unit/onboarding/verification-reconcile-route.test.ts",
      "rejects a wrong or missing secret with 401",
    ),
  ],
]

const TOKEN: readonly Linha[] = [
  ["/api/consent", "auth.getUser(token)", AQUI("POST /api/consent sem Bearer responde 401")],
  ["/api/onboarding", "auth.getUser(token)", AQUI("POST /api/onboarding sem Bearer responde 401")],
  [
    "/api/onboarding/status",
    "auth.getUser(token)",
    AQUI("GET /api/onboarding/status sem Bearer responde 401"),
  ],
]

const PORTA_SEM_SESSAO: readonly Linha[] = [
  [
    "/api/app/entry/invite/preview",
    "previewFamilyInviteCode",
    publica("A prévia existe antes da conta: o código do convite é a credencial, no corpo."),
  ],
  [
    "/api/app/entry/oauth",
    "origemDoPedido",
    publica("Devolve a URL de autorização do provedor; a sessão nasce no callback."),
  ],
  [
    "/api/app/entry/otp",
    "confirmarEnvio",
    publica("Envia o código de entrada por e-mail: a própria porta, antes de haver sessão."),
  ],
  [
    "/api/app/entry/otp/verify",
    "vereditoDaVerificacao",
    publica("Troca o código de e-mail pela sessão; é a credencial deste passo."),
  ],
]

const CATALOGO: readonly Linha[] = [
  [
    "/api/localities",
    "list_locality_state_codes",
    publica("Catálogo de UFs, sem PII, usado pela entrada anônima e pelo cadastro."),
  ],
  [
    "/api/localities/[uf]",
    'from("localities")',
    publica("Municípios de uma UF, sem PII, usado pela entrada anônima e pelo cadastro."),
  ],
]

const DESCADASTRO: readonly Linha[] = [
  [
    "/api/app/resumo/descadastro",
    "unsubscribe_city_digest",
    publica("Token aleatório de 64 hex do e-mail autoriza só desligar o resumo; sem sessão."),
  ],
]

const INFRA: readonly Linha[] = [
  [
    "/api/health",
    'status: "ok"',
    publica("Liveness probe da plataforma; o matcher do proxy já o exclui."),
  ],
  [
    "/api/manifest",
    'short_name: "Bivaque"',
    publica("O PWA precisa do manifesto antes de haver sessão."),
  ],
  [
    "/api/sw",
    "SW_CONTENT",
    publica("O service worker precisa ser servido sem sessão para instalar."),
  ],
]

function emPostura(postura: IdDaPostura, linhas: readonly Linha[]): readonly RotaClassificada[] {
  return linhas.map(([rota, marcador, prova]) => ({ rota, postura, marcador, prova }))
}

export const API_SURFACE: readonly RotaClassificada[] = [
  ...emPostura("sessao-pela-porta-da-rota", SESSAO),
  ...emPostura("operador", OPERADOR),
  ...emPostura("credencial-de-worker", WORKER),
  ...emPostura("token-de-sessao", TOKEN),
  ...emPostura("porta-sem-sessao", PORTA_SEM_SESSAO),
  ...emPostura("catalogo-publico", CATALOGO),
  ...emPostura("descadastro-por-token", DESCADASTRO),
  ...emPostura("infraestrutura-sem-guarda", INFRA),
]
