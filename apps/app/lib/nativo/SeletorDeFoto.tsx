import { Capacitor } from "@capacitor/core"
import type { ComponentProps } from "react"
import { fotoDaCamera } from "@/lib/nativo/foto"

export function SeletorDeFoto({ onClick, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      onClick={(evento) => {
        onClick?.(evento)
        if (
          evento.defaultPrevented ||
          !Capacitor.isNativePlatform() ||
          props.accept?.includes("application/pdf")
        )
          return
        evento.preventDefault()
        const campo = evento.currentTarget
        void fotoDaCamera()
          .then((foto) => {
            const arquivos = new DataTransfer()
            arquivos.items.add(foto)
            campo.files = arquivos.files
            campo.dispatchEvent(new Event("change", { bubbles: true }))
          })
          .catch((erro: unknown) => {
            if (erro instanceof Error && /cancel/i.test(erro.message)) return
            window.alert("Não foi possível obter a foto. Tente novamente.")
          })
      }}
    />
  )
}
