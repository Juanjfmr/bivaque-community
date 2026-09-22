"use client"

import { Button } from "@heroui/react"
import { useEffect, useState } from "react"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { getAvatarSignedUrlAction, uploadAvatarAction } from "./avatar-actions"

export default function AvatarSection() {
  const [src, setSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getAvatarSignedUrlAction()
      .then((url) => {
        if (cancelled) return
        setSrc(url)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
      <p className="text-sm font-medium">Foto de perfil</p>
      <div className="mt-3 flex items-center gap-3">
        <MemberAvatar name="me" size="lg" src={src} />
        <form
          action={async (formData) => {
            setUploading(true)
            setError("")
            try {
              await uploadAvatarAction(formData)
              const url = await getAvatarSignedUrlAction()
              setSrc(url)
            } catch (err) {
              setError(err instanceof Error ? err.message : "Erro no upload")
            } finally {
              setUploading(false)
            }
          }}
          className="flex items-center gap-2"
        >
          <label className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline transition-colors duration-[var(--semantic-motion-duration-fast)]">
            {src ? "Trocar foto" : "Adicionar foto"}
            <input
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              required
            />
          </label>
          <Button type="submit" size="sm" variant="primary" isDisabled={uploading}>
            {uploading ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        PNG, JPEG ou WebP até 5MB. A foto é privada por padrão.
      </p>
    </div>
  )
}
