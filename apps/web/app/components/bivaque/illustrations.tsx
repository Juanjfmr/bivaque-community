// Hand-drawn simple line illustrations for empty states.
// No external deps — each is a small inline SVG with a sketch-like feel.
// Strokes use --accent (blue-900); fills use --accent-soft when needed.

const ACCENT = "var(--semantic-action-primary)"
const ACCENT_SOFT = "var(--semantic-selected)"
const MUTED = "var(--muted)"

interface IllustrationProps {
  className?: string
}

/** Two overlapping figures — groups / community. */
export function GroupsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 96 72" fill="none" className={`h-18 w-24 ${className}`} aria-hidden="true">
      {/* left figure */}
      <circle cx="28" cy="22" r="9" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 54c0-8 6-15 14.5-15.5c1 0 2 0.5 3 0.5c5 0 9.5 3 12 7"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* right figure (slightly taller, overlapping) */}
      <circle cx="64" cy="18" r="8" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M46 54c0-8 6-16 15-16.5c1 0 2.5 0.5 3.5 0.5c5 0 9.5 3 11.5 7"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* connecting arc — community bond */}
      <path
        d="M44 52c4-4 8-6 14-6"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="3 3"
        opacity="0.5"
      />
      {/* ground line */}
      <path d="M10 58h72" stroke={MUTED} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

/** Calendar page with bent corner — events. */
export function EventsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 96 72" fill="none" className={`h-18 w-24 ${className}`} aria-hidden="true">
      {/* calendar body */}
      <rect
        x="16"
        y="12"
        width="60"
        height="48"
        rx="4"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* bent corner */}
      <path d="M76 12l-8 8h8z" stroke={ACCENT} strokeWidth="1.6" fill={ACCENT_SOFT} />
      {/* top binding rings */}
      <circle cx="34" cy="8" r="3" stroke={ACCENT} strokeWidth="1.2" />
      <circle cx="48" cy="8" r="3" stroke={ACCENT} strokeWidth="1.2" />
      <circle cx="62" cy="8" r="3" stroke={ACCENT} strokeWidth="1.2" />
      {/* calendar grid lines */}
      <line x1="24" y1="28" x2="68" y2="28" stroke={MUTED} strokeWidth="0.8" opacity="0.4" />
      <line x1="24" y1="36" x2="68" y2="36" stroke={MUTED} strokeWidth="0.8" opacity="0.4" />
      <line x1="24" y1="44" x2="68" y2="44" stroke={MUTED} strokeWidth="0.8" opacity="0.4" />
      {/* star on the calendar — event highlight */}
      <path
        d="M62 36l1.2 2.5l2.8 0.4l-2 2l0.5 2.7l-2.5-1.3l-2.5 1.3l0.5-2.7l-2-2l2.8-0.4z"
        stroke={ACCENT}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}

/** Speech bubble — messages / chat. */
export function MessagesIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 96 72" fill="none" className={`h-18 w-24 ${className}`} aria-hidden="true">
      {/* bubble body */}
      <path
        d="M16 14h56c4 0 8 3 8 8v24c0 4-4 8-8 8H44l-12 8v-8H24c-4 0-8-3-8-8V22c0-4 3-8 8-8z"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* text lines inside bubble */}
      <line
        x1="26"
        y1="28"
        x2="64"
        y2="28"
        stroke={MUTED}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="26"
        y1="36"
        x2="56"
        y2="36"
        stroke={MUTED}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="26"
        y1="44"
        x2="48"
        y2="44"
        stroke={MUTED}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

/** Bell — notifications. */
export function NotificationsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 96 72" fill="none" className={`h-18 w-24 ${className}`} aria-hidden="true">
      {/* bell body */}
      <path
        d="M36 12c-10 0-16 10-16 18v10c0 2-2 6-4 8h56c-2-2-4-6-4-8V30c0-8-6-18-16-18z"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* bell bottom rim */}
      <path d="M24 48c6 2 28 2 34 0" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
      {/* clapper */}
      <circle cx="48" cy="54" r="3" stroke={ACCENT} strokeWidth="1.2" />
      <line
        x1="48"
        y1="48"
        x2="48"
        y2="51"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* top hanger */}
      <path d="M42 8c0-2 4-3 6-3s6 1 6 3" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
      {/* subtle ring marks */}
      <path
        d="M34 6c-2 2-2 5 0 8M58 6c2 2 2 5 0 8"
        stroke={ACCENT}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}
