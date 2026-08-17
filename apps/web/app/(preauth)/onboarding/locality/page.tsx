"use client"

import { Button, Form, Input, ListBox, Select, Spinner } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

// P0 Task 5: o passo pós-elegibilidade. Acontece uma vez, com a pessoa
// presente, depois de saber que passou. Ela informa o que só ela sabe: a
// localidade (obrigatória, validada no servidor contra o catálogo canônico)
// e confirma o nome. Nada além disso entra aqui — nem interesses (onda E),
// nem pedido de vila (§5.2 separa os atestadores).

type Municipality = { id: string; cityName: string; ibgeCode: string }

export default function OnboardingLocalityPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [ufs, setUfs] = useState<string[]>([])
  const [uf, setUf] = useState<string>("")
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [municipality, setMunicipality] = useState<string>("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)
  const [municipalityLoading, setMunicipalityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const boot = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          router.replace("/login?return=/onboarding/locality")
          return
        }

        const ufsRes = await fetch("/api/localities", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (!ufsRes.ok) {
          setError("Não foi possível carregar as localidades. Tente novamente.")
          return
        }

        const ufsData = (await ufsRes.json()) as { ufs: string[] }
        setUfs(ufsData.ufs ?? [])

        // O nome que o Portal sugeriu atravessou a fronteira em memória (D11):
        // o verify-cpf o devolveu na resposta e o onboarding page o guardou em
        // sessionStorage descartável. Lemos e descartamos aqui.
        const suggested = window.sessionStorage.getItem("onboarding:suggestedName")
        if (typeof suggested === "string" && suggested.length > 0) {
          setDisplayName(suggested)
        }
        window.sessionStorage.removeItem("onboarding:suggestedName")
      } catch {
        setError("Não foi possível carregar seus dados. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [router, supabase])

  useEffect(() => {
    if (uf.length === 0) return
    setMunicipalityLoading(true)
    setMunicipality("")
    setError(null)

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(`/api/localities/${uf}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) {
          setError("Não foi possível carregar os municípios desta UF.")
          return
        }
        const data = (await res.json()) as { municipalities: Municipality[] }
        setMunicipalities(data.municipalities ?? [])
      } catch {
        setError("Não foi possível carregar os municípios.")
      } finally {
        setMunicipalityLoading(false)
      }
    }
    load()
  }, [uf, supabase])

  const handleSubmit = async () => {
    setError(null)
    if (uf.length === 0 || municipality.length === 0) {
      setError("Escolha o estado e a sua cidade.")
      return
    }
    if (displayName.trim().length < 2) {
      setError("Informe o seu nome.")
      return
    }

    const selected = municipalities.find((m) => m.id === municipality)
    if (!selected) {
      setError("Cidade inválida. Escolha uma opção da lista.")
      return
    }

    setSubmitting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/locality")
        return
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "provision",
          ibge_code: selected.ibgeCode,
          display_name: displayName.trim(),
        }),
      })

      const data = (await res.json()) as Record<string, unknown>
      if (typeof data["error"] === "string") {
        setError(data["error"] as string)
        return
      }

      setSuccess(true)
      router.replace("/onboarding/welcome")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao concluir o cadastro")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-12">
        <Spinner size="lg" color="accent" />
      </div>
    )
  }

  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="locality-heading">
        <h1 id="locality-heading" className="text-2xl font-semibold tracking-tight">
          Escolha sua localidade
        </h1>

        {success ? (
          <FeedbackAlert variant="success" description="Cadastro concluído! Bem-vindo." />
        ) : (
          <>
            <p className="text-sm text-muted">
              Sua elegibilidade foi confirmada. Agora informe onde você mora — é isso que conecta
              você à sua cidade no Bivaque.
            </p>

            <Form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
              className="flex flex-col gap-4"
            >
              <Select
                aria-label="Estado"
                selectedKey={uf || null}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    setUf(key)
                    setError(null)
                  }
                }}
                isRequired
              >
                <Select.Trigger>
                  <Select.Value>Selecione o estado</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {ufs.map((code) => (
                      <ListBox.Item key={code} id={code}>
                        {code}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <Select
                aria-label="Cidade"
                selectedKey={municipality || null}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    setMunicipality(key)
                    setError(null)
                  }
                }}
                isRequired
              >
                <Select.Trigger>
                  <Select.Value>
                    {municipalityLoading
                      ? "Carregando..."
                      : municipalities.length === 0
                        ? "Selecione o estado primeiro"
                        : "Selecione a cidade"}
                  </Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {municipalities.map((m) => (
                      <ListBox.Item key={m.id} id={m.id}>
                        {m.cityName}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <Input
                aria-label="Seu nome"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                required
                maxLength={80}
              />

              <Button type="submit" variant="primary" className="w-full" isDisabled={submitting}>
                {submitting ? "Concluindo..." : "Concluir cadastro"}
              </Button>
            </Form>

            {error && <FeedbackAlert variant="danger" description={error} />}
          </>
        )}
      </section>
    </div>
  )
}
