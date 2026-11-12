import { NextRequest } from "next/server"
import { vi } from "vitest"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

export const ID = "90000000-0000-4000-8000-000000000001"
export const POST = "90000000-0000-4000-8000-000000000002"
export const COMMENT = "90000000-0000-4000-8000-000000000003"
export const USER = "20000000-0000-4000-8000-000000000001"
export const CITY = "00000000-0000-4000-8000-000000000001"
export const DATA = "2026-11-06T12:00:00.000Z"
export const BASE = "http://localhost:3000/api/app/grupos"
export const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
export const context = { params: Promise.resolve({ id: ID }) }
export const postContext = { params: Promise.resolve({ id: POST }) }
export const grupo = {
  id: ID,
  name: "Famílias",
  description: "Um grupo da cidade",
  rules: "Respeito",
  visibility: "public",
  locality_id: CITY,
  owner_user_id: USER,
  pinned_post_id: null,
  group_memberships: [{ count: 2 }],
}
export const membro = { group_id: ID, user_id: USER, role: "member", status: "approved" }
export const post = {
  id: POST,
  group_id: ID,
  user_id: USER,
  content: "Olá, pessoal!",
  created_at: DATA,
  photo_path: null,
  photo_paths: [],
  comments: [{ count: 1 }],
  post_reactions: [{ count: 3 }],
}
export const comentario = {
  id: COMMENT,
  user_id: USER,
  content: "Uma boa conversa.",
  created_at: DATA,
  parent_id: null,
  reply_to_id: null,
}
type Opcoes = {
  grupo?: Record<string, unknown> | null
  grupos?: Record<string, unknown>[]
  membro?: Record<string, unknown> | null
  posts?: Record<string, unknown>[]
  comentarios?: Record<string, unknown>[]
  comentarioGravado?: Record<string, unknown>
  cidade?: boolean
  erro?: string
  erroEscrita?: string
  rpcErro?: string
  codigo?: string
  storageErro?: "upload" | "sign"
  semUrl?: string
  salvas?: boolean
  ocultas?: boolean
  reacoesComentarios?: { comment_id: string; user_id: string }[]
}
export function mockClient(opcoes: Opcoes = {}) {
  const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = []
  function builder(tabela: string) {
    let operacao = "select"
    let singular = false
    let payload: Record<string, unknown> = {}
    const resposta = () => {
      if (opcoes.erro === tabela || (operacao !== "select" && opcoes.erroEscrita === tabela))
        return {
          data: null,
          error: { code: opcoes.codigo ?? "XX000", message: "segredo-do-banco" },
        }
      const g = opcoes.grupo === undefined ? grupo : opcoes.grupo
      const m = opcoes.membro === undefined ? membro : opcoes.membro
      let data: unknown = []
      if (tabela === "groups") data = singular ? g : (opcoes.grupos ?? (g ? [g] : []))
      if (tabela === "group_memberships") data = singular ? m : m ? [m] : []
      if (tabela === "locality_memberships")
        data =
          opcoes.cidade === false
            ? null
            : { locality_id: CITY, localities: { city_name: "Manaus" } }
      if (tabela === "posts")
        data = singular ? ((opcoes.posts ?? [post])[0] ?? null) : (opcoes.posts ?? [post])
      if (tabela === "comments")
        data = singular
          ? ((opcoes.comentarios ?? [comentario])[0] ?? null)
          : (opcoes.comentarios ?? [comentario])
      if (tabela === "group_join_reasons") data = [{ user_id: USER, reason: "Quero participar." }]
      if (tabela === "profiles") data = [{ user_id: USER, display_name: "Ana" }]
      if (tabela === "post_reactions") data = [{ post_id: POST }]
      if (tabela === "post_saves") data = opcoes.salvas ? [{ post_id: POST }] : []
      if (tabela === "hidden_posts") data = opcoes.ocultas ? [{ post_id: POST }] : []
      if (tabela === "comment_reactions") {
        const linhas = opcoes.reacoesComentarios ?? [{ comment_id: COMMENT, user_id: USER }]
        data = singular ? (linhas[0] ?? null) : linhas
      }
      if (tabela === "feed_group") data = (opcoes.posts ?? [post]).map((p) => ({ id: p["id"] }))
      if (operacao === "insert")
        data = singular
          ? tabela === "comments"
            ? (opcoes.comentarioGravado ?? {
                ...comentario,
                ...payload,
                parent_id: payload["reply_to_id"] ? COMMENT : null,
              })
            : tabela === "posts" && payload["group_id"]
              ? // A rota devolve o cartão montado: o insert de publicação
                // precisa trazer todos os campos que a apresentação lê.
                {
                  id: POST,
                  group_id: payload["group_id"],
                  user_id: payload["user_id"],
                  content: String(payload["content"] ?? ""),
                  created_at: DATA,
                  photo_path: null,
                  photo_paths: [],
                  comments: [{ count: 0 }],
                  post_reactions: [{ count: 0 }],
                }
              : { id: POST, content: "Texto gravado", created_at: DATA }
          : [{ id: POST }]
      return {
        data,
        error: null,
        count: tabela === "comment_reactions" ? (opcoes.reacoesComentarios?.length ?? 1) : null,
      }
    }
    const q: Record<string, unknown> = {}
    for (const metodo of [
      "select",
      "eq",
      "neq",
      "in",
      "order",
      "range",
      "limit",
      "is",
      "not",
      "or",
      "filter",
      "overrideTypes",
      "insert",
      "upsert",
      "delete",
      "update",
    ]) {
      q[metodo] = (...args: unknown[]) => {
        if (["insert", "upsert", "delete", "update"].includes(metodo)) {
          operacao = metodo
          payload = (args[0] ?? {}) as Record<string, unknown>
        }
        chamadas.push({ tabela, metodo, args })
        return q
      }
    }
    q["maybeSingle"] = () => {
      singular = true
      return q
    }
    q["single"] = () => {
      singular = true
      return q
    }
    // biome-ignore lint/suspicious/noThenProperty: builder PostgREST é awaitable
    Object.defineProperty(q, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resposta()).then(resolve),
    })
    return q
  }
  const from = vi.fn(builder)
  const rpc = vi.fn((nome: string, args?: unknown) => {
    chamadas.push({ tabela: nome, metodo: "rpc", args: [args] })
    if (opcoes.rpcErro === nome)
      return Promise.resolve({
        data: null,
        error: { code: opcoes.codigo ?? "XX000", message: "segredo-do-banco" },
      })
    return builder(nome)
  })
  const upload = vi.fn(async () => ({
    data: {},
    error: opcoes.storageErro === "upload" ? { message: "segredo-storage" } : null,
  }))
  const sign = vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({
      path,
      signedUrl: path === opcoes.semUrl ? null : "https://storage.example.invalid/assinada",
    })),
    error: opcoes.storageErro === "sign" ? { message: "segredo-storage" } : null,
  }))
  const storage = { from: vi.fn(() => ({ upload, createSignedUrls: sign })) }
  return { client: { from, rpc, storage } as never, from, rpc, chamadas, upload, sign }
}
export function autenticar(mock: ReturnType<typeof mockClient>) {
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "pessoa@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}
export function semSessao() {
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
}
export function req(
  method = "GET",
  url = BASE,
  body?: unknown,
  cabecalhos: Record<string, string> = headers,
) {
  return new NextRequest(url, {
    method,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
