// Onda E Task 11 — server shell for /profile/interests.
// The form lives in the client InterestsSection (it captures success/error
// state). The shell just renders the section.

import { InterestsSection } from "../interests-section"

export default function InterestsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <InterestsSection />
    </div>
  )
}
