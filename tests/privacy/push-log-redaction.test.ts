import { generateKeyPairSync } from "node:crypto"
import { afterEach, expect, it, vi } from "vitest"
import { log } from "web/lib/logger"
import { adaptadorComDependencias, FalhaDoProvedor } from "web/lib/push/adaptador"
import { criarAndroid } from "web/lib/push/android"
import { criarIos } from "web/lib/push/ios"
import { servidorAndroid, servidorIos } from "../unit/push/servidor-falso"

afterEach(() => vi.restoreAllMocks())
it("não registra destinos nem credenciais em sucesso ou falha", async () => {
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const androidServer = await servidorAndroid(rsa.publicKey)
  const iosServer = await servidorIos(ec.publicKey)
  const chaveAndroid = rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  const chaveIos = ec.privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  const email = "sigilo-unico@example.invalid"
  const token = "token-sintetico-unico"
  const endpoint = "https://updates.push.services.mozilla.com/wpush/v2/endpoint-unico"
  const spy = vi.spyOn(log, "error").mockImplementation(() => undefined)
  const mensagens: string[] = []
  const conteudo = {
    title: "Bivaque",
    body: "Você recebeu uma mensagem.",
    destino: "/app/conversas",
  }
  try {
    const android = criarAndroid({
      projectId: "teste",
      clientEmail: email,
      privateKey: chaveAndroid,
      base: androidServer.base,
      timeout: 50,
    })
    const ios = criarIos({
      keyId: "kid",
      teamId: "team",
      privateKey: chaveIos,
      topic: "teste",
      base: iosServer.base,
      timeout: 50,
    })
    const web = adaptadorComDependencias({
      inscricoes: async () => [
        { id: "1", destination: endpoint, keyP256dh: chaveAndroid, keyAuth: token },
      ],
      marcarSucesso: async () => undefined,
      apagar: async () => undefined,
      enviar: async () => {
        throw new FalhaDoProvedor(503)
      },
    })
    const result = await web.send({
      id: "1",
      recipient: "1",
      channel: "push",
      type: "comment",
      payload: {},
      attempts: 0,
      updatedAt: 0,
    })
    mensagens.push(JSON.stringify(result))
    for (const status of [200, 404, 410, 400, 429, 503, 401]) {
      androidServer.roteiro(status, token)
      iosServer.roteiro(status, token)
      for (const cliente of [android, ios]) {
        try {
          await cliente.enviar(token, conteudo)
        } catch (erro) {
          mensagens.push(String(erro))
        }
      }
    }
    const saida = JSON.stringify([spy.mock.calls, mensagens])
    for (const segredo of [
      token,
      endpoint,
      chaveAndroid,
      chaveIos,
      email,
      androidServer.base,
      iosServer.base,
    ])
      expect(saida).not.toContain(segredo)
  } finally {
    await androidServer.fechar()
    await iosServer.fechar()
  }
})
