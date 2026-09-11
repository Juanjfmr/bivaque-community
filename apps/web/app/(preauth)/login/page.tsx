import { Suspense } from "react"
import { BivaqueSignIn } from "./components/bivaque-sign-in"

// useSearchParams na tela exige o boundary: sem ele o prerender falha no build.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <BivaqueSignIn />
    </Suspense>
  )
}
