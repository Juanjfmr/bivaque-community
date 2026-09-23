"use client"

import { Button, Form, Input, TextArea } from "@heroui/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { Card } from "../../../components/bivaque/card"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { showToast } from "../../../components/bivaque/toast"

// Prancha 12/61: "Sugerir referência". Quem sugere NÃO publica — a linha nasce
// pending e vai para a fila do operador (/guide-queue), que é a curadoria
// humana. A função do banco deriva a cidade da própria associação do membro,
// força status='pending' e registra quem sugeriu; a tela só coleta o texto.
const CATEGORY_OPTIONS = [
  { id: "school", label: "Colégio" },
  { id: "hospital", label: "Hospital" },
  { id: "transporter", label: "Transportadora" },
  { id: "courier", label: "Despachante" },
] as const

type Category = (typeof CATEGORY_OPTIONS)[number]["id"]

const MESSAGES: Record<string, string> = {
  "maximum 5 pending guide suggestions per member":
    "Você já tem cinco sugestões aguardando revisão. Espere a fila andar para sugerir mais.",
  "only locality members can suggest guide references":
    "Só membros de uma cidade podem sugerir referências para o guia dela.",
  "reference name must have between 2 and 120 characters":
    "O nome precisa ter entre 2 e 120 caracteres.",
  "reference description must have up to 500 characters":
    "A descrição pode ter até 500 caracteres.",
  "reference website must start with http:// or https://":
    "O site precisa começar com http:// ou https://.",
  "invalid reference phone":
    "Confira o telefone: use DDD e apenas números, espaços, parênteses ou traço.",
}

export default function SuggestGuideEntryPage() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<Category>("school")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [website, setWebsite] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Sua sessão expirou. Entre novamente para sugerir uma referência.")
      setPending(false)
      return
    }

    // `exactOptionalPropertyTypes` está ligado: argumento opcional se OMITE, não
    // se passa como undefined. O banco normaliza vazio para NULL.
    const args: Database["public"]["Functions"]["suggest_guide_entry"]["Args"] = {
      p_category: category,
      p_name: name.trim(),
      p_description: description.trim(),
    }
    if (website.trim().length > 0) args.p_website_url = website.trim()
    if (phone.trim().length > 0) args.p_phone = phone.trim()

    const { error: rpcError } = await supabase.rpc("suggest_guide_entry", args)

    if (rpcError) {
      setError(MESSAGES[rpcError.message] ?? "Não foi possível enviar a sugestão. Tente novamente.")
      setPending(false)
      return
    }

    showToast({
      title: "Sugestão enviada.",
      description: "Ela entra na fila de curadoria do guia.",
      variant: "success",
    })
    router.push("/guide")
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <nav aria-label="Trilha" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/guide"
              className="inline-flex min-h-11 items-center px-1.5 transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
            >
              Guia
            </Link>
            <span aria-hidden="true">›</span>
          </li>
          <li aria-current="page">Sugerir referência</li>
        </ol>
      </nav>

      <header className="mt-2 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sugerir referência</h1>
        <p className="text-sm text-muted">
          Indique um lugar ou serviço que ajudou você a chegar. A curadoria é humana: a referência
          só aparece no guia depois que a operação revisar.
        </p>
      </header>

      <Card className="mt-6 p-5">
        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="sugestao-nome" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="sugestao-nome"
              aria-label="Nome da referência"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {/* NOME ANTES DE TIPO (prancha 44 painel 3). A prancha desenha
              "Nome" como primeiro campo e "Categoria" logo abaixo. O código
              liderava por "Tipo de referência": pedia a CLASSIFICAÇÃO antes de
              saber o que está sendo classificado. Mesma classe do compositor e
              do formulário comunitário — uma decisão SOBRE o conteúdo tomando a
              frente do conteúdo. */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sugestao-categoria" className="text-sm font-medium">
              Tipo de referência
            </label>
            {/* select nativo: a lista é fechada no enum do banco, como no
                /guide-queue e no /mercado/novo — um composto aqui só
                acrescentaria superfície. */}
            <select
              id="sugestao-categoria"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="sugestao-descricao" className="text-sm font-medium">
              Por que vale a pena
            </label>
            <TextArea
              id="sugestao-descricao"
              aria-label="Descrição da referência"
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="sugestao-site" className="text-sm font-medium">
                Site (opcional)
              </label>
              <Input
                id="sugestao-site"
                aria-label="Site da referência"
                placeholder="https://..."
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sugestao-telefone" className="text-sm font-medium">
                Telefone (opcional)
              </label>
              <Input
                id="sugestao-telefone"
                aria-label="Telefone da referência"
                placeholder="+55 92 ..."
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>

          {error ? <FeedbackAlert variant="danger" description={error} /> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" isDisabled={pending}>
              {pending ? "Enviando..." : "Enviar sugestão"}
            </Button>
            <Link
              href="/guide"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-fast)] hover:bg-[var(--semantic-selected)]"
            >
              Cancelar
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
