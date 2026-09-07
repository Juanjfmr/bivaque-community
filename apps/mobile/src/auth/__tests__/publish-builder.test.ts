// Testes do builder puro de publicacao.
//
// Por que SEM vi.mock de supabase-js aqui: o import chain do
// apps/mobile/src/auth/client.ts puxa expo-secure-store -> alguma
// dependencia nativa que carrega react-native@0.81/index.js
// (formato Flow + JSDoc) que rolldown/vite nao consegue parsear
// para testes Node. Para contornar sem expor detalhes do bundler
// ou mockar node_modules, testamos apenas a funcao pura do
// publish-builder.ts (sem import chain para client.ts).

import { describe, expect, it } from "vitest"
import { buildPostInsert } from "../publish-builder"

describe("publish-builder.buildPostInsert", () => {
  it("audience=village: zera locality_id, usa community_id", () => {
    const body = buildPostInsert({
      authorId: "00000000-0000-4000-8000-000000000008",
      content: "GS-S4 oi",
      audience: "village",
      communityId: "71000000-0000-4000-8000-000000000001",
      localityId: "00000000-0000-4000-8000-00000000000a",
    })
    expect(body).toEqual({
      user_id: "00000000-0000-4000-8000-000000000008",
      content: "GS-S4 oi",
      community_id: "71000000-0000-4000-8000-000000000001",
      locality_id: null,
      is_deleted: false,
    })
  })

  it("audience=city: zera community_id, usa locality_id", () => {
    const body = buildPostInsert({
      authorId: "00000000-0000-4000-8000-000000000008",
      content: "GS-S4 cidade",
      audience: "city",
      communityId: "71000000-0000-4000-8000-000000000001",
      localityId: "00000000-0000-4000-8000-00000000000a",
    })
    expect(body).toEqual({
      user_id: "00000000-0000-4000-8000-000000000008",
      content: "GS-S4 cidade",
      community_id: null,
      locality_id: "00000000-0000-4000-8000-00000000000a",
      is_deleted: false,
    })
  })

  it("sempre inclui is_deleted=false na criacao", () => {
    const body = buildPostInsert({
      authorId: "u",
      content: "x",
      audience: "village",
      communityId: "c",
      localityId: "l",
    })
    expect(body.is_deleted).toBe(false)
  })
})
