import type { ReactNode } from "react"
import { CommunityTabs } from "./community-tabs"

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 pt-4 lg:px-8">
      <CommunityTabs />
      <div className="pt-4">{children}</div>
    </div>
  )
}
