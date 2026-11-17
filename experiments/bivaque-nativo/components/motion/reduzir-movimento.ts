import { useEffect, useState } from "react"
import { AccessibilityInfo } from "react-native"
import { useReducedMotion } from "react-native-reanimated"

export function usarReduzirMovimento() {
  const preferenciaInicial = useReducedMotion()
  const [reduzir, setReduzir] = useState(preferenciaInicial)
  useEffect(() => {
    let ativo = true
    void AccessibilityInfo.isReduceMotionEnabled().then((valor) => { if (ativo) setReduzir(valor) })
    const assinatura = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduzir)
    return () => { ativo = false; assinatura.remove() }
  }, [])
  return reduzir
}
