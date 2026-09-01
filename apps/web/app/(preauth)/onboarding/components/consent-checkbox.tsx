"use client"

import { Checkbox } from "@heroui/react"
import Link from "next/link"
import styles from "../onboarding.module.css"

interface ConsentCheckboxProps {
  isSelected: boolean
  onChange: (selected: boolean) => void
}

export function ConsentCheckbox({ isSelected, onChange }: ConsentCheckboxProps) {
  return (
    <Checkbox
      aria-label="Aceito o Código de conduta e a Política de privacidade"
      className={styles["consentCheckbox"] ?? ""}
      isSelected={isSelected}
      name="accept_consent"
      value="true"
      onChange={onChange}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span>
          Li e concordo com o <Link href="/codigo-de-conduta">Código de conduta</Link> e a{" "}
          <Link href="/privacidade">Política de privacidade</Link>.
        </span>
      </Checkbox.Content>
    </Checkbox>
  )
}
