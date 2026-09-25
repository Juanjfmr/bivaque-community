import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  type CommunityCard,
  currentLocalityId,
  readCommunityUrlState,
  reconcileSearchText,
  selectCommunityForResults,
  writeCommunityUrlState,
} from "web/app/(shell)/communities/communities-data"

const screenSource = readFileSync(
  join(import.meta.dirname, "../../../apps/web/app/(shell)/communities/communities-screen.tsx"),
  "utf8",
)

const community = (id: string, name: string, description: string | null = null): CommunityCard => ({
  id,
  name,
  description,
  localityId: "locality-1",
  cityLabel: "Manaus, AM",
  bannerUrl: null,
  thumbnailUrl: null,
})

describe("localidade atual das comunidades", () => {
  it("prefere a membership current mesmo quando leaving é mais antiga", () => {
    expect(
      currentLocalityId([
        { locality_id: "origin", kind: "leaving" },
        { locality_id: "current", kind: "current" },
      ]),
    ).toBe("current")
  })

  it("não inventa current quando só existe origem em saída", () => {
    expect(currentLocalityId([{ locality_id: "origin", kind: "leaving" }])).toBeNull()
  })
})

describe("seleção do painel de comunidade", () => {
  it("mantém a seleção quando ela continua nos resultados", () => {
    const selected = selectCommunityForResults(
      [community("a", "Comunidade A"), community("b", "Comunidade B")],
      "b",
      "B",
    )

    expect(selected?.id).toBe("b")
  })

  it("não deixa o painel mostrar uma comunidade que a busca removeu", () => {
    const selected = selectCommunityForResults(
      [community("a", "Comunidade A"), community("b", "Comunidade B")],
      "a",
      "B",
    )

    expect(selected?.id).toBe("b")
  })

  it("não deixa painel fantasma quando a busca não tem resultado", () => {
    const selected = selectCommunityForResults([community("a", "Comunidade A")], "a", "inexistente")

    expect(selected).toBeNull()
  })
})

describe("estado de navegação das comunidades", () => {
  it("lê e escreve abas, busca e seleção sem perder outros parâmetros", () => {
    const current = new URLSearchParams("cidade=origin&aba=minhas&q=vila&comunidade=a")
    expect(readCommunityUrlState(current)).toEqual({
      tab: "minhas",
      query: "vila",
      selectedId: "a",
    })
    expect(
      writeCommunityUrlState(current, { tab: "descobrir", query: "nova", selectedId: "b" }),
    ).toBe("cidade=origin&aba=descobrir&q=nova&comunidade=b")
  })

  it("remove uma seleção inválida sem apagar a cidade e a busca", () => {
    const current = new URLSearchParams("cidade=origin&aba=descobrir&q=vila&comunidade=invalida")
    expect(writeCommunityUrlState(current, { selectedId: null })).toBe(
      "cidade=origin&aba=descobrir&q=vila",
    )
  })
})

describe("motivo do pedido", () => {
  it("é controlado e desmontado junto com a troca de comunidade", () => {
    expect(screenSource).toContain("motivoState")
    expect(screenSource).toContain("motivoState.communityId === selectedId")
    expect(screenSource).toContain("value={motivo}")
    expect(screenSource).toContain("onChange={(event) => setMotivo(event.target.value)}")
    expect(screenSource).toContain("key={selected.id}")
    expect(screenSource).toContain("useSearchParams")
    expect(screenSource).toContain("router.push")
    expect(screenSource).toContain("router.replace")
    expect(screenSource).toContain("writeCommunityUrlState")
    expect(screenSource).toContain("selectedId: canonicalId")
  })

  it("o campo de busca guarda o texto cru; a URL recebe o termo limpo com atraso", () => {
    // O campo controlado pela URL perdia o espaço digitado (a URL guarda o
    // termo com trim). O valor do campo é estado local.
    expect(screenSource).toContain("value={searchText}")
    expect(screenSource).not.toContain("value={query}")
    expect(screenSource).toContain("SEARCH_URL_DEBOUNCE_MS")
    expect(writeCommunityUrlState(new URLSearchParams(), { query: " vila aj " })).toBe("q=vila+aj")
  })

  it("a volta da URL que o próprio campo mandou não apaga o que continuou sendo digitado", () => {
    // Enviou "vila"; enquanto a navegação carregava, a pessoa digitou "vila aj".
    expect(reconcileSearchText("vila aj", "vila", "vila")).toBe("vila aj")
  })

  it("mudança vinda de fora (voltar no histórico, limpar) manda no campo", () => {
    expect(reconcileSearchText("vila aj", "ajuricaba", null)).toBe("ajuricaba")
    expect(reconcileSearchText("vila aj", "", null)).toBe("")
  })

  it("espaço nas pontas é o mesmo termo e fica como digitado", () => {
    expect(reconcileSearchText("vila ", "vila", null)).toBe("vila ")
  })
})
