// Empty-state artwork.
//
// These replace the previous set, which were thin blue outline glyphs on the
// Navy palette — the same "friendly line icon" language every SaaS empty state
// uses, and at 96x72 they read as oversized icons rather than artwork.
//
// The language here is engraving: forest line work over a paper ground, with
// hatching and a few solid gold marks for weight. It suits a product whose
// identity is a warm printed page, and it gives an empty screen something
// deliberately made to look at instead of a shrug.
//
// Everything is inline SVG on tokens: no raster asset to ship, no external
// request, correct colours in every theme, and crisp at any density. Each is
// aria-hidden — the EmptyState title and description carry the meaning, so the
// artwork is decorative and never the sole carrier of state (DS-033).

const INK = "var(--foreground)"
const FOREST = "var(--accent)"
const MUTED = "var(--muted)"
const GOLD = "var(--gold)"
const PAPER = "var(--surface)"

interface IllustrationProps {
  className?: string
}

const BOX = "h-28 w-36"

/** Shared hatching pattern — gives the drawings the weight of a printed plate. */
function Hatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern
        id={id}
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="4" stroke={FOREST} strokeWidth="0.9" opacity="0.35" />
      </pattern>
    </defs>
  )
}

/** A shelter under trees — the product's own name, drawn as a camp, not a barracks. */
export function GroupsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-groups" />
      {/* ground */}
      <path d="M8 92h128" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      {/* back trees */}
      <path
        d="M34 92V60m0 0l-11 12m11-12l11 12M34 60V44"
        stroke={FOREST}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M116 92V56m0 0l-12 13m12-13l12 13"
        stroke={FOREST}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* shelter body */}
      <path
        d="M72 30L44 92h56L72 30z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M72 30L44 92h56L72 30z" fill="url(#hatch-groups)" opacity="0.7" />
      {/* opening */}
      <path
        d="M72 56L60 92h24L72 56z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* ridge pole */}
      <path d="M72 24v10" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="72" cy="22" r="2.6" fill={GOLD} />
      {/* two figures at the door */}
      <circle cx="103" cy="74" r="4.4" stroke={INK} strokeWidth="1.4" />
      <path d="M96 92c0-5 3-9 7-9s7 4 7 9" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="37" cy="77" r="3.8" stroke={INK} strokeWidth="1.4" />
      <path
        d="M31 92c0-4.5 2.6-8 6-8s6 3.5 6 8"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** An almanac page with the day torn open — events. */
export function EventsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-events" />
      {/* back sheet, offset — a stack of days */}
      <rect
        x="34"
        y="24"
        width="80"
        height="72"
        rx="3"
        fill={PAPER}
        stroke={MUTED}
        strokeWidth="1.2"
        opacity="0.55"
      />
      {/* front sheet */}
      <rect
        x="26"
        y="18"
        width="80"
        height="72"
        rx="3"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.8"
      />
      {/* masthead band */}
      <path d="M26 34h80" stroke={FOREST} strokeWidth="1.6" />
      <rect x="26" y="18" width="80" height="16" rx="3" fill="url(#hatch-events)" opacity="0.8" />
      {/* binding rings */}
      <path d="M46 12v12M86 12v12" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* the marked day */}
      <rect x="38" y="44" width="24" height="22" rx="2" fill={GOLD} opacity="0.28" />
      <rect x="38" y="44" width="24" height="22" rx="2" stroke={FOREST} strokeWidth="1.5" />
      {/* ruled lines of the other days */}
      <path
        d="M70 50h26M70 60h20M38 76h58M38 84h40"
        stroke={MUTED}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

/** Two folded notes passed between hands — messages. */
export function MessagesIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-messages" />
      {/* far note */}
      <path
        d="M78 26h44v34H92l-10 10V60h0V26z"
        fill={PAPER}
        stroke={MUTED}
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <path
        d="M88 38h24M88 48h16"
        stroke={MUTED}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* near note */}
      <path
        d="M22 44h50v36H44L32 92V80h-10V44z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M22 44h50v12H22z" fill="url(#hatch-messages)" opacity="0.75" />
      <path d="M32 66h30M32 74h20" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {/* the spark of a new one */}
      <circle cx="118" cy="72" r="4" fill={GOLD} />
      <path
        d="M112 82l3-4M124 82l-3-4M118 64v-5"
        stroke={GOLD}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** A hand bell over a ruled page — notifications. */
export function NotificationsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-notifications" />
      {/* page behind */}
      <rect
        x="30"
        y="30"
        width="84"
        height="62"
        rx="3"
        fill={PAPER}
        stroke={MUTED}
        strokeWidth="1.2"
        opacity="0.5"
      />
      <path
        d="M42 74h60M42 84h38"
        stroke={MUTED}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* bell */}
      <path
        d="M72 22c-11 0-18 8-18 19 0 12-4 16-7 20h50c-3-4-7-8-7-20 0-11-7-19-18-19z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M72 22c-11 0-18 8-18 19 0 12-4 16-7 20h50c-3-4-7-8-7-20 0-11-7-19-18-19z"
        fill="url(#hatch-notifications)"
        opacity="0.6"
      />
      {/* crown + clapper */}
      <path d="M72 16v6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="14" r="2.6" fill={GOLD} />
      <path d="M65 61c0 4 3 7 7 7s7-3 7-7" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      {/* ring lines */}
      <path
        d="M34 34c-3 4-4 9-4 14M110 34c3 4 4 9 4 14"
        stroke={FOREST}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}

/** A shopfront awning on a street — the city showcase and providers. */
export function ShowcaseIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-showcase" />
      <path d="M8 92h128" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      {/* building */}
      <rect x="30" y="30" width="84" height="62" fill={PAPER} stroke={FOREST} strokeWidth="1.8" />
      {/* awning */}
      <path
        d="M24 46h96l-8-14H32l-8 14z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M40 32v14M56 32v14M72 32v14M88 32v14M104 32v14"
        stroke={FOREST}
        strokeWidth="1.2"
        opacity="0.6"
      />
      {/* window + door */}
      <rect
        x="40"
        y="56"
        width="30"
        height="22"
        fill="url(#hatch-showcase)"
        stroke={MUTED}
        strokeWidth="1.3"
      />
      <path
        d="M84 92V62h18v30"
        fill={PAPER}
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="98" cy="78" r="1.8" fill={GOLD} />
      {/* hanging sign */}
      <path d="M118 52v10" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <rect
        x="108"
        y="62"
        width="20"
        height="12"
        rx="2"
        fill={GOLD}
        opacity="0.3"
        stroke={FOREST}
        strokeWidth="1.4"
      />
    </svg>
  )
}

/** A river bend with a boat — the locality, drawn as the place it actually is. */
export function LocalityIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-locality" />
      {/* far bank */}
      <path
        d="M8 44c22-6 40 2 60-2s38-10 68-4"
        stroke={FOREST}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* water */}
      <path
        d="M8 58c20 6 34-4 52 0s34 10 76 2"
        stroke={FOREST}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 72c22 6 36-4 54 0s36 10 62 2"
        stroke={FOREST}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M22 86c20 5 34-4 50 0s32 8 56 1"
        stroke={FOREST}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* boat */}
      <path
        d="M52 62h30l-5 9H57l-5-9z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M67 62V42l14 12-14 8"
        fill="url(#hatch-locality)"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* sun */}
      <circle cx="112" cy="28" r="8" fill={GOLD} opacity="0.35" />
      <circle cx="112" cy="28" r="8" stroke={FOREST} strokeWidth="1.4" />
    </svg>
  )
}

/** A lamp over an open book — recommendations and the arrival guide. */
export function GuideIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-guide" />
      {/* open book */}
      <path
        d="M20 84V50c14-6 30-6 52 0v34c-22-6-38-6-52 0z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M124 84V50c-14-6-30-6-52 0v34c22-6 38-6 52 0z"
        fill={PAPER}
        stroke={FOREST}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M72 50v34" stroke={INK} strokeWidth="1.6" />
      <path
        d="M32 60h28M32 68h24M84 60h28M84 68h20"
        stroke={MUTED}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* lamp */}
      <path d="M72 12v10" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M58 34l14-12 14 12H58z"
        fill="url(#hatch-guide)"
        stroke={FOREST}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="72" cy="40" r="3.2" fill={GOLD} />
      <path d="M62 44l-4 4M82 44l4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** A magnifying glass over a page that came back blank — no search results. */
export function SearchIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 144 112" fill="none" className={`${BOX} ${className}`} aria-hidden="true">
      <Hatch id="hatch-search" />
      {/* page */}
      <rect
        x="34"
        y="18"
        width="72"
        height="76"
        rx="3"
        fill={PAPER}
        stroke={MUTED}
        strokeWidth="1.3"
        opacity="0.7"
      />
      <path
        d="M46 34h44M46 44h30"
        stroke={MUTED}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* glass */}
      <circle cx="66" cy="62" r="22" fill={PAPER} stroke={FOREST} strokeWidth="2" />
      <circle cx="66" cy="62" r="22" fill="url(#hatch-search)" opacity="0.45" />
      <circle cx="66" cy="62" r="15" stroke={FOREST} strokeWidth="1.2" opacity="0.5" />
      <path d="M83 79l16 16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="66" cy="62" r="3" fill={GOLD} />
    </svg>
  )
}
