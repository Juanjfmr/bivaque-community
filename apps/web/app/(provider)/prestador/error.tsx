"use client"

import { Button } from "@heroui/react"
import { useEffect } from "react"

export default function ProviderError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    // Log for the server console; the user never sees the raw message.
    console.error("provider panel error", error.digest ?? error.message)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não foi possível carregar esta parte do painel agora. Nada do seu negócio foi alterado.
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="primary" size="md" onPress={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
