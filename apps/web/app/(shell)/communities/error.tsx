"use client"

import { SegmentError } from "../../components/bivaque/segment-fallbacks"

export default function CommunitiesErrorBoundary({ reset }: { reset: () => void }) {
  return <SegmentError onRetry={reset} />
}
