import type { ReactNode } from "react"
import { materialSymbols, notoSans, notoSerif } from "../../fonts/landing-fonts"
import { BrandMark } from "../../landing/brand-mark"
import { MaterialIconButton } from "../material/icon-button"
import { MaterialIcon } from "../material/material-icon"
import "../../brand-tokens.css"
import "./entry.css"

// PORT-002 (lote 4 da entrada): a casca da entrada do protótipo
// (`.en` e `.en-top` em entry.css, montadas por `entryTop` em account.js). O
// topo tem o símbolo oficial, o nome e, quando a tela pede, o voltar. O corpo é
// livre: cada passo da entrada monta o próprio formulário.
//
// Este arquivo é servidor: só os botões são adaptadores cliente. `.bv-skin`
// aplica os tokens da marca que a landing usa, e as variáveis das três fontes
// vêm do mesmo `next/font/local` — nada de CDN e nenhuma cor solta aqui.
//
// O símbolo é o mesmo componente da landing (`apps/web/app/landing/brand-mark.tsx`).
// Ele ficou onde estava: o `allowed_paths` deste contrato abre
// `components/material/` e `components/entry/`, não `components/` para um
// arquivo compartilhado, e duplicar o desenho criaria duas fontes para o mesmo
// símbolo.
//
// A correção da revisão pôs o símbolo dentro de `.en-mark`: tamanho e cores
// dele vivem em landing.css presos a `.ld` e não alcançam a entrada, então o
// SVG saía no tamanho do viewBox (mais de 56 px) e com os dois caminhos no
// preto padrão, até no tema escuro. entry.css dá o tamanho do protótipo e as
// cores dos tokens do `.bv-skin`, sem tocar na landing.
type EntryShellProperties = Readonly<{
  action?: ReactNode
  backHref?: string | undefined
  children: ReactNode
}>

export function EntryShell({ action, backHref, children }: EntryShellProperties) {
  return (
    <div
      className={`bv-skin bv-entry ${notoSans.variable} ${notoSerif.variable} ${materialSymbols.variable}`}
    >
      <div className="en">
        <header className="en-top">
          {backHref ? (
            <MaterialIconButton href={backHref} label="Voltar">
              <MaterialIcon name="arrow_back" />
            </MaterialIconButton>
          ) : null}
          <span className="en-mark">
            <BrandMark />
          </span>
          <span className="en-brand">Bivaque</span>
          {action ? <div className="en-top-action">{action}</div> : null}
        </header>
        <div className="en-body">{children}</div>
      </div>
    </div>
  )
}
