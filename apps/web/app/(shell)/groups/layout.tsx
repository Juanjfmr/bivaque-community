import type { ReactNode } from "react"
import { CommunityTabs } from "../community/community-tabs"

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CommunityTabs />
      {children}
    </>
  )
}
