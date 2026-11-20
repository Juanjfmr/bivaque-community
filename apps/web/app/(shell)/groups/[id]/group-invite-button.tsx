"use client"

import { Button } from "@heroui/react"
import { Share2 } from "lucide-react"
import { useState } from "react"

// COM-005 (B2 do lote 5, ADR-20261023 §3 "Convite"): o convite é um link para
// a tela do grupo. Usa o compartilhamento nativo quando existe e cai para
// copiar o link. Como o link não dá entrada, não há o que revogar: no grupo
// Fechado, quem abre o endereço ainda pede para entrar.
export function GroupInviteButton({ groupName, path }: { groupName: string; path: string }) {
  const [message, setMessage] = useState<string | null>(null)

  async function invite() {
    const url = `${window.location.origin}${path}`
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Grupo ${groupName} no Bivaque`, url })
        return
      } catch (error) {
        if ((error as Error).name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Link copiado.")
    } catch {
      setMessage("Não foi possível copiar o link.")
    }
  }

  return (
    <span className="relative">
      <Button variant="tertiary" size="sm" onPress={invite}>
        <Share2 size={16} aria-hidden="true" />
        Convidar
      </Button>
      {message ? (
        <span role="status" className="absolute top-full right-0 mt-1 text-xs text-muted">
          {message}
        </span>
      ) : null}
    </span>
  )
}
