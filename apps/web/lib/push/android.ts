import { createSign } from "node:crypto"
import { classificar, FalhaNativa } from "./classificacao"
import type { ConteudoDoPush } from "./frases"

export type ConfigAndroid = {
  projectId: string
  clientEmail: string
  privateKey: string
  base?: string
  timeout?: number
}
let desativadoNoProcesso = false

export function criarAndroid(config: ConfigAndroid) {
  let cache: { token: string; expira: number } | undefined
  async function enviar(destino: string, conteudo: ConteudoDoPush): Promise<void> {
    if (desativadoNoProcesso) throw classificar("android", 0)
    try {
      if (!cache || Date.now() >= cache.expira - 60_000) {
        const agora = Math.floor(Date.now() / 1000)
        const tokenUri = `${config.base ?? "https://oauth2.googleapis.com"}/token`
        const base64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url")
        const unsigned = `${base64({ alg: "RS256", typ: "JWT" })}.${base64({ iss: config.clientEmail, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: tokenUri, iat: agora, exp: agora + 3600 })}`
        const signer = createSign("RSA-SHA256")
        signer.update(unsigned)
        const assertion = `${unsigned}.${signer.sign(config.privateKey.replace(/\\n/g, "\n"), "base64url")}`
        const response = await fetch(tokenUri, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }),
          signal: AbortSignal.timeout(config.timeout ?? 10_000),
        })
        if (!response.ok) throw classificar("android", response.status)
        const json: unknown = await response.json()
        if (
          !json ||
          typeof json !== "object" ||
          !("access_token" in json) ||
          typeof json.access_token !== "string" ||
          !("expires_in" in json) ||
          typeof json.expires_in !== "number"
        )
          throw classificar("android", 0)
        cache = { token: json.access_token, expira: Date.now() + json.expires_in * 1000 }
      }
      const response = await fetch(
        `${config.base ?? "https://fcm.googleapis.com"}/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${cache.token}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token: destino,
              notification: { title: conteudo.title, body: conteudo.body },
              data: { path: conteudo.destino },
            },
          }),
          signal: AbortSignal.timeout(config.timeout ?? 10_000),
        },
      )
      if (!response.ok) throw classificar("android", response.status, await response.text())
    } catch (erro) {
      const falha = erro instanceof FalhaNativa ? erro : classificar("android", 0)
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
