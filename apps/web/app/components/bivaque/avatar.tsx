import { Avatar } from "@heroui/react"

interface MemberAvatarProps {
  name: string | null | undefined
  size?: "sm" | "md" | "lg"
  src?: string | null
  className?: string
}

// Member avatar for verified community members (DESIGN_SPEC §3). Privacy
// boundary: never persist or transmit real photos — fallback always renders
// the initial so a missing photo degrades to "F." rather than a broken image.
export function MemberAvatar({ name, size = "md", src, className }: MemberAvatarProps) {
  const initial = (name ?? "?").charAt(0).toUpperCase()
  const classes = `bg-[var(--surface-subtle)] text-[var(--foreground)] ${className ?? ""}`
  return (
    <Avatar className={classes} size={size}>
      {src ? (
        <Avatar.Image src={src} alt={`Foto de ${name ?? "membro"}`} />
      ) : (
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      )}
    </Avatar>
  )
}

export default MemberAvatar
