import { createReadStream, existsSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, normalize, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const sourceDirectory = fileURLToPath(new URL(".", import.meta.url))
const toolDirectory = resolve(sourceDirectory, "..")
const publicDirectory = join(toolDirectory, "public")
const port = Number.parseInt(process.env.KANBAN_PORT ?? "4175", 10)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("KANBAN_PORT must be an integer between 1 and 65535")
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
}

function sendFile(response, filePath) {
  const extension = extname(filePath)
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  })
  createReadStream(filePath).pipe(response)
}

createServer((request, response) => {
  const requestPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname
  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1)
  const filePath = normalize(join(publicDirectory, relativePath))

  if (!filePath.startsWith(publicDirectory) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    response.end("Not found")
    return
  }

  sendFile(response, filePath)
}).listen(port, "127.0.0.1", () => {
  console.log(`Bivaque MVP Kanban: http://127.0.0.1:${port}`)
})
