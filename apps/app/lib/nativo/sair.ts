import type { QueryClient } from "@tanstack/react-query"
import { requisitar } from "@/lib/api/cliente"
import { apagarPkce, apagarRenovacao } from "./cofre"
import { limparMemoria, renovarSessao } from "./sessao"

export async function sairNativo(cliente: QueryClient): Promise<void> {
  try {
    // Ainda não há plugin de push nativo neste app.
    let resposta = await requisitar("/api/app/voce/sair", { method: "POST" })
    if (resposta.status === 401 && (await renovarSessao())) {
      resposta = await requisitar("/api/app/voce/sair", { method: "POST" })
    }
  } catch {
    // A limpeza local também acontece sem rede.
  } finally {
    limparMemoria()
    await Promise.allSettled([apagarRenovacao(), apagarPkce()])
    cliente.clear()
    localStorage.clear()
    if (typeof indexedDB !== "undefined" && indexedDB.databases) {
      const bancos = await indexedDB.databases().catch(() => [])
      await Promise.all(
        bancos.flatMap(({ name }) =>
          name
            ? [
                new Promise<void>((resolve) => {
                  const pedido = indexedDB.deleteDatabase(name)
                  pedido.onsuccess = pedido.onerror = pedido.onblocked = () => resolve()
                }),
              ]
            : [],
        ),
      )
    }
    if (typeof caches !== "undefined") {
      const nomes = await caches.keys().catch(() => [])
      await Promise.all(nomes.map((nome) => caches.delete(nome)))
    }
  }
}
