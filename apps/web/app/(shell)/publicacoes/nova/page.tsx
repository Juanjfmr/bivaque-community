"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { normalizeAttachment } from "../../../../lib/composer/post-attachment"
import { useLocalityContext } from "../../../../lib/locality-context"
import { CreatePostPage } from "../../../components/bivaque/feed-post"

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
  // `?tipo=` é só a dica de qual anexo já vem oferecido; o formato gravado sai
  // do anexo real no compositor.
  const initialAttachment = normalizeAttachment(requestedType ?? undefined) ?? undefined

  const close = useCallback(() => {
    router.push(returnPath)
  }, [returnPath, router])

  return (
    <CreatePostPage
      localityId={current.id}
      initialAttachment={initialAttachment}
      defaultCommunityId={defaultCommunityId}
      onCreated={close}
      onClose={close}
    />
  )
}
