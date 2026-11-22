import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { criarAndroid } from "web/lib/push/android"
import { servidorAndroid } from "./servidor-falso"

const conteudo = { title: "Bivaque", body: "Você recebeu uma mensagem.", destino: "/app/conversas" }
describe("Android contra servidor local", () => {
  it("assina OAuth, reutiliza acesso e classifica respostas", async () => {
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const servidor = await servidorAndroid(keys.publicKey)
    try {
      const criar = () =>
        criarAndroid({
          projectId: "projeto",
          clientEmail: "teste@example.invalid",
          privateKey: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
          base: servidor.base,
          timeout: 100,
        })
      const cliente = criar()
      await cliente.enviar("destino", conteudo)
      await cliente.enviar("destino", conteudo)
      expect(servidor.oauth).toBe(1)
      expect(servidor.corpos[0]).toEqual({
        message: {
          token: "destino",
          notification: { title: conteudo.title, body: conteudo.body },
          data: { path: conteudo.destino },
        },
      })
      for (const [status, motivo, categoria] of [
        [404, "", "destino"],
        [410, "", "destino"],
        [400, "UNREGISTERED", "destino"],
        [429, "", "temporaria"],
        [503, "", "temporaria"],
      ] as const) {
        servidor.roteiro(status, motivo)
        await expect(cliente.enviar("destino", conteudo)).rejects.toMatchObject({
          status,
          categoria,
        })
      }
      servidor.roteiro(200, "", 250)
      await expect(cliente.enviar("destino", conteudo)).rejects.toMatchObject({
        categoria: "temporaria",
      })
      servidor.roteiro(401)
      const recusado = criar()
      await expect(recusado.enviar("destino", conteudo)).rejects.toMatchObject({
        categoria: "credencial",
      })
      expect(recusado.ligado).toBe(false)
    } finally {
      await servidor.fechar()
    }
  })
})
