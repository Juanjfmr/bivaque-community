import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { type Connect, defineConfig, type Plugin } from "vite"

/**
 * O host estático publica o app em `/app/`. Sem a barra, o Vite responde a
 * sugestão ("did you mean /app/"), que não é um endereço do app — mas é `/app`
 * que o ADR §8 publica. Este apelido redireciona `/app` (com a consulta que
 * vier) para o endereço com barra, no dev e no preview: os dois chegam ao
 * mesmo Início, sem texto de sugestão do host.
 */
function apelidoSemBarra(middlewares: Connect.Server): void {
  middlewares.use((requisicao, resposta, seguir) => {
    const url = requisicao.url ?? ""
    if (url === "/app" || url.startsWith("/app?")) {
      resposta.statusCode = 308
      resposta.setHeader("Location", `/app/${url.slice("/app".length)}`)
      resposta.end()
      return
    }
    seguir()
  })
}

const enderecoSemBarra: Plugin = {
  name: "bivaque-app-endereco-sem-barra",
  configureServer(servidor) {
    apelidoSemBarra(servidor.middlewares)
  },
  configurePreviewServer(servidor) {
    apelidoSemBarra(servidor.middlewares)
  },
}

export default defineConfig({
  base: "/app/",
  plugins: [react(), tailwindcss(), enderecoSemBarra],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
})
