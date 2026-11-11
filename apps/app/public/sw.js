/*
 * Service worker do app (`/app/sw.js`, escopo `/app/`).
 *
 * RUN-137 / ADR-20261107: mostra o título e o corpo recebidos do servidor —
 * título fixo "Bivaque" e frase fixa por tipo, sem dado de terceiro — e, no
 * toque, abre o destino do aviso no app. Destino fora do contrato cai na tela
 * segura (`/app/voce`), a mesma regra de `destinoEmRota` em
 * `apps/app/lib/dados/avisos.ts`.
 *
 * O arquivo é servido como está (public do Vite); por isso a lista de rotas é
 * repetida aqui em vez de importada do bundle.
 */

const DESTINO_SEGURO = "/app/voce"

const ROTAS_DE_DESTINO = new Set([
  "publicacao",
  "grupo",
  "evento",
  "conversa",
  "pergunta",
  "pedido",
  "anuncio",
  "comunidade",
  "chamados",
  "voce",
])

function destinoSeguro(valor) {
  if (typeof valor !== "string") return DESTINO_SEGURO
  const partes = /^\/app\/([a-z-]+)(?:\/[^/?#]+)?$/.exec(valor)
  if (partes === null || !ROTAS_DE_DESTINO.has(partes[1])) return DESTINO_SEGURO
  return valor
}

self.addEventListener("push", (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = {}
  }

  const titulo = typeof dados.title === "string" && dados.title !== "" ? dados.title : "Bivaque"
  const corpo =
    typeof dados.body === "string" && dados.body !== ""
      ? dados.body
      : "Você tem uma atualização no Bivaque."

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      tag: "bivaque-aviso",
      data: { destino: destinoSeguro(dados.destino) },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const destino = destinoSeguro(event.notification.data && event.notification.data.destino)

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const janela of janelas) {
        if (new URL(janela.url).origin !== self.location.origin) continue
        await janela.focus()
        if ("navigate" in janela) await janela.navigate(destino)
        return
      }
      await self.clients.openWindow(destino)
    })(),
  )
})
