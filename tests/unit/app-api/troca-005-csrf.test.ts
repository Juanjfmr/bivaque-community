import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
const estado = vi.hoisted(() => ({ publico: null as unknown }))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => estado.publico }))

import { POST as denunciar } from "web/app/api/app/denuncias/route"
import { POST as responder } from "web/app/api/app/pedidos/[id]/mensagens/route"
import {
  GET as atendimentoLido,
  PATCH as salvarAtendimento,
} from "web/app/api/app/prestador/atendimento/route"
import { PATCH as salvarConta } from "web/app/api/app/prestador/conta/route"
import { POST as aceitarConvite } from "web/app/api/app/prestador-convite/[token]/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

/**
 * TROCA-005, item 7 da revisão — o CSRF das CINCO escritas do lote, num só
 * lugar. Cada caso prova três recusas da porta (origem fora da lista,
 * cabeçalho do app ausente e cabeçalho errado) e que nenhuma delas chega ao
 * banco: o cliente abaixo explode se for tocado.
 */

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const USER = "10000000-0000-4000-8000-000000000010"
const PEDIDO = "10000000-0000-4000-8000-0000000000b1"
const TOKEN = "a".repeat(64)
const cabecalhos = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}

const bancoProibido = {
  from: () => {
    throw new Error("a escrita recusada não pode chegar ao banco")
  },
  rpc: () => {
    throw new Error("a escrita recusada não pode chegar ao banco")
  },
  auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
}

const escritas = [
  [
    "atendimento PATCH",
    (headers: Record<string, string>) =>
      salvarAtendimento(
        new NextRequest(`${BASE}/prestador/atendimento`, {
          method: "PATCH",
          headers,
          body: '{"ativo":true}',
        }),
      ),
  ],
  [
    "mensagens POST",
    (headers: Record<string, string>) =>
      responder(
        new NextRequest(`${BASE}/pedidos/${PEDIDO}/mensagens`, {
          method: "POST",
          headers,
          body: '{"conteudo":"Olá"}',
        }),
        { params: Promise.resolve({ id: PEDIDO }) },
      ),
  ],
  [
    "denúncias POST",
    (headers: Record<string, string>) =>
      denunciar(
        new NextRequest(`${BASE}/denuncias`, {
          method: "POST",
          headers,
          body: '{"tipo":"post","alvo":"10000000-0000-4000-8000-0000000000a1","motivo":"spam","explicacao":""}',
        }),
      ),
  ],
  [
    "conta PATCH",
    (headers: Record<string, string>) =>
      salvarConta(
        new NextRequest(`${BASE}/prestador/conta`, {
          method: "PATCH",
          headers,
          body: '{"telefone":null,"telefonePublico":false}',
        }),
      ),
  ],
  [
    "convite POST",
    (headers: Record<string, string>) =>
      aceitarConvite(
        new NextRequest(`${BASE}/prestador-convite/${TOKEN}`, { method: "POST", headers }),
        {
          params: Promise.resolve({ token: TOKEN }),
        },
      ),
  ],
] as const

const portasRecusadas = [
  ["origem fora da lista", { ...cabecalhos, origin: "https://fora.example.invalid" }],
  ["cabeçalho do app errado", { ...cabecalhos, "x-bivaque-app": "outro-valor" }],
  ["cabeçalho do app ausente", { "content-type": "application/json", origin: cabecalhos.origin }],
] as const

beforeEach(() => {
  vi.clearAllMocks()
  process.env["NEXT_PUBLIC_SUPABASE_URL"] = "http://localhost:54321"
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "anon-de-teste"
  estado.publico = { rpc: vi.fn(async () => ({ data: [], error: null })) }
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "membro@example.invalid", appMetadata: {} },
    cliente: bancoProibido,
    cabecalhos: {},
  } as never)
})

describe("TROCA-005 — CSRF das cinco escritas do lote", () => {
  it.each(escritas)("%s recusa a leitura sem sessão (401)", async (_nome, chamar) => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    expect((await chamar(cabecalhos)).status).toBe(401)
  })

  it.each(
    escritas.flatMap(([nome, chamar]) =>
      portasRecusadas.map(([porta, headers]) => [nome, porta, chamar, headers] as const),
    ),
  )("%s com %s é 403 antes do banco", async (_nome, _porta, chamar, headers) => {
    expect((await chamar(headers)).status).toBe(403)
  })

  it("a leitura do atendimento não é escrita: não exige o cabeçalho do app", async () => {
    // Controle positivo da porta: sem o cabeçalho, o GET segue (a sessão é o que
    // autoriza a leitura). Sem este caso, o 403 acima poderia ser 403 de tudo.
    resolver.mockResolvedValue({
      estado: "autenticada",
      via: "cookie",
      usuario: { id: USER, email: "membro@example.invalid", appMetadata: {} },
      cliente: {
        from: () => {
          const consulta: Record<string, unknown> = {}
          for (const metodo of ["select", "eq", "is", "order", "limit"]) {
            consulta[metodo] = () => consulta
          }
          consulta["maybeSingle"] = async () => ({ data: null, error: null })
          return consulta
        },
      },
      cabecalhos: {},
    } as never)
    const resposta = await atendimentoLido(
      new NextRequest(`${BASE}/prestador/atendimento`, { headers: { origin: cabecalhos.origin } }),
    )
    // O dublê responde à leitura inteira: a porta não recusa a leitura, e o 200
    // prova o caminho, não a ausência do 403.
    expect(resposta.status).toBe(200)
  })
})
