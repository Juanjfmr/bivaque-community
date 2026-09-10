import { FeedCardSkeleton, GroupCardSkeleton, Skeleton } from "../../../components/bivaque/skeleton"

// RECON-009 — skeleton espelhando o hero (banner + thumbnail + título) e o
// corpo mais comum da tela; sem reflow quando o conteúdo chega.
export default function CommunityDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8" aria-busy="true">
      <div className="flex flex-col">
        <Skeleton className="h-40 w-full rounded-2xl sm:h-48" />
        <div className="-mt-12 flex items-end gap-4 px-2">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2 pb-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-3">
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </div>
        <div className="flex flex-col gap-3">
          <GroupCardSkeleton />
          <GroupCardSkeleton />
        </div>
      </div>
    </div>
  )
}
