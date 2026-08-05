import { Avatar } from "@heroui/react"

interface MemberAvatarProps {
  name: string | null | undefined
  size?: "sm" | "md" | "lg"
  className?: string
}

// Member avatar for verified community members (DESIGN_SPEC §3). Privacy
// boundary: never persist or transmit real photos — fallback always renders
// the initial so a missing photo degrades to "F." rather than a broken image.
export function MemberAvatar({ name, size = "md", className }: MemberAvatarProps) {
  const initial = (name ?? "?").charAt(0).toUpperCase()
  return (
    <Avatar
      className={`bg-[var(--surface-subtle)] text-[var(--foreground)] ${className ?? ""}`}
      size={size}
    >
      {initial}
    </Avatar>
  )
}

export default MemberAvatar
