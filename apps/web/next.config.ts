import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

// Telas antigas de entrada da web (ENTRADA-WEB-ANTIGA). Os caminhos são exatos,
// salvo a subárvore de onboarding. A lista não inclui `/conta-apagada`,
// `/convite`, `/prestador-convite`, `/privacidade`, `/ajuda` nem `/consent`:
// esses seguem públicos ou têm fluxo próprio (ADR-20261022-entrada-do-prototipo).
// Também ficam de fora `/auth/confirmar-email` e `/auth/callback-error`: são o
// caminho de falha dos links de e-mail e do OAuth (redirect-plan.ts) e têm tela
// própria, com o painel de reenvio e a mensagem de falha.
const ENTRADA_ANTIGA: readonly string[] = [
  "/login",
  "/signup",
  "/recuperar-senha",
  "/nova-senha",
  "/onboarding",
  "/onboarding/:caminho*",
]

const ENTRADA_DO_APP = "/app/entrar"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bivaque/contracts", "@bivaque/domain", "@bivaque/tokens"],
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Publicação conjunta (SPA ADR §8): o app é servido em `/app` pelo mesmo
  // domínio da web. Arquivos do build (`/app/assets`, `/app/fonts`, …) são
  // servidos direto do `public`; endereço sem arquivo cai no `index.html` do
  // app, que resolve a rota pelo próprio roteador. `/api` e `/auth` nunca são
  // capturados por estas regras.
  async rewrites() {
    return [
      { source: "/app", destination: "/app/index.html" },
      { source: "/app/:caminho*", destination: "/app/index.html" },
    ]
  },
  // SEC-007: nenhuma resposta do Next (páginas, rotas /api e o app em /app) pode
  // ser embutida em outro site. `frame-ancestors 'none'` é a regra moderna e o
  // `X-Frame-Options: DENY` cobre navegador que ainda não a lê. Sem isso, um site
  // de terceiro podia emoldurar a tela de entrada e fazer a pessoa clicar às
  // cegas (clickjacking). As regras de /app e /api já ficam cobertas: os
  // cabeçalhos são avaliados antes do sistema de arquivos.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ]
  },
  // ENTRADA-WEB-ANTIGA (ADR-20261105-entrada-enxuta-e-r3-sem-parada): as telas
  // antigas de entrada da web saem e a porta do app (`/app/entrar`) é a única
  // entrada. Redirect de configuração roda antes do proxy e do sistema de
  // arquivos, então o endereço antigo nem chega ao portão. Temporário (307): a
  // rota pode voltar se o uso real pedir. `/consent` e `/auth/callback` ficam
  // fora de propósito: o aceite do Google e a troca do código dependem deles.
  async redirects() {
    // /login?redirect=X (o proxy manda para cá quem não tem sessão) precisa levar
    // o destino de retorno. Esta regra vem antes da genérica: o Next aplica a
    // primeira que casa, e a genérica descartaria a query.
    return [
      {
        source: "/login",
        has: [{ type: "query", key: "redirect", value: "(?<destino>.+)" }],
        destination: `${ENTRADA_DO_APP}?redirect=:destino`,
        permanent: false,
      },
      // /landing exato nunca foi página: o caminho existe só como espaço de
      // assets (`apps/web/public/landing/`), protegido pelo modo `ativos` do
      // proxy. Quem digita o endereço cai na landing de verdade em `/`; um
      // asset (`/landing/hero-bivaque-arrival.webp`) continua servido em 200.
      // ADR-20261110-superficie-publica-do-proxy.
      { source: "/landing", destination: "/", permanent: false },
      ...ENTRADA_ANTIGA.map((source) => ({
        source,
        destination: ENTRADA_DO_APP,
        permanent: false,
      })),
      // LAN-TROCA fase 1: só as jornadas autorizadas. A query segue pelo Next;
      // conversation UUID escolhe o detalhe antes da regra genérica da caixa.
      {
        source: "/messages",
        has: [
          {
            type: "query",
            key: "conversation",
            value:
              "(?<conversa>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
          },
        ],
        destination: "/app/conversa/:conversa",
        permanent: false,
      },
      ...(
        [
          ["/messages", "/app/conversas"],
          ["/messages/:id", "/app/conversa/:id"],
          // As páginas estáticas e /:id/editar continuam na web.
          ["/mercado/:id((?!novo/?$)[^/]+)", "/app/anuncio/:id"],
          ["/imoveis/:id((?!(?:novo|alertas)/?$)[^/]+)", "/app/anuncio/:id"],
          ["/pedidos", "/app/pedidos"],
          ["/pedidos/:id((?!novo/?$)[^/]+)", "/app/pedido/:id"],
          ["/prestadores/:id", "/app/negocio/:id"],
          ["/configuracoes/bloqueados", "/app/bloqueados"],
          ["/configuracoes/familia", "/app/voce"],
          ["/inicio", "/app/inicio"],
          ["/explorar", "/app/busca"],
          // F05: a tela antiga de eventos sai inteira. `/events/novo` vem antes
          // de `/events/:id` porque o Next aplica a primeira regra que casa e
          // `:id` capturaria "novo" como encontro. As regras com dois segmentos
          // depois do id preservam o id no destino; a query segue pelo Next.
          ["/events/novo", "/app/agenda"],
          ["/events/:id/editar", "/app/evento/:id"],
          ["/events/:id/perguntas", "/app/evento/:id"],
          ["/events/:id", "/app/evento/:id"],
          ["/events", "/app/agenda"],
        ] as const
      ).map(([source, destination]) => ({
        source,
        destination,
        permanent: false,
      })),
    ]
  },
  experimental: {
    serverActions: {
      // SEC-006: as fotos de Moradia, Pedido e Mercado vão para Server Actions
      // uma por chamada. O limite por arquivo no bucket é 10 MB, então 12 MB
      // cobre cada arquivo mais o overhead do multipart/form-data. O limite é do
      // corpo inteiro: enviar várias fotos juntas estouraria antes da action.
      bodySizeLimit: "12mb",
    },
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
})
