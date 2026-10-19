import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bivaque/contracts", "@bivaque/domain", "@bivaque/tokens"],
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      // SEC-006: a foto do Mercado passa a ir para uma Server Action. O limite
      // por arquivo no bucket é 10 MB e a tela envia uma foto por chamada, então
      // 12 MB cobre o arquivo mais o overhead do multipart/form-data.
      bodySizeLimit: "12mb",
    },
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
})
