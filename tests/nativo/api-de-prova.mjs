import { appendFileSync } from "node:fs"
import { createServer } from "node:http"

const logPath = process.argv[2] ?? ".visual/loja-004/ios/ios-api.log"
const diagnosticoPath = ".visual/loja-004/ios/ios-diagnostico.log"
const sanitizar = (valor) =>
  String(valor ?? "")
    .replace(/https?:\/\/[^\s]+/gi, "[url omitida]")
    .replace(/[^\s@]+@[^\s@]+/g, "[email omitido]")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "[omitido]")
    .replace(/Bearer\s+[^\s]+/gi, "[omitido]")
    .replace(/\b\d{6}\b/g, "[omitido]")
    .replace(/\?[^\s]*/g, "[omitido]")
    .replace(/[\r\n]/g, " ")
    .slice(0, 300)
const origin = "capacitor://localhost"
const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname
  appendFileSync(logPath, `${request.method} ${pathname}\n`)
  response.setHeader("Access-Control-Allow-Origin", origin)
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  response.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, content-type, x-bivaque-app, x-bivaque-cliente",
  )

  if (request.method === "OPTIONS") {
    response.writeHead(204).end()
    return
  }

  if (request.method === "POST" && pathname === "/__diagnostico") {
    let corpo = ""
    request.on("data", (parte) => {
      corpo += parte
      if (corpo.length > 8192) request.destroy()
    })
    request.on("end", () => {
      try {
        const dados = JSON.parse(corpo)
        const registro = ["tipo", "mensagem", "arquivo", "linha", "rota", "raiz"]
          .map((campo) => `${campo}=${sanitizar(dados[campo])}`)
          .join(" ")
        appendFileSync(diagnosticoPath, `${registro}\n`)
        response.writeHead(204).end()
      } catch {
        response.writeHead(400).end()
      }
    })
    return
  }

  if (request.method === "GET" && /^\/api\/localities(?:\/.*)?$/.test(pathname)) {
    response.writeHead(200, { "Content-Type": "application/json" }).end("[]")
    return
  }

  if (pathname.startsWith("/api/app/")) {
    response
      .writeHead(401, { "Content-Type": "application/json" })
      .end('{"autenticado":false,"motivo":"sem-sessao"}')
    return
  }

  response.writeHead(404).end()
})

server.listen(3999, "0.0.0.0")
