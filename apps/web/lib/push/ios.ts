import { sign } from "node:crypto"
import { type ClientHttp2Session, connect } from "node:http2"
import { classificar, FalhaNativa } from "./classificacao"
import type { ConteudoDoPush } from "./frases"

export type ConfigIos = {
  keyId: string
  teamId: string
  privateKey: string
  topic: string
  sandbox?: boolean
  base?: string
  timeout?: number
}
let desativadoNoProcesso = false

export function criarIos(config: ConfigIos) {
  let jwt = ""
  let criado = 0
  let sessao: ClientHttp2Session | undefined
  function conexao(): ClientHttp2Session {
    if (!sessao || sessao.closed || sessao.destroyed) {
      const atual = connect(
        config.base ??
          (config.sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com"),
      )
      atual.unref()
      atual.on("error", () => {
        atual.destroy()
      })
      sessao = atual
    }
    return sessao
  }
  async function enviar(destino: string, conteudo: ConteudoDoPush): Promise<void> {
    if (desativadoNoProcesso) throw classificar("ios", 0)
    try {
      if (!/^[0-9a-fA-F]{64,200}$/.test(destino)) throw new FalhaNativa("ios", 0, "destino")
      if (!jwt || Date.now() - criado >= 50 * 60_000) {
        criado = Date.now()
        const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url")
        const unsigned = `${b64({ alg: "ES256", kid: config.keyId })}.${b64({ iss: config.teamId, iat: Math.floor(criado / 1000) })}`
        jwt = `${unsigned}.${sign("sha256", Buffer.from(unsigned), { key: config.privateKey.replace(/\\n/g, "\n"), dsaEncoding: "ieee-p1363" }).toString("base64url")}`
      }
      await new Promise<void>((resolve, reject) => {
        const client = conexao()
        const timer = setTimeout(() => {
          client.destroy()
          reject(classificar("ios", 0))
        }, config.timeout ?? 10_000)
        const req = client.request({
          ":method": "POST",
          ":path": `/3/device/${destino}`,
          authorization: `bearer ${jwt}`,
          "apns-topic": config.topic,
          "apns-push-type": "alert",
          "apns-priority": "10",
        })
        let status = 0
        let resposta = ""
        req.setEncoding("utf8")
        req.on("response", (headers) => {
          status = Number(headers[":status"])
        })
        req.on("data", (parte: string) => {
          resposta += parte
        })
        req.on("error", () => {
          clearTimeout(timer)
          client.destroy()
          reject(classificar("ios", 0))
        })
        req.on("end", () => {
          clearTimeout(timer)
          if (status >= 200 && status < 300) resolve()
          else reject(classificar("ios", status, resposta))
        })
        req.end(
          JSON.stringify({
            aps: { alert: { title: conteudo.title, body: conteudo.body } },
            path: conteudo.destino,
          }),
        )
      })
    } catch (erro) {
      const falha = erro instanceof FalhaNativa ? erro : classificar("ios", 0)
      if (falha.categoria === "credencial") desativadoNoProcesso = true
      throw falha
    }
  }
  return {
    enviar,
    get ligado() {
      return !desativadoNoProcesso
    },
  }
}
