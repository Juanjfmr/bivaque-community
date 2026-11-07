import { NextRequest } from "next/server"
import { beforeEach, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/storage/sanitize-image", () => ({ sanitizeImage: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { POST as foto } from "web/app/api/app/grupos/[id]/fotos/route"
import { PUT as participar } from "web/app/api/app/grupos/[id]/participacao/route"
import { POST as publicar } from "web/app/api/app/grupos/[id]/publicacoes/route"
import { PUT as agir } from "web/app/api/app/grupos/publicacoes/[id]/acoes/route"
import { POST as comentar } from "web/app/api/app/grupos/publicacoes/[id]/comentarios/route"
import { POST as denunciar } from "web/app/api/app/grupos/publicacoes/[id]/denuncia/route"
import { autenticar, BASE, context, headers, mockClient, req, semSessao } from "./apoio"

const escritas = [
  { nome: "participar", chamar: participar, metodo: "PUT" },
  { nome: "publicar", chamar: publicar, metodo: "POST" },
  { nome: "foto", chamar: foto, metodo: "POST" },
  { nome: "comentar", chamar: comentar, metodo: "POST" },
  { nome: "agir", chamar: agir, metodo: "PUT" },
  { nome: "denunciar", chamar: denunciar, metodo: "POST" },
]
beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})
it.each(escritas)(
  "$nome recusa UUID inválido antes de consultar dados",
  async ({ chamar, metodo }) => {
    const mock = mockClient()
    autenticar(mock)
    expect(
      (await chamar(req(metodo, BASE, {}), { params: Promise.resolve({ id: "inválido" }) })).status,
    ).toBe(404)
    expect(mock.from).not.toHaveBeenCalled()
  },
)
it.each(escritas)(
  "$nome recusa JSON truncado e corpo que não é objeto",
  async ({ chamar, metodo }) => {
    const mock = mockClient()
    autenticar(mock)
    for (const body of ["{", "[]", "null", "1"]) {
      expect(
        (await chamar(new NextRequest(BASE, { method: metodo, headers, body }), context)).status,
      ).toBe(400)
    }
    expect(mock.from).not.toHaveBeenCalled()
  },
)
it.each(escritas)("$nome recusa tipo de corpo inesperado", async ({ chamar, metodo }) => {
  const mock = mockClient()
  autenticar(mock)
  expect(
    (await chamar(req(metodo, BASE, {}, { ...headers, "content-type": "text/plain" }), context))
      .status,
  ).toBe(400)
  expect(mock.from).not.toHaveBeenCalled()
})
