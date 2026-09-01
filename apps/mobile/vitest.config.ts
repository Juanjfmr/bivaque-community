// Configuração Vitest mínima para apps/mobile.
// Roda jsdom (default) com path alias do tsconfig.
// Mocks de modulos nativos Expo/AsyncStorage ficam nos próprios
// testes via vi.mock() — não há preset porque Expo SDK 54 ainda nao
// tem preset oficial para vitest 3.x estavel.

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
