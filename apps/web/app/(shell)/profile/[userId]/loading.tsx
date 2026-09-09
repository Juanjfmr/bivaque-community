import { Skeleton } from "../../../components/bivaque/skeleton"

export default function OtherMemberProfileLoading() {
  return (
    <div
      role="status"
      aria-label="Carregando perfil"
      className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  )
}
