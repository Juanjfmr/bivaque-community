"use client"

import { useEffect, useState } from "react"

// O avatar só recebe a foto depois que ela carrega. Provar em runtime
// (captura 2026-09-08): quando um <Avatar.Image> montado falha, o HeroUI v3
// não devolve o <Avatar.Fallback> — o círculo fica vazio, sem foto e sem
// inicial. Pedir a URL primeiro com Image() decide antes de montar: 404 →
// inicial (o caminho nunca montou Image), 200 → foto. O navegador repete o
// 404 no console porque a requisição é do próprio membro; é o contrato do
// endpoint (route.ts: "No row means you may not see this person — 404").
export function useAvatarSrc(userId: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setSrc(null)
      return
    }
    const url = `/api/avatar/${userId}`
    let cancelled = false
    const probe = new Image()
    probe.onload = () => {
      if (!cancelled) setSrc(url)
    }
    probe.onerror = () => {
      if (!cancelled) setSrc(null)
    }
    probe.src = url
    return () => {
      cancelled = true
      probe.onload = null
      probe.onerror = null
    }
  }, [userId])

  return src
}
