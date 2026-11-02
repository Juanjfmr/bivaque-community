"use client"

import Link from "next/link"
import { MaterialCheckbox } from "../../../components/material/checkbox"

// A linha do aceite do protótipo (`legalConsentText()` em legal/pages.js,
// usada no cadastro e no passo Aceite do Google): a frase com os dois
// documentos como links, dentro do `<label>` da caixa, para o clique no texto
// também marcar.
//
// Um componente só porque a frase é a mesma nos dois lugares, e o registro no
// servidor depende dela estar igual nos dois: duas cópias divergiriam no
// primeiro ajuste de versão dos documentos (ADR-20260907-consentimento-no-
// cadastro).
//
// O nome acessível vai pelo `ariaLabel` do adaptador: no Material, o texto do
// `<label>` nomeia o `<md-checkbox>`, não o `<input>` do shadow root, e o
// rótulo daqui tem links, então não é string. O texto é o mesmo do rótulo
// visível, então nada é anunciado em dobro.
const CHECKBOX_ID = "en-consent"
const TEXT_ID = "en-consent-t"

/** O que o leitor de tela anuncia: a frase visível, sem os links. */
const CONSENT_TEXT = "Li e aceito a Política de privacidade e o Código de conduta."

/** `renderEntrySignup`: "Pelo Google, o aceite vem no passo seguinte." */
const SIGNUP_NOTE = "Pelo Google, o aceite vem no passo seguinte."

type EntryConsentProperties = Readonly<{
  checked: boolean
  /** `signup` acrescenta a nota do Google; `google` é a tela do passo Aceite. */
  note?: "google" | "signup" | undefined
  onChange: (checked: boolean) => void
}>

export function EntryConsent({ checked, note, onChange }: EntryConsentProperties) {
  const name = note === "signup" ? `${CONSENT_TEXT} ${SIGNUP_NOTE}` : CONSENT_TEXT

  return (
    <MaterialCheckbox
      ariaLabel={name}
      checked={checked}
      className="en-check"
      id={CHECKBOX_ID}
      label={
        <span id={TEXT_ID}>
          Li e aceito a{" "}
          <Link href={{ pathname: "/privacidade" }} rel="noreferrer" target="_blank">
            Política de privacidade
          </Link>{" "}
          e o{" "}
          <Link href={{ pathname: "/codigo-de-conduta" }} rel="noreferrer" target="_blank">
            Código de conduta
          </Link>
          .{note === "signup" ? ` ${SIGNUP_NOTE}` : null}
        </span>
      }
      onChange={onChange}
    />
  )
}
