import { Avatar } from "@heroui/react"
import { useState } from "react"

interface MemberAvatarProps {
  name: string | null | undefined
  size?: "sm" | "md" | "lg"
  src?: string | null
  className?: string
}

// Member avatar for verified community members (DESIGN_SPEC §3). Privacy
// boundary: never persist or transmit real photos — fallback always renders
// the initial so a missing photo degrades to "F." rather than a broken image.
//
// The src comes from /api/avatar/[userId] which returns 404 when the
// member has no uploaded photo. The HeroUI <Avatar.Image> only shows the
// <Avatar.Fallback> when src is null/undefined — a 404 image leaves the
// placeholder visible but broken (alt text only). We clear src on error so
// the fallback renders the initial instead. (RUN-022 from RUNTIME_FINDINGS.md.)
export function MemberAvatar({ name, size = "md", src, className }: MemberAvatarProps) {
  const initial = (name ?? "?").charAt(0).toUpperCase()
  const classes = `bg-[var(--surface-subtle)] text-[var(--foreground)] ${className ?? ""}`
  const [imgFailed, setImgFailed] = useState(false)
  const effectiveSrc = src && !imgFailed ? src : null
  return (
    <Avatar className={classes} size={size}>
      {effectiveSrc ? (
        <Avatar.Image
          src={effectiveSrc}
          alt={`Foto de ${name ?? "membro"}`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      )}
    </Avatar>
  )
}

export default MemberAvatar
