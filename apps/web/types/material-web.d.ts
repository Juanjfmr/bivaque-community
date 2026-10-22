import type { CSSProperties, ReactNode } from "react"

// PORT-001 (R73): as tags do Material Web que a landing usa. O ADR-20261022
// pede declaração de tipos própria no lugar de `any` solto, e só os atributos
// que a landing realmente passa — o resto do componente continua sendo do
// @material/web.
//
// O arquivo é referenciado por `import type` nos adaptadores de
// apps/web/app/components/material/, porque o `tsconfig` do app não inclui
// `types/**`: a importação de tipo traz o arquivo para o programa e aplica o
// aumento do JSX no projeto inteiro.
//
// Os opcionais aceitam `undefined` porque o React trata "prop ausente" e
// "prop com undefined" do mesmo jeito, e o `exactOptionalPropertyTypes` do
// repositório não deixa passar de outro modo.
type MaterialBase = Readonly<{
  children?: ReactNode
  className?: string | undefined
  id?: string | undefined
  slot?: string | undefined
  style?: CSSProperties | undefined
}>

export type MaterialFilledButtonProperties = MaterialBase &
  Readonly<{
    "data-href"?: string | undefined
    disabled?: boolean | undefined
    type?: "button" | "reset" | "submit" | undefined
  }>

export type MaterialIconProperties = MaterialBase &
  Readonly<{
    "aria-hidden"?: "false" | "true" | undefined
    "aria-label"?: string | undefined
  }>

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-filled-button": MaterialFilledButtonProperties
      "md-icon": MaterialIconProperties
    }
  }
}
