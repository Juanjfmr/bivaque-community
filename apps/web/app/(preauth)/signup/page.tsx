import { Suspense } from "react"
import { BivaqueSignIn } from "../login/components/bivaque-sign-in"

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <BivaqueSignIn mode="signup" />
    </Suspense>
  )
}
