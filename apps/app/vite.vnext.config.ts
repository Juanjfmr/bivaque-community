import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

/** Build estático e isolado para compartilhar F02 A/B no celular.
 * A produção continua usando vite.config.ts e não contém esta página.
 * O diretório public/ é o mesmo: fontes e ilustrações aprovadas.
 */
export default defineConfig({
  root: fileURLToPath(new URL("./lab-vnext", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL("./dist-vnext", import.meta.url)),
    emptyOutDir: true,
  },
})
