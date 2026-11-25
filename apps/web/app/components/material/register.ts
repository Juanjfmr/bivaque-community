"use client"

// PORT-001 (R73) e PORT-002 (lote 4 da entrada): o registro dos elementos
// `md-*` acontece só no cliente e só com os componentes que a tela usa
// (ADR-20261022, item 1). O import é dinâmico de propósito: o módulo do Material
// toca `HTMLElement` na avaliação, então importá-lo no topo quebraria a
// renderização no servidor.
//
// PORT-002: um registro por componente, e não um só para tudo. A entrada usa
// checkbox e botões; a landing usa só o botão preenchido. Com um registro único,
// qualquer tela que montasse um adaptador puxaria o pacote inteiro. A promessa de
// cada módulo fica guardada para o efeito não repetir o import.
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

export function registerCheckbox(): Promise<void> {
  return registerModule("checkbox", () => import("@material/web/checkbox/checkbox.js"))
}
