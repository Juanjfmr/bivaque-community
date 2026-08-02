"use client"

import { Button, Card, Tabs } from "@heroui/react"
import { useState } from "react"

const CATEGORIES = [
  { id: "servicos_locais", label: "Serviços Locais" },
  { id: "saude_bem_estar", label: "Saúde & Bem-estar" },
  { id: "educacao", label: "Educação" },
  { id: "esporte_lazer", label: "Esporte & Lazer" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "transporte", label: "Transporte" },
  { id: "moradia", label: "Moradia" },
  { id: "outros", label: "Outros" },
] as const

type CategoryId = (typeof CATEGORIES)[number]["id"]

type RecommendationRequest = {
  id: string
  title: string
  body: string
  category: CategoryId
  authorName: string
  scope: string
  createdAt: string
}

const MOCK_REQUESTS: RecommendationRequest[] = [
  {
    id: "1",
    title: "Algum dentista de confiança na zona leste?",
    body: "Estou procurando um dentista que atenda na zona leste de Manaus, de preferência com horário flexível.",
    category: "saude_bem_estar",
    authorName: "Membro da comunidade",
    scope: "Manaus, AM",
    createdAt: "2026-08-02",
  },
  {
    id: "2",
    title: "Onde encontrar material escolar?",
    body: "Preciso de indicações de papelarias na zona sul que tenham variedade de material escolar.",
    category: "educacao",
    authorName: "Membro da comunidade",
    scope: "Manaus, AM",
    createdAt: "2026-08-01",
  },
]

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color-mix(in_oklch,var(--foreground)_15%,transparent)] px-2 py-0.5 text-xs text-muted">
      {scope}
    </span>
  )
}

function CategoryBadge({ category }: { category: CategoryId }) {
  const label = CATEGORIES.find((c) => c.id === category)?.label ?? category
  return (
    <span className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  )
}

export default function RecommendationsPage() {
  const [selectedTab, setSelectedTab] = useState("browse")
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "">("")

  const filteredRequests =
    selectedCategory === ""
      ? MOCK_REQUESTS
      : MOCK_REQUESTS.filter((r) => r.category === selectedCategory)

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Indicações</h1>
        <p className="text-sm text-muted">
          Peça e compartilhe recomendações com sua comunidade local. Este é um espaço de utilidade
          comunitária, não um marketplace.
        </p>
      </div>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        variant="primary"
        aria-label="Seções de indicações"
      >
        <Tabs.List>
          <Tabs.Tab key="browse" id="browse">
            Explorar
          </Tabs.Tab>
          <Tabs.Tab key="request" id="request">
            Pedir indicação
          </Tabs.Tab>
          <Tabs.Tab key="saved" id="saved">
            Salvas
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel key="browse">
          <div className="flex flex-col gap-4">
            <select
              aria-label="Filtrar por categoria"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryId | "")}
              className="max-w-xs rounded-md border border-[color-mix(in_oklch,var(--foreground)_15%,transparent)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {filteredRequests.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                Nenhuma indicação encontrada nesta categoria.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge category={request.category} />
                        <ScopeBadge scope={request.scope} />
                      </div>

                      <h2 className="text-base font-semibold">{request.title}</h2>
                      <p className="text-sm text-muted">{request.body}</p>

                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>
                          {request.authorName} &middot; {request.createdAt}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="tertiary" size="sm" aria-label="Responder">
                            Responder
                          </Button>
                          <Button variant="tertiary" size="sm" aria-label="Salvar">
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel key="request">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <select
              required
              aria-label="Categoria"
              defaultValue=""
              className="max-w-xs rounded-md border border-[color-mix(in_oklch,var(--foreground)_15%,transparent)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            <input
              required
              aria-label="Título"
              placeholder="Título da sua indicação"
              className="rounded-md border border-[color-mix(in_oklch,var(--foreground)_15%,transparent)] bg-[var(--surface)] px-3 py-2 text-sm"
            />

            <textarea
              required
              aria-label="Descrição"
              placeholder="Descreva o que você está procurando. Evite termos comerciais como preço, pagamento, anúncio ou contato comercial."
              rows={3}
              className="rounded-md border border-[color-mix(in_oklch,var(--foreground)_15%,transparent)] bg-[var(--surface)] px-3 py-2 text-sm"
            />

            <p className="text-xs text-muted">
              Sua indicação será visível apenas para membros da sua localidade ou grupo. Este espaço
              não permite conteúdo comercial, anúncios ou promoções.
            </p>

            <Button type="submit" variant="primary" size="sm" className="self-start">
              Publicar pedido
            </Button>
          </form>
        </Tabs.Panel>

        <Tabs.Panel key="saved">
          <p className="py-12 text-center text-sm text-muted">
            Você ainda não salvou nenhuma indicação. Explore as indicações da comunidade e salve as
            que forem úteis para você.
          </p>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
