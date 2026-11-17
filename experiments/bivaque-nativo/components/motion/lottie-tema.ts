import { type Esquema, HEX } from "@/lib/theme"

// Os Lotties são desenhados com a paleta clara. No escuro, a ardósia some sobre o fundo
// (contraste ~1,9:1), então a cor de cada preenchimento e traço é trocada pela do tema.
type Rgb = [number, number, number]

const CLARO_PARA_ESCURO: [string, string][] = [
  [HEX.light.primary, HEX.dark.primary],
  [HEX.light.brasa, HEX.dark.brasa],
]

function paraRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function mesmaCor(a: number[], b: Rgb): boolean {
  return b.every((v, i) => Math.abs((a[i] ?? -1) - v) < 0.01)
}

const TROCAS = CLARO_PARA_ESCURO.map(([de, para]) => [paraRgb(de), paraRgb(para)] as const)

function recolorir(no: unknown): unknown {
  if (Array.isArray(no)) return no.map(recolorir)
  if (no === null || typeof no !== "object") return no
  const objeto = no as Record<string, unknown>
  const saida: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(objeto)) saida[chave] = recolorir(valor)
  const ehCor = objeto.ty === "fl" || objeto.ty === "st"
  const cor = objeto.c as { k?: unknown } | undefined
  if (ehCor && cor && Array.isArray(cor.k) && typeof cor.k[0] === "number") {
    const atual = cor.k as number[]
    const troca = TROCAS.find(([de]) => mesmaCor(atual, de))
    if (troca) saida.c = { ...cor, k: [...troca[1], atual[3] ?? 1] }
  }
  return saida
}

const cache = new WeakMap<object, object>()

/** Devolve o Lottie com as cores do esquema; no claro, o arquivo original. */
export function lottieDoTema<T extends object>(fonte: T, esquema: Esquema): T {
  if (esquema === "light") return fonte
  const pronto = cache.get(fonte)
  if (pronto) return pronto as T
  const escuro = recolorir(fonte) as T
  cache.set(fonte, escuro)
  return escuro
}
