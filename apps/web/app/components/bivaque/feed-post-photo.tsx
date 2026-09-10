"use client"

// Anexos de foto da publicação (prancha 45): caixa "Clique para adicionar uma
// foto — PNG, JPG até 10MB". O upload é real e passa pelo mesmo caminho do
// compositor anterior (uploadPostPhotoAction), com remoção de EXIF pelo
// canvas antes de sair do dispositivo. Falha é recuperável e nomeada; nunca
// aparece como sucesso.

import { Button, Spinner } from "@heroui/react"
import { ImagePlus, Trash2 } from "lucide-react"
import { useCallback, useRef, useState } from "react"

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

interface PhotoFieldProps {
  value: string
  onChange: (photoPath: string) => void
  onError: (message: string) => void
  /** rótulo acessível único por tela quando criação e edição coexistem */
  selectLabel?: string
}

export function PhotoField({
  value,
  onChange,
  onError,
  selectLabel = "Selecionar foto",
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      onError("")
      if (file.size > MAX_PHOTO_BYTES) {
        onError("A foto deve ter no máximo 10MB.")
        return
      }
      setUploading(true)
      try {
        // O navegador remove EXIF ao redesenhar no canvas e exportar — a
        // localização do aparelho não sai do dispositivo.
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error("não foi possível ler a imagem"))
          img.src = URL.createObjectURL(file)
        })
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("canvas indisponível")
        ctx.drawImage(img, 0, 0)
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.92),
        )
        if (!blob) throw new Error("não foi possível converter a imagem")
        const formData = new FormData()
        formData.append("photo", blob, file.name)
        const { uploadPostPhotoAction } = await import("../../(shell)/events/upload-photo-action")
        const result = await uploadPostPhotoAction(formData)
        onChange(result.photoPath)
      } catch (err) {
        // O teto de 10MB é da caixa; o servidor ainda revalida o blob
        // reencodado. Recusa por tamanho vira convite honesto a escolher
        // imagem menor — nunca silêncio, nunca sucesso falso.
        const reason = err instanceof Error ? err.message : ""
        onError(
          reason.includes("muito grande")
            ? "A foto ficou grande demais para o envio. Escolha uma imagem menor."
            : "Não foi possível enviar a foto. Tente de novo.",
        )
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [onChange, onError],
  )

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <ImagePlus size={16} aria-hidden="true" />
          <span className="truncate">Foto anexada</span>
        </span>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => onChange("")}
          aria-label="Remover foto"
          className="min-h-11"
        >
          <Trash2 size={16} aria-hidden="true" />
          Remover
        </Button>
      </div>
    )
  }

  return (
    <div>
      <label className="relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-[var(--semantic-surface-sunken)] px-3 py-4 text-center transition-colors duration-[var(--semantic-motion-duration-instant)] hover:border-[var(--semantic-action-primary)] focus-within:ring-2 focus-within:ring-[var(--semantic-focus)]">
        {uploading ? (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Spinner size="sm" aria-label="Enviando foto" />
            Enviando foto…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ImagePlus size={18} aria-hidden="true" className="text-muted" />
            <span className="flex flex-col">
              <span className="text-sm font-medium">Clique para adicionar uma foto</span>
              <span className="text-xs text-muted">PNG, JPG até 10MB</span>
            </span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          aria-label={selectLabel}
          disabled={uploading}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </label>
    </div>
  )
}
