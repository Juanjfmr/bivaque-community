"use client"

// PORT-001 (R73) e PORT-002 (lote 4 da entrada): o registro dos elementos
// `md-*` acontece só no cliente e só com os componentes que a tela usa
// (ADR-20261022, item 1). O import é dinâmico de propósito: o módulo do Material
// toca `HTMLElement` na avaliação, então importá-lo no topo quebraria a
// renderização no servidor.
//
// PORT-002: um registro por componente, e não um só para tudo. A entrada usa
// campo, seleção, checkbox e diálogo; a landing usa só o botão preenchido. Com
// um registro único, qualquer tela que montasse um adaptador puxaria o pacote
// inteiro. A promessa de cada módulo fica guardada para o efeito não repetir o
// import, e dois adaptadores que dividem um módulo (campo e senha, seleção e
// opção) reaproveitam a mesma promessa.
const registrations = new Map<string, Promise<void>>()

function registerModule(name: string, load: () => Promise<unknown>): Promise<void> {
  const existing = registrations.get(name)
  if (existing) return existing
  const promise = load().then(() => undefined)
  registrations.set(name, promise)
  return promise
}

export function registerFilledButton(): Promise<void> {
  return registerModule("filled-button", () => import("@material/web/button/filled-button.js"))
}

export function registerOutlinedButton(): Promise<void> {
  return registerModule("outlined-button", () => import("@material/web/button/outlined-button.js"))
}

export function registerTextButton(): Promise<void> {
  return registerModule("text-button", () => import("@material/web/button/text-button.js"))
}

export function registerIconButton(): Promise<void> {
  return registerModule("icon-button", () => import("@material/web/iconbutton/icon-button.js"))
}

export function registerOutlinedTextField(): Promise<void> {
  return registerModule(
    "outlined-text-field",
    () => import("@material/web/textfield/outlined-text-field.js"),
  )
}

export function registerCheckbox(): Promise<void> {
  return registerModule("checkbox", () => import("@material/web/checkbox/checkbox.js"))
}

// A seleção não funciona sem as opções: `md-outlined-select` lê os filhos
// `md-select-option` para montar o menu e o texto exibido. São dois módulos, um
// por elemento, e o registro da seleção espera os dois.
export function registerOutlinedSelect(): Promise<void> {
  return Promise.all([
    registerModule("outlined-select", () => import("@material/web/select/outlined-select.js")),
    registerModule("select-option", () => import("@material/web/select/select-option.js")),
  ]).then(() => undefined)
}

export function registerDialog(): Promise<void> {
  return registerModule("dialog", () => import("@material/web/dialog/dialog.js"))
}
