"use client"

import { Button } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import styles from "../onboarding.module.css"

export function StatusActions({ refresh }: { refresh: boolean }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await createBrowserClient().auth.signOut()
    router.push("/login")
  }

  return (
    <div className={styles["form"]}>
      {refresh && (
        <Button
          variant="primary"
          className={styles["primaryButton"] ?? ""}
          onPress={() => router.refresh()}
        >
          Atualizar situação
        </Button>
      )}
      <Button
        variant="secondary"
        className={styles["secondaryButton"] ?? ""}
        onPress={handleSignOut}
        isDisabled={signingOut}
      >
        {signingOut ? "Saindo..." : "Sair"}
      </Button>
    </div>
  )
}
