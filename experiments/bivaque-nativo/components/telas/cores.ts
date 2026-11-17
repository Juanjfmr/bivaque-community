import { useColorScheme } from "nativewind"
import { HEX } from "@/lib/theme"

/** Cores do tema em hex, para o que não lê classe (ícones SVG do set provisório). */
export function useCores() {
  const { colorScheme } = useColorScheme()
  return HEX[colorScheme ?? "light"]
}
