import Image from "next/image"

export type BrandMarkAsset = "primary" | "horizontal" | "stacked" | "wordmark" | "symbol"
export type BrandMarkTone = "color" | "graphite" | "white" | "black"

type BrandMarkProps = {
  alt?: string
  asset?: BrandMarkAsset
  className?: string
  priority?: boolean
  tone?: BrandMarkTone
}

const dimensions: Record<BrandMarkAsset, { height: number; width: number }> = {
  primary: { height: 112, width: 466 },
  horizontal: { height: 72, width: 301 },
  stacked: { height: 240, width: 317 },
  wordmark: { height: 100, width: 548 },
  symbol: { height: 100, width: 100 },
}

function sourceFor(asset: BrandMarkAsset, tone: BrandMarkTone) {
  const suffix = tone === "color" ? "" : `-${tone}`
  const composition = asset === "wordmark" || asset === "symbol" ? asset : `logo-${asset}`
  return `/brand/bivaque-${composition}${suffix}.svg`
}

/**
 * Canonical renderer for approved Bivaque marks.
 *
 * This component is intentionally not mounted while FRONTEND-VISUAL-AAA is
 * frozen. When activated, callers choose the composition; they never rebuild
 * the logo with text or icon libraries.
 */
export function BrandMark({
  alt = "Bivaque",
  asset = "primary",
  className,
  priority = false,
  tone = "color",
}: BrandMarkProps) {
  const size = dimensions[asset]

  return (
    <Image
      alt={alt}
      className={className}
      data-bivaque-brand="official"
      data-brand-asset={asset}
      data-brand-tone={tone}
      height={size.height}
      priority={priority}
      src={sourceFor(asset, tone)}
      unoptimized
      width={size.width}
    />
  )
}
