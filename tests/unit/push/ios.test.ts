import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { criarIos } from "web/lib/push/ios"
import { servidorIos } from "./servidor-falso"

const conteudo = { title: "Bivaque", body: "Você recebeu uma mensagem.", destino: "/app/conversas" }
describe("iOS contra servidor local", () => {
  it("assina ES256 e classifica respostas", async () => {
    const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
    const servidor = await servidorIos(keys.publicKey)
    try {
      const criar = () =>
        criarIos({
          keyId: "kid",
          teamId: "team",
          topic: "exemplo.app",
          privateKey: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
          base: servidor.base,
          timeout: 100,
        })
      const cliente = criar()
      await cliente.enviar("a".repeat(64), conteudo)
      await cliente.enviar("a".repeat(64), conteudo)
      expect(servidor.conexoes).toBe(1)
      await expect(cliente.enviar("inv?lido", conteudo)).rejects.toMatchObject({
        categoria: "destino",
      })
      expect(servidor.corpos[0]).toEqual({
        aps: { alert: { title: conteudo.title, body: conteudo.body } },
        path: conteudo.destino,
      })
      for (const [status, motivo, categoria] of [
        [404, "", "destino"],
        [410, "", "destino"],
        [400, "BadDeviceToken", "destino"],
        [400, "Unregistered", "destino"],
        [429, "", "temporaria"],
        [503, "", "temporaria"],
      ] as const) {
        servidor.roteiro(status, motivo)
        await expect(cliente.enviar("a".repeat(64), conteudo)).rejects.toMatchObject({
          status,
          categoria,
        })
      }
      servidor.roteiro(200, "", 250)
      await expect(cliente.enviar("a".repeat(64), conteudo)).rejects.toMatchObject({
        categoria: "temporaria",
      })
      servidor.roteiro(403)
      const recusado = criar()
      await expect(recusado.enviar("a".repeat(64), conteudo)).rejects.toMatchObject({
        categoria: "credencial",
      })
      expect(recusado.ligado).toBe(false)
    } finally {
      await servidor.fechar()
    }
  })
})
