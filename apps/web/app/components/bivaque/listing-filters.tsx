"use client"

import { Modal } from "@heroui/react"
import { useState } from "react"
import styles from "./listing-cards.module.css"

export function ListingFilters({
  values,
}: {
  values: { q: string; tipo: string; bairro: string; aluguel_max: string; quartos_min: string }
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={styles["secondaryButton"]} onClick={() => setOpen(true)}>
        {/* Prancha property-list: o botão Filtros abre com o ícone de
            sliders. Decorativo — o nome acessível continua sendo "Filtros". */}
        <svg
          className={styles["buttonIcon"]}
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M4 7h10M18 7h2M4 17h4M12 17h8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="10" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Filtros
      </button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog aria-label="Filtrar imóveis">
              <Modal.Header>
                <Modal.Heading>Filtrar imóveis</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <form action="/imoveis" className={styles["filterForm"]}>
                  <input type="hidden" name="q" value={values.q} />
                  <input type="hidden" name="tipo" value={values.tipo} />
                  <label className={styles["fieldLabel"]}>
                    Bairro
                    <input
                      name="bairro"
                      aria-label="Filtrar por bairro"
                      defaultValue={values.bairro}
                      className={styles["fieldInput"]}
                    />
                  </label>
                  <label className={styles["fieldLabel"]}>
                    Aluguel máximo em reais
                    <input
                      name="aluguel_max"
                      aria-label="Aluguel máximo em reais"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={values.aluguel_max}
                      className={styles["fieldInput"]}
                    />
                  </label>
                  <label className={styles["fieldLabel"]}>
                    Mínimo de quartos
                    <input
                      name="quartos_min"
                      aria-label="Mínimo de quartos"
                      type="number"
                      min="0"
                      max="99"
                      step="1"
                      defaultValue={values.quartos_min}
                      className={styles["fieldInput"]}
                    />
                  </label>
                  <p className={styles["subtitle"]}>
                    Valores não informados não entram no filtro de preço.
                  </p>
                  <div className={styles["actionRow"]}>
                    <a
                      className={styles["secondaryButton"]}
                      href={`/imoveis?${new URLSearchParams({ q: values.q, tipo: values.tipo })}`}
                    >
                      Limpar filtros
                    </a>
                    <button type="submit" className={styles["primaryButton"]}>
                      Aplicar filtros
                    </button>
                  </div>
                </form>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
