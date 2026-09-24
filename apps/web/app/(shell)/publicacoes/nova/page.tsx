"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { useLocalityContext } from "../../../../lib/locality-context"
import { CreatePostModal } from "../../../components/bivaque/feed-post"
import { POST_TYPE_ORDER } from "../../../components/bivaque/feed-post-shared"

export default function NewPublicationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { current } = useLocalityContext()
  const requestedType = searchParams.get("tipo")
  const requestedCommunity = searchParams.get("comunidade")
  const returnPath = searchParams.get("origem") === "/community" ? "/community" : "/inicio"
  const defaultCommunityId =
    requestedCommunity && /^[0-9a-f-]{36}$/i.test(requestedCommunity)
      ? requestedCommunity
      : undefined
  const defaultPostType = POST_TYPE_ORDER.includes(
    requestedType as (typeof POST_TYPE_ORDER)[number],
  )
    ? (requestedType ?? undefined)
    : undefined

  const close = useCallback(() => {
    router.push(returnPath)
  }, [returnPath, router])

  return (
    <CreatePostModal
      pageMode
      localityId={current.id}
      defaultPostType={defaultPostType}
      defaultCommunityId={defaultCommunityId}
      onCreated={close}
      onClose={close}
    />
  )
}
