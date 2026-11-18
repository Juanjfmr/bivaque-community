import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { conteudoDoPush } from "web/lib/push/frases"

const root = join(import.meta.dirname, "..", "..")
const read = (...segmentos: string[]) => readFileSync(join(root, ...segmentos), "utf8")

/**
 * RUN-029 / ADR-20261107, item 4: a tela bloqueada mostra título fixo e frase
 * fixa por tipo. Nenhum campo de terceiro (nome, foto, trecho, id do ator)
 * pode sair no corpo da notificação.
 */
describe("privacidade do push", () => {
  it("o conteúdo enviado ao provedor só tem título, frase e destino", () => {
    const conteudo = conteudoDoPush("comment", {
      user_id: "20000000-0000-4000-8000-000000000001",
      actor_id: "20000000-0000-4000-8000-000000000002",
      actor_name: "Fulano de Tal",
      actor_photo: "https://exemplo.invalid/foto.jpg",
      content: "trecho privado da conversa",
      target_type: "post",
      target_id: "90000000-0000-4000-8000-000000000001",
    })

    expect(Object.keys(conteudo).sort()).toEqual(["body", "destino", "title"])
    const serializado = JSON.stringify(conteudo)
    for (const proibido of ["Fulano", "foto.jpg", "trecho privado"]) {
      expect(serializado).not.toContain(proibido)
    }
    expect(serializado).not.toContain("20000000-0000-4000-8000-000000000002")
  })

  it("o montador lê só referências do aviso, nunca o ator", () => {
    const fonte = read("apps", "web", "lib", "push", "frases.ts")
    expect(fonte).not.toMatch(/payload\["actor/)
    expect(fonte).not.toMatch(/payload\["content/)
    expect(fonte).not.toMatch(/payload\["name/)
    expect(fonte).not.toMatch(/payload\["photo/)
  })

  it("a chave privada do Web Push fica no servidor, nunca no app", () => {
    const cliente = read("apps", "app", "lib", "dados", "push.ts")
    expect(cliente).not.toContain("WEB_PUSH_PRIVATE_KEY")
    expect(cliente).toContain("/api/app/push") // só a rota é chamada; a chave é do servidor
    const rota = read("apps", "web", "app", "api", "app", "push", "route.ts")
    // A resposta da rota usa a pública; a privada só entra na condição.
    expect(rota).toMatch(/chavePublica: configurado \? chavePublica : null/)
    expect(rota).not.toMatch(/chavePublica: chavePrivada/)
  })
})
