"use client"

import { Button, SearchField, Spinner } from "@heroui/react"
import { Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { SearchClearButton } from "../../../components/bivaque/close-button"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { readStoredCity, type StoredCity, writeStoredCity } from "../city-storage"
import { ContextSteps } from "../components/context-steps"
import styles from "../onboarding.module.css"
import { type CityOption, searchCitiesAction } from "./city-actions"

// Prancha 39 (painel esquerdo) — o passo Cidade do contexto. A pessoa busca
// por nome, escolhe um cartão com cidade e UF, e continua. Persistir a
// localidade é o passo seguinte; escolher cidade NÃO concede participação em
// comunidade privada nenhuma.
//
// O vínculo de localidade é criado no fim da personalização (R15), quando o
// nome já foi confirmado; aqui só se guarda a escolha. O catálogo vem do banco
// (Server Action) e falha de catálogo é erro recuperável, nunca lista vazia.

export default function OnboardingLocalityPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [cities, setCities] = useState<CityOption[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<StoredCity | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const boot = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/locality")
        return
      }

      setSelected(readStoredCity(window.sessionStorage))

      try {
        const statusRes = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (statusRes.ok) {
          const status = (await statusRes.json()) as { localityMember?: boolean }
          if (status.localityMember) {
            router.replace("/inicio")
            return
          }
        }
      } catch {
        // Falha ao ler o estado não impede escolher a cidade; o servidor
        // continua sendo quem decide o vínculo.
      }

      try {
        const results = await searchCitiesAction("")
        setCities(results)
      } catch {
        setError("Não foi possível carregar as cidades. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [router, supabase])

  useEffect(() => {
    if (loading) return
    let cancelled = false
    const handle = window.setTimeout(async () => {
      setSearching(true)
      setError(null)
      try {
        const results = await searchCitiesAction(query)
        if (!cancelled) setCities(results)
      } catch {
        if (!cancelled) setError("Não foi possível buscar cidades. Tente novamente.")
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, loading])

  const handleContinue = () => {
    setError(null)
    if (!selected) {
      setError("Escolha uma cidade para continuar.")
      return
    }
    setSubmitting(true)
    try {
      writeStoredCity(window.sessionStorage, selected)
      router.push("/onboarding/perfil")
    } catch {
      setError("Não foi possível guardar sua escolha. Tente novamente.")
      setSubmitting(false)
    }
  }

  return (
    <ContextSteps
      current="cidade"
      titleId="locality-heading"
      title="Qual cidade você quer explorar?"
      description="Encontre comunidades, eventos e serviços na sua região."
    >
      <div className={styles["contextWidth"]}>
        <SearchField
          aria-label="Buscar cidade"
          className={styles["citySearch"] ?? ""}
          value={query}
          onChange={setQuery}
          onClear={() => setQuery("")}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar cidade" />
            {query ? <SearchClearButton /> : null}
          </SearchField.Group>
        </SearchField>

        {loading ? (
          <div className={styles["loadingState"]}>
            <Spinner size="lg" color="accent" />
            <p>Carregando cidades...</p>
          </div>
        ) : (
          <>
            {cities.length === 0 ? (
              <p className={styles["cityEmpty"]}>
                Nenhuma cidade encontrada para “{query.trim()}”. Tente outro nome.
              </p>
            ) : (
              <ul className={styles["cityList"]} aria-label="Cidades disponíveis">
                {cities.map((city) => {
                  const isSelected = selected?.ibgeCode === city.ibgeCode
                  return (
                    <li key={city.ibgeCode}>
                      <button
                        type="button"
                        className={styles["cityCard"]}
                        data-state={isSelected ? "selected" : "idle"}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelected(city)
                          setError(null)
                        }}
                      >
                        <span className={styles["cityCardIcon"]}>
                          <Building2 aria-hidden="true" />
                        </span>
                        <span className={styles["cityCardText"]}>
                          <span className={styles["cityCardName"]}>{city.cityName}</span>
                          <span className={styles["cityCardState"]}>{city.stateCode}</span>
                        </span>
                        <span className={styles["cityCardRadio"]} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {searching ? (
              <p className={styles["cityEmpty"]} role="status">
                Buscando...
              </p>
            ) : null}

            {error ? (
              <div className={styles["stack"]}>
                <FeedbackAlert variant="danger" description={error} />
              </div>
            ) : null}

            <div className={styles["contextFooter"]}>
              <Button
                type="button"
                variant="primary"
                className="min-h-11 px-8"
                isDisabled={submitting || selected === null}
                onPress={handleContinue}
              >
                {submitting ? "Continuando..." : "Continuar"}
              </Button>
            </div>
          </>
        )}
      </div>
    </ContextSteps>
  )
}
