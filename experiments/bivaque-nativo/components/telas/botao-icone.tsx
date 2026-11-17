import { Icone, type NomeIcone } from "@/components/icons"
import { Pressable } from "react-native"
import { useCores } from "./cores"

interface BotaoIconeProps {
  nome: NomeIcone
  /** Nome acessível do botão; todo botão só de ícone precisa de um. */
  rotulo: string
  aoPressionar: () => void
  className?: string
}

/** Alvo de toque de 44 x 44 com ícone do set. */
export function BotaoIcone({ nome, rotulo, aoPressionar, className }: BotaoIconeProps) {
  const cores = useCores()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={aoPressionar}
      className={`h-11 w-11 items-center justify-center rounded-full ${className ?? ""}`}
    >
      <Icone nome={nome} tamanho={22} cor={cores.foreground} />
    </Pressable>
  )
}
