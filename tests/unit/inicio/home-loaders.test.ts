import { describe, expect, it } from "vitest"
import { loadPrimaryCommunity } from "web/app/(shell)/inicio/home-loaders"

type Result = { data: unknown; error: { message: string } | null }

function table(result: Result | Promise<Result>) {
  const chain = Promise.resolve(result) as Promise<Result> & {
    select: () => typeof chain
    eq: () => typeof chain
    order: () => typeof chain
    in: () => typeof chain
  }
  chain.select = () => chain
  chain.eq = () => chain
  chain.order = () => chain
  chain.in = () => chain
  return chain
}

function client(options: { memberships: Result; communities: Result; user?: Result }) {
  return {
    auth: {
      getUser: async () => options.user ?? { data: { user: { id: "member-1" } }, error: null },
    },
    from: (name: string) =>
      name === "community_memberships" ? table(options.memberships) : table(options.communities),
  }
}

describe("loadPrimaryCommunity", () => {
  it("filtra a membership mais antiga pela cidade current", async () => {
    const result = await loadPrimaryCommunity(
      client({
        memberships: {
          data: [
            { community_id: "origin", joined_at: "2020-01-01" },
            { community_id: "current", joined_at: "2024-01-01" },
          ],
          error: null,
        },
        communities: {
          data: [
            { id: "origin", locality_id: "origin-locality", name: "Origem" },
            { id: "current", locality_id: "current-locality", name: "Atual" },
          ],
          error: null,
        },
      }) as never,
      "current-locality",
    )

    expect(result).toEqual({ status: "ready", id: "current", name: "Atual" })
  })

  it("trata rejeição de rede como erro recuperável", async () => {
    const result = await loadPrimaryCommunity(
      {
        auth: {
          getUser: async () => {
            throw new Error("offline")
          },
        },
        from: () => table({ data: [], error: null }),
      } as never,
      "current-locality",
    )

    expect(result).toEqual({ status: "error" })
  })

  it("não escolhe uma comunidade quando o membro não tem membership approved", async () => {
    const result = await loadPrimaryCommunity(
      client({
        memberships: { data: [], error: null },
        communities: { data: [], error: null },
      }) as never,
      "current-locality",
    )

    expect(result).toEqual({ status: "none" })
  })
})
