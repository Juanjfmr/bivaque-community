import Image from "next/image"
import type { ReactNode } from "react"
import styles from "./listing-cards.module.css"

// FIGMA-002 — card de anúncio na anatomia da prancha property-list: capa com
// chip de tipo, bairro em caixa alta, título, aluguel /mês, specs e rodapé de
// condomínio + ação. Apresentacional puro: quem decide dados e autorização é
// o loader/server component.
//
// // O botão flutuante de salvar entra por `saveSlot`, como IRMÃO do link e nunca
// dentro dele: a prancha property-list desenha o ícone sobre a capa, e um botão
// dentro de âncora seria HTML inválido, roubaria o clique do card e criaria um
// segundo alvo de foco para a mesma ação.

interface ListingCardProps {
  href: string
  coverUrl: string | null
  typeLabel: string
  neighborhood: string
  title: string
  priceLabel: string | null
  priceSuffix?: string
  specsLabel: string
  footerLabel: string
  footerActionLabel?: string
  saveSlot?: ReactNode
}

export function ListingCard({
  href,
  coverUrl,
  typeLabel,
  neighborhood,
  title,
  priceLabel,
  priceSuffix,
  specsLabel,
  footerLabel,
  footerActionLabel = "Ver anúncio",
  saveSlot,
}: ListingCardProps) {
  return (
    <div className={styles["cardWrap"]}>
      <a href={href} className={styles["card"]}>
        <span className={styles["cardCover"]}>
          {coverUrl ? (
            <Image
              unoptimized
              width={1200}
              height={750}
              src={coverUrl}
              alt={`Foto de capa: ${title}`}
            />
          ) : (
            <span className={styles["cardCoverPlaceholder"]}>Sem fotos ainda</span>
          )}
          <span className={styles["cardTypeChip"]}>{typeLabel}</span>
        </span>
        <span className={styles["cardBody"]}>
          <span className={styles["cardNeighborhood"]}>{neighborhood}</span>
          <span className={styles["cardTitle"]}>{title}</span>
          {priceLabel ? (
            <span className={styles["cardPrice"]}>
              {priceLabel}
              {priceSuffix ? (
                <span className={styles["cardPriceSuffix"]}>{priceSuffix}</span>
              ) : null}
            </span>
          ) : (
            <span className={styles["cardSpecs"]}>Consultar anunciante</span>
          )}
          {specsLabel ? <span className={styles["cardSpecs"]}>{specsLabel}</span> : null}
          <span className={styles["cardFooter"]}>
            <span>{footerLabel}</span>
            <span className={styles["cardFooterAction"]}>{footerActionLabel}</span>
          </span>
        </span>
      </a>
      {saveSlot}
    </div>
  )
}
