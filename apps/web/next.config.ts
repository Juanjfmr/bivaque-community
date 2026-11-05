import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

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
