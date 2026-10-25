import { defineConfig } from "vitest/config"

// Configuração própria do app (onda 1b).
//
// O que é regra pura de navegação roda aqui, em ambiente de nó, sem DOM: as
// partes que tocam a tela entram por ambiente injetado, para que a bateria
// unitária não dependa de jsdom nem de tempo de parede. O que só se prova no
// navegador vive no e2e, em `apps/app/tests/e2e`.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
  },
})
