// Configuração Vitest mínima para apps/mobile.
// Roda em environment "node": os testes cobrem só lógica de auth, sem
// renderização — nada aqui precisa de DOM.
// O alias "@/auth" é declarado abaixo, não herdado do tsconfig, que mapeia
// apenas @bivaque/tokens.
// Mocks de módulos nativos Expo/AsyncStorage ficam nos próprios testes via
// vi.mock() — não há preset porque Expo SDK 54 não tem preset oficial para
// vitest 4.x.

import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@/auth": path.resolve(__dirname, "src/auth"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
