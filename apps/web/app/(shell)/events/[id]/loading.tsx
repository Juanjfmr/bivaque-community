import { Skeleton } from "../../../components/bivaque/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6" aria-busy="true">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-11 w-full rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  )
}
