interface ManausGuideHeroProps {
  className?: string
}

const ACCENT = "var(--accent)"
const ACCENT_SOFT = "var(--accent-soft)"
const SECONDARY = "var(--secondary-accent)"
const MUTED = "var(--muted)"
const SURFACE = "var(--surface)"

/**
 * Bivaque-owned, token-driven illustration for the Manaus arrival guide.
 * It deliberately suggests the city rather than reproducing a landmark photo:
 * Rio Negro, forest canopy, the Teatro Amazonas dome and the equatorial sun/rain cycle.
 */
export function ManausGuideHero({ className = "" }: ManausGuideHeroProps) {
  return (
    <svg
      viewBox="0 0 720 300"
      fill="none"
      className={className}
      role="img"
      aria-label="Ilustração de Manaus com rio, floresta e silhueta do Teatro Amazonas"
    >
      <title>Manaus — rio, floresta e Teatro Amazonas</title>
      <rect width="720" height="300" rx="24" fill={SURFACE} />

      {/* sky / humidity bands */}
      <path d="M0 0h720v168H0z" fill={ACCENT_SOFT} opacity="0.55" />
      <circle cx="596" cy="68" r="32" fill={SECONDARY} opacity="0.18" />
      <circle cx="596" cy="68" r="20" stroke={SECONDARY} strokeWidth="2" opacity="0.55" />
      <path
        d="M80 62c18-24 48-27 69-7c15-16 45-15 59 4c24-4 44 11 47 31H60c1-14 8-23 20-28Z"
        fill={SURFACE}
        stroke={MUTED}
        strokeWidth="1.5"
        opacity="0.72"
      />
      <path
        d="M105 98l-8 16M135 98l-8 16M165 98l-8 16"
        stroke={SECONDARY}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* city line */}
      <path
        d="M0 174c84-12 132-9 197 0c74 10 132 7 196-3c88-14 182-15 327 4v125H0V174Z"
        fill={ACCENT_SOFT}
        opacity="0.42"
      />

      {/* Teatro Amazonas silhouette */}
      <g transform="translate(285 76)">
        <path
          d="M72 42c0-25 20-42 43-42s43 17 43 42H72Z"
          fill={SECONDARY}
          opacity="0.26"
          stroke={ACCENT}
          strokeWidth="2"
        />
        <path d="M78 42h74v24H78z" fill={SURFACE} stroke={ACCENT} strokeWidth="2" />
        <path
          d="M63 66h104l14 17H49l14-17Z"
          fill={SURFACE}
          stroke={ACCENT}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M55 83h120v58H55z" fill={SURFACE} stroke={ACCENT} strokeWidth="2" />
        <path d="M43 141h144v12H43z" fill={SURFACE} stroke={ACCENT} strokeWidth="2" />
        {[70, 92, 114, 136, 158].map((x) => (
          <path key={x} d={`M${x} 95v34`} stroke={ACCENT} strokeWidth="2" opacity="0.7" />
        ))}
        <path d="M93 141v-27c0-13 10-22 22-22s22 9 22 22v27" stroke={ACCENT} strokeWidth="2" />
      </g>

      {/* forest canopy */}
      <g opacity="0.78">
        <circle cx="48" cy="189" r="31" fill={ACCENT} opacity="0.12" />
        <circle cx="90" cy="174" r="43" fill={ACCENT} opacity="0.16" />
        <circle cx="141" cy="190" r="37" fill={ACCENT} opacity="0.13" />
        <circle cx="626" cy="184" r="42" fill={ACCENT} opacity="0.14" />
        <circle cx="676" cy="190" r="34" fill={ACCENT} opacity="0.17" />
        <path
          d="M0 205c60-18 122-17 191 7v31H0v-38ZM542 209c68-28 121-26 178-9v43H542v-34Z"
          fill={ACCENT}
          opacity="0.14"
        />
      </g>

      {/* Rio Negro */}
      <path
        d="M0 226c124-19 224 24 350 4c134-21 243-16 370 4v66H0v-74Z"
        fill={ACCENT}
        opacity="0.16"
      />
      <path
        d="M0 251c119-14 229 17 349 1c138-18 244-11 371 7"
        stroke={SECONDARY}
        strokeWidth="2"
        opacity="0.42"
      />
      <path
        d="M25 274c114-11 207 13 314 2c130-14 244-10 350 4"
        stroke={ACCENT}
        strokeWidth="1.5"
        opacity="0.35"
      />
    </svg>
  )
}
