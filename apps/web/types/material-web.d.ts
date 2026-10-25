import type { CSSProperties, Key, MouseEventHandler, ReactNode, Ref } from "react"

// PORT-001 (R73) e PORT-002 (lote 4 da entrada): as tags do Material Web que a
// landing e a entrada usam. O ADR-20261022 pede declaração de tipos própria no
// lugar de `any` solto, e só os atributos que os adaptadores realmente passam —
// o resto do componente continua sendo do @material/web.
//
// O arquivo é referenciado por `import type` nos adaptadores de
// apps/web/app/components/material/, porque o `tsconfig` do app não inclui
// `types/**`: a importação de tipo traz o arquivo para o programa e aplica o
// aumento do JSX no projeto inteiro.
//
// Cada componente tem dois tipos: o das props do adaptador (`…Properties`, com
// a API do React que ele oferece) e o dos atributos da tag (`…ElementProperties`,
// declarado em IntrinsicElements). Misturar os dois faria a tag exigir props que
// só o adaptador conhece — `label` do checkbox e `options` da seleção não são
// atributos do Material.
//
// Os opcionais aceitam `undefined` porque o React trata "prop ausente" e
// "prop com undefined" do mesmo jeito, e o `exactOptionalPropertyTypes` do
// repositório não deixa passar de outro modo.
//
// Atributos compostos usam o nome com hífen (`supporting-text`), que é o que o
// Material lê. O adaptador expõe a prop em camelCase e escreve o atributo com o
// nome que o elemento conhece: o React, em elemento desconhecido, grava o nome
// como está escrito no JSX, e `supportingText` viraria `supportingtext` — um
// atributo que o Material ignora.
type MaterialBase = Readonly<{
  children?: ReactNode
  className?: string | undefined
  id?: string | undefined
  key?: Key | undefined
  slot?: string | undefined
  style?: CSSProperties | undefined
}>

type MaterialButtonElementProperties = MaterialBase &
  Readonly<{
    disabled?: boolean | undefined
    href?: string | undefined
    onClick?: MouseEventHandler<HTMLElement> | undefined
    target?: string | undefined
    type?: "button" | "reset" | "submit" | undefined
  }>

// O que os adaptadores leem e escrevem no elemento depois que o Material o
// registra. Não é o tipo completo do pacote: é a superfície que o React toca.
export type MaterialTextFieldElement = HTMLElement & {
  value: string
  error: boolean
  type: string
}

export type MaterialCheckboxElement = HTMLElement & {
  checked: boolean
}

export type MaterialSelectElement = HTMLElement & {
  value: string
}

export type MaterialDialogElement = HTMLElement & {
  open: boolean
  show: () => Promise<void>
  close: () => Promise<void>
}

// Inputmode do HTML, como o protótipo usa no CPF e no e-mail.
export type MaterialInputMode =
  | "none"
  | "text"
  | "decimal"
  | "numeric"
  | "tel"
  | "search"
  | "email"
  | "url"

export type MaterialTextFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "search"
  | "tel"
  | "url"

export type MaterialFilledButtonProperties = MaterialButtonElementProperties

export type MaterialActionButtonProperties = MaterialButtonElementProperties

export type MaterialIconButtonElementProperties = MaterialButtonElementProperties &
  Readonly<{
    "aria-label": string
  }>

export type MaterialIconButtonProperties = Omit<MaterialIconButtonElementProperties, "aria-label"> &
  Readonly<{
    // O adaptador pede o nome acessível como prop própria porque ele é
    // obrigatório, e porque a prop é o que um leitor humano do JSX procura.
    label: string
  }>

export type MaterialTextFieldElementProperties = MaterialBase &
  Readonly<{
    autocomplete?: string | undefined
    disabled?: boolean | undefined
    error?: boolean | undefined
    "error-text"?: string | undefined
    inputmode?: MaterialInputMode | undefined
    label?: string | undefined
    maxlength?: number | undefined
    minlength?: number | undefined
    name?: string | undefined
    placeholder?: string | undefined
    readonly?: boolean | undefined
    ref?: Ref<MaterialTextFieldElement | null> | undefined
    required?: boolean | undefined
    "supporting-text"?: string | undefined
    type?: MaterialTextFieldType | undefined
    value?: string | undefined
  }>

export type MaterialOutlinedTextFieldProperties = Omit<
  MaterialTextFieldElementProperties,
  "error-text" | "readonly" | "supporting-text"
> &
  Readonly<{
    // O Material usa atributos com hífen; a API do adaptador fala camelCase,
    // como o resto do React. A tradução acontece no JSX do adaptador.
    errorText?: string | undefined
    // O Material emite `input`; o adaptador converte para a API controlada do
    // React e entrega o valor já atualizado.
    onChange?: (value: string) => void
    readOnly?: boolean | undefined
    supportingText?: string | undefined
  }>

export type MaterialCheckboxElementProperties = MaterialBase &
  Readonly<{
    // O Material repassa o ARIA do host para o `<input>` do shadow root; é por
    // aqui que o controle focável ganha nome e descrição.
    "aria-describedby"?: string | undefined
    "aria-label"?: string | undefined
    checked?: boolean | undefined
    disabled?: boolean | undefined
    ref?: Ref<MaterialCheckboxElement | null> | undefined
  }>

export type MaterialCheckboxProperties = MaterialCheckboxElementProperties &
  Readonly<{
    // O texto do label é do adaptador: no Material, o checkbox sozinho não tem
    // rótulo visível. A cópia do protótipo põe o texto ao lado, dentro do
    // mesmo <label>, para o clique no texto também marcar.
    label: ReactNode
    // Nome acessível quando `label` é composto (o aceite dos Termos tem links):
    // o texto puro não cabe no `label` sem perder a marcação. Com `label` string
    // o adaptador usa o próprio texto e esta prop é desnecessária.
    ariaLabel?: string | undefined
    onChange?: (checked: boolean) => void
  }>

export type MaterialSelectOptionElementProperties = MaterialBase &
  Readonly<{
    disabled?: boolean | undefined
    selected?: boolean | undefined
    value: string
  }>

export type MaterialSelectChoice = Readonly<{
  disabled?: boolean | undefined
  label: ReactNode
  value: string
}>

export type MaterialOutlinedSelectElementProperties = MaterialBase &
  Readonly<{
    disabled?: boolean | undefined
    error?: boolean | undefined
    "error-text"?: string | undefined
    label?: string | undefined
    ref?: Ref<MaterialSelectElement | null> | undefined
    required?: boolean | undefined
    "supporting-text"?: string | undefined
    value?: string | undefined
  }>

export type MaterialOutlinedSelectProperties = Omit<
  MaterialOutlinedSelectElementProperties,
  "error-text" | "supporting-text"
> &
  Readonly<{
    errorText?: string | undefined
    onChange?: (value: string) => void
    options: ReadonlyArray<MaterialSelectChoice>
    supportingText?: string | undefined
  }>

export type MaterialIconProperties = MaterialBase &
  Readonly<{
    "aria-hidden"?: "false" | "true" | undefined
    "aria-label"?: string | undefined
  }>

export type MaterialDialogElementProperties = MaterialBase &
  Readonly<{
    ref?: Ref<MaterialDialogElement | null> | undefined
  }>

export type MaterialConfirmDialogProperties = Readonly<{
  cancelLabel?: string | undefined
  confirmLabel: string
  danger?: boolean | undefined
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  text: ReactNode
  title: string
}>

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-checkbox": MaterialCheckboxElementProperties
      "md-dialog": MaterialDialogElementProperties
      "md-filled-button": MaterialFilledButtonProperties
      "md-filled-tonal-button": MaterialFilledButtonProperties &
        Readonly<{ ref?: Ref<HTMLElement | null> | undefined }>
      "md-icon": MaterialIconProperties
      "md-icon-button": MaterialIconButtonElementProperties
      "md-primary-tab": MaterialButtonElementProperties & Readonly<{ active?: boolean | undefined }>
      "md-outlined-button": MaterialActionButtonProperties
      "md-outlined-select": MaterialOutlinedSelectElementProperties
      "md-outlined-text-field": MaterialTextFieldElementProperties
      "md-select-option": MaterialSelectOptionElementProperties
      "md-text-button": MaterialActionButtonProperties
      "md-tabs": MaterialBase
    }
  }
}
