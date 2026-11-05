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
    return ENTRADA_ANTIGA.map((source) => ({
      source,
      destination: ENTRADA_DO_APP,
      permanent: false,
    }))
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
