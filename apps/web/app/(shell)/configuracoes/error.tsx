"use client"

import { SegmentError } from "../../components/bivaque/segment-fallbacks"

export default function ConfiguracoesErrorBoundary({ reset }: { reset: () => void }) {
  return <SegmentError onRetry={reset} />
}
