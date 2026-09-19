"use client"

// RUN-006 — seletor de cidade do shell (prancha 01: pino + `Brasília, DF ⌄`).
//
// O que ele troca é a cidade que a tela ESTÁ OLHANDO, não a que a pessoa
// pertence. A troca vai no parâmetro `?locality=<id>` — a mesma convenção que
// /events e /communities já leem — e a localidade do membro continua vindo do
// contexto do shell, resolvida no servidor pela membresia. É o que a W02 exige:
// "cidade de busca não altera autorização". Nenhuma linha a mais fica legível
// por trocar a cidade aqui; a RLS de cada recurso continua decidindo.
//
// Por que diálogo com busca, e não um menu com a lista: hoje são 19 cidades com
// comunidade, mas o alvo é nacional e o catálogo tem 5.571 municípios. Menu
// chapado é confortável em 19 e inutilizável em 60 — e o produto passa por 60.
// A busca roda no banco, com teto de resultados, então a tela não piora quando
// o catálogo cresce. É o mesmo desenho do passo de cidade do onboarding.
//
// Voltar para a própria cidade REMOVE o parâmetro em vez de escrevê-lo. Assim a
// URL canônica da própria cidade é uma só, e ninguém fica com um endereço
// grudado numa cidade que já é a dele.

import { Button, Modal, SearchField, Spinner, useOverlayState } from "@heroui/react"
import { Building2, Check, ChevronDown, MapPin } from "lucide-react"
import type { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { ErrorState } from "./error-state"
import { type SwitcherCity, searchSwitcherCitiesAction } from "./locality-actions"

function labelOf(city: { cityName: string; stateCode: string }): string {
  return city.stateCode ? `${city.cityName}, ${city.stateCode}` : city.cityName
}

export function LocalitySwitcher() {
  const { current } = useLocalityContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dialog = useOverlayState()

  const [query, setQuery] = useState("")
  const [cities, setCities] = useState<SwitcherCity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const viewingId = searchParams.get("locality") ?? current.id
  const viewingCity = cities.find((city) => city.id === viewingId)
  // Enquanto o catálogo não chega, o rótulo é o da cidade do membro — nunca um
  // espaço vazio que reflui o cabeçalho quando a lista carrega.
  const viewingLabel = viewingCity ? labelOf(viewingCity) : labelOf(current)

  const load = useCallback((term: string) => {
    setLoading(true)
    setError("")
    searchSwitcherCitiesAction(term)
      .then(setCities)
      .catch(() => setError("Não foi possível carregar as cidades. Tente novamente."))
      .finally(() => setLoading(false))
  }, [])

  // Busca com folga entre teclas: sem isso cada letra vira uma ida ao banco.
  useEffect(() => {
    if (!dialog.isOpen) return
    const timer = setTimeout(() => load(query), 200)
    return () => clearTimeout(timer)
  }, [dialog.isOpen, query, load])

  const goTo = useCallback(
    (localityId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (localityId === current.id) params.delete("locality")
      else params.set("locality", localityId)
      const search = params.toString()
      dialog.close()
      router.push(`${pathname}${search ? `?${search}` : ""}` as Route)
    },
    [current.id, dialog, pathname, router, searchParams],
  )

  return (
    <>
      <button
        type="button"
        onClick={dialog.open}
        data-testid="locality-switcher"
        aria-label={`Cidade: ${viewingLabel}. Trocar cidade`}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-[var(--semantic-surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
      >
        <MapPin size={16} className="text-[var(--semantic-action-primary)]" aria-hidden="true" />
        <span className="hidden text-sm font-medium sm:inline">{viewingLabel}</span>
        <ChevronDown size={14} className="text-muted" aria-hidden="true" />
      </button>

      <Modal state={dialog}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Trocar cidade</Modal.Heading>
                <Modal.CloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <p className="mb-3 text-sm text-muted">
                  Você continua participando de {labelOf(current)}. Trocar aqui muda só o que esta
                  tela mostra.
                </p>

                <SearchField
                  aria-label="Buscar cidade"
                  value={query}
                  onChange={setQuery}
                  onClear={() => setQuery("")}
                >
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Buscar cidade" />
                    {query ? <SearchField.ClearButton /> : null}
                  </SearchField.Group>
                </SearchField>

                <div className="mt-3">
                  {error ? (
                    <ErrorState message={error} onRetry={() => load(query)} />
                  ) : loading ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted">
                      <Spinner size="sm" aria-label="Carregando cidades" />
                      Carregando cidades…
                    </div>
                  ) : cities.length === 0 ? (
                    <p className="py-6 text-sm text-muted">
                      {query.trim()
                        ? `Nenhuma cidade com comunidade encontrada para “${query.trim()}”.`
                        : "Nenhuma cidade com comunidade disponível agora."}
                    </p>
                  ) : (
                    <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                      {cities.map((city) => {
                        const isViewing = city.id === viewingId
                        return (
                          <li key={city.id}>
                            <button
                              type="button"
                              onClick={() => goTo(city.id)}
                              aria-current={isViewing ? "true" : undefined}
                              data-testid="city-option"
                              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--semantic-surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                            >
                              <Building2
                                size={16}
                                className="shrink-0 text-muted"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {labelOf(city)}
                                {city.id === current.id ? (
                                  <span className="text-muted"> · sua cidade</span>
                                ) : null}
                              </span>
                              {isViewing ? (
                                <Check
                                  size={16}
                                  className="shrink-0 text-[var(--semantic-action-primary)]"
                                  aria-hidden="true"
                                />
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={dialog.close}>
                  Cancelar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
