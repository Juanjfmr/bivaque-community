import { Suspense } from "react"
import { Skeleton } from "../../../components/bivaque/skeleton"
import { QuestionComposer } from "./question-composer"

export default function NovaPublicacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 px-4 py-8" aria-busy="true">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <QuestionComposer />
    </Suspense>
  )
}
