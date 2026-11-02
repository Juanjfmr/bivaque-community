"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { COMUNIDADE } from "@/lib/demo/textos"
import { type AbaDaComunidade, abaDaComunidade, hrefDaComunidade } from "@/lib/navegacao"

// As abas de dentro da Comunidade. O endereço manda: quem acende e quem decide o
// conteúdo é o `?aba=`, não um estado do componente — por isso a troca navega em
// vez de só guardar a escolha.
export function AbasDaComunidade({ aba, children }: { aba: AbaDaComunidade; children: ReactNode }) {
  const router = useRouter()

  return (
    <Tabs
      value={aba}
      onValueChange={(novo) => {
        router.push(hrefDaComunidade(abaDaComunidade(novo)))
      }}
      className="gap-4"
    >
      <TabsList
        variant="line"
        className="w-full justify-start gap-1 rounded-none border-b border-(--border) p-0"
      >
        <TabsTrigger
          value="indicacoes"
          className="min-h-11 rounded-none px-3 text-[15px] text-(--muted-foreground) data-[state=active]:text-(--primary)"
        >
          {COMUNIDADE.abaIndicacoes}
        </TabsTrigger>
        <TabsTrigger
          value="grupos"
          className="min-h-11 rounded-none px-3 text-[15px] text-(--muted-foreground) data-[state=active]:text-(--primary)"
        >
          {COMUNIDADE.abaGrupos}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={aba}>{children}</TabsContent>
    </Tabs>
  )
}
