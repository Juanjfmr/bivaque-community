"use client"

import { Modal, useOverlayState } from "@heroui/react"
import { ChevronDown, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocalityContext } from "../../../lib/locality-context"
import { ModalCloseTrigger } from "../bivaque/close-button"
import { CityPicker } from "./city-picker"

// O chip de cidade do cabeçalho (decisão do dono, 25/09/2026): deixa de ser
// texto fixo e vira a porta para CONSULTAR outra cidade (/cidade/[id]). Mudar
// a SUA cidade é outra coisa, com consequência — mora no perfil, e o diálogo
// só aponta para lá.
//
// Em toda largura: no telefone é só o pino (o nome está no rodapé do menu e
// no Início); do tablet para cima, pino + nome da cidade.

export function CitySwitcher() {
  const { current } = useLocalityContext()
  const router = useRouter()
  const dialog = useOverlayState()
  const cityLabel = current.stateCode
    ? `${current.cityName}, ${current.stateCode}`
    : current.cityName

  return (
    <>
      <button
        type="button"
        data-testid="shell-locality-pill"
        onClick={dialog.open}
        aria-haspopup="dialog"
        aria-label={`Sua cidade: ${cityLabel}. Ver outra cidade`}
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium text-ui-ink-2 transition-colors hover:bg-ui-subtle hover:text-ui-ink md:px-3"
      >
        <MapPin size={18} className="shrink-0 text-ui-brand" aria-hidden="true" />
        <span aria-hidden="true" className="hidden max-w-40 truncate md:inline">
          {cityLabel}
        </span>
        <ChevronDown size={14} className="hidden shrink-0 md:block" aria-hidden="true" />
      </button>

      <Modal state={dialog}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Ver outra cidade</Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-ui-ink-2">
                  Consulte o Guia, os encontros e os anúncios de outra cidade — para conhecer o
                  destino antes de uma mudança, por exemplo. Você continua publicando em{" "}
                  <span className="font-medium text-ui-ink">{cityLabel}</span>.
                </p>
                <div className="mt-4">
                  <CityPicker
                    label="Qual cidade?"
                    excludeIds={[current.id]}
                    autoFocus
                    onPick={(city) => {
                      dialog.close()
                      router.push(`/cidade/${city.id}` as Route)
                    }}
                  />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <p className="text-sm text-ui-ink-2">
                  Mudou de cidade?{" "}
                  <Link
                    href={"/profile#cidade" as Route}
                    onClick={dialog.close}
                    className="inline-flex min-h-11 items-center font-semibold text-ui-brand underline-offset-2 hover:underline"
                  >
                    Mude a sua cidade no perfil
                  </Link>
                </p>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
