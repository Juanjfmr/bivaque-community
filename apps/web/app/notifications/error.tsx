"use client"

import { SegmentError } from "../components/bivaque/segment-fallbacks"

export default function SegmentErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SegmentError onRetry={reset} />
}
