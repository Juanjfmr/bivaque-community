import type { NextConfig } from "next"

// Protótipo em shadcn/ui: só interface, com dados de demonstração. Não fala com o
// banco nem tem sessão; vira o front do app quando a interface for aprovada.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
}

export default nextConfig
