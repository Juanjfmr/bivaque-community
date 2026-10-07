"use client"

import { Checkbox } from "@heroui/react"
import styles from "./listing-cards.module.css"

type Options = { isFurnished: boolean; acceptsPets: boolean; condoIncluded: boolean }
const labels: Record<keyof Options, string> = {
  isFurnished: "Mobiliado",
  acceptsPets: "Aceita pets",
  condoIncluded: "Condomínio já incluso no aluguel",
}

export function ListingPropertyOptions({
  values,
  onChange,
}: {
  values: Options
  onChange: (key: keyof Options, value: boolean) => void
}) {
  return (
    <div className={`${styles["checkRow"]} ${styles["formFull"]}`}>
      {(Object.keys(labels) as (keyof Options)[]).map((key) => (
        <Checkbox
          key={key}
          aria-label={labels[key]}
          isSelected={values[key]}
          onChange={(value) => onChange(key, value)}
        >
          <Checkbox.Content className="min-h-11">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span>{labels[key]}</span>
          </Checkbox.Content>
        </Checkbox>
      ))}
    </div>
  )
}
