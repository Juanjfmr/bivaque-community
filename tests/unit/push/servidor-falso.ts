import { type KeyObject, verify } from "node:crypto"
import { createServer as httpServer } from "node:http"
import { createServer as http2Server } from "node:http2"

export function verificar(jwt: string, chave: KeyObject, algoritmo: "RSA-SHA256" | "sha256") {
  const partes = jwt.split(".")
  if (partes.length !== 3) return false
  return verify(
    algoritmo,
    Buffer.from(`${partes[0]}.${partes[1]}`),
    algoritmo === "sha256" ? { key: chave, dsaEncoding: "ieee-p1363" } : chave,
    Buffer.from(partes[2] ?? "", "base64url"),
  )
}
export async function servidorAndroid(chave: KeyObject) {
  let status = 200
  let motivo = ""
  let atraso = 0
  let oauth = 0
  const corpos: unknown[] = []
  const server = httpServer((req, res) => {
    let body = ""
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on("end", () => {
      if (req.url === "/token") {
        oauth++
        const assertion = new URLSearchParams(body).get("assertion") ?? ""
        res.writeHead(verificar(assertion, chave, "RSA-SHA256") ? 200 : 401)
        res.end(JSON.stringify({ access_token: "acesso-sintetico", expires_in: 3600 }))
      } else {
        corpos.push(JSON.parse(body))
        setTimeout(() => {
          res.writeHead(status)
          res.end(motivo)
        }, atraso)
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("servidor indisponível")
  return {
    base: `http://127.0.0.1:${address.port}`,
    corpos,
    get oauth() {
      return oauth
    },
    roteiro(s: number, m = "", a = 0) {
      status = s
      motivo = m
      atraso = a
    },
    fechar: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
export async function servidorIos(chave: KeyObject) {
  let status = 200
  let motivo = ""
  let atraso = 0
  const corpos: unknown[] = []
  // HTTP/2 sem TLS só no servidor local injetado; produção usa HTTPS fixo.
  const server = http2Server()
  server.on("stream", (stream, headers) => {
    let body = ""
    stream.on("data", (chunk: Buffer) => {
      body += chunk.toString()
    })
    stream.on("end", () => {
      corpos.push(JSON.parse(body))
      const valido = verificar(
        String(headers.authorization ?? "").replace(/^bearer /, ""),
        chave,
        "sha256",
      )
      setTimeout(() => {
        if (!stream.destroyed) {
          stream.respond({ ":status": valido ? status : 401 })
          stream.end(motivo)
        }
      }, atraso)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("servidor indisponível")
  return {
    base: `http://127.0.0.1:${address.port}`,
    corpos,
    roteiro(s: number, m = "", a = 0) {
      status = s
      motivo = m
      atraso = a
    },
    fechar: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
