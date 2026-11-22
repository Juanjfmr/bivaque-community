import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { adaptadorComDependencias } from "web/lib/push/adaptador"
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
        [403, "SENDER_ID_MISMATCH", "destino"],
        [400, "INVALID_ARGUMENT token", "destino"],
        [429, "", "temporaria"],
        [503, "", "temporaria"],
      ] as const) {
        servidor.roteiro(status, motivo)
        await expect(cliente.enviar("destino", conteudo)).rejects.toMatchObject({
          status,
          categoria,
        })
      }
      servidor.roteiro(403, "SENDER_ID_MISMATCH")
      const apagados: string[] = []
      const adaptador = adaptadorComDependencias({
        inscricoes: async () => [
          { id: "1", kind: "android", destination: "destino", keyP256dh: "", keyAuth: "" },
        ],
        marcarSucesso: async () => undefined,
        apagar: async (id) => {
          apagados.push(id)
        },
        enviar: async (inscricao, conteudo) => cliente.enviar(inscricao.destination, conteudo),
      })
      expect(
        await adaptador.send({
          id: "1",
          recipient: "1",
          channel: "push",
          type: "comment",
          payload: {},
          attempts: 0,
          updatedAt: 0,
        }),
      ).toEqual({ ok: true })
      expect(apagados).toEqual(["1"])
      expect(cliente.ligado).toBe(true)
      servidor.roteiro(200, "", 250)
      await expect(cliente.enviar("destino", conteudo)).rejects.toMatchObject({
        categoria: "temporaria",
      })
      servidor.oauthResposta(400)
      const oauthRecusado = criar()
      await expect(oauthRecusado.enviar("destino", conteudo)).rejects.toMatchObject({
        status: 400,
        categoria: "credencial",
      })
      expect(oauthRecusado.ligado).toBe(false)
      /* Adaptador desligado globalmente apos credencial recusada. */
      servidor.roteiro(401)
      const recusado = criar()
      await expect(recusado.enviar("destino", conteudo)).rejects.toMatchObject({
        categoria: "temporaria",
      })
      expect(recusado.ligado).toBe(false)
    } finally {
      await servidor.fechar()
    }
  })
})
