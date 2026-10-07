"use client"

import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import styles from "./listing-cards.module.css"
import { ListingPublishModal } from "./listing-publish-modal"

export function ListingListHeader() {
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  return (
    <header className={styles["headRow"]}>
      <div>
        <p className={styles["eyebrow"]}>{current.cityName}</p>
        <h1 className={styles["heading"]}>Um lugar para chamar de casa</h1>
        <p className={styles["subtitle"]}>Imóveis e condições para planejar o próximo passo.</p>
      </div>
      <ListingPublishModal
        cityName={current.cityName}
        audienceOptions={[
          { value: current.id, label: `Membros da rede em ${current.cityName}` },
          ...communities.map((community) => ({
            value: `community:${community.id}`,
            label: community.name,
          })),
        ]}
      />
    </header>
  )
}
