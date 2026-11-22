import { appendFileSync } from "node:fs"
import { createServer } from "node:http"

const logPath = process.argv[2] ?? ".visual/loja-004/ios/ios-api.log"
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

  if (request.method === "GET" && /^\/api\/localities(?:\/.*)?$/.test(pathname)) {
    response.writeHead(200, { "Content-Type": "application/json" }).end("[]")
    return
  }

  if (pathname.startsWith("/api/")) {
    response.writeHead(401, { "Content-Type": "application/json" }).end('{"erro":"sem-sessao"}')
    return
  }

  response.writeHead(404).end()
})

server.listen(3999, "0.0.0.0")
