import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bivaque/contracts", "@bivaque/domain", "@bivaque/tokens"],
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
