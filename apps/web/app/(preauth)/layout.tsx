import type { ReactNode } from "react"
import { SupabaseAuthProvider } from "../components/bivaque/supabase-auth-provider"

// PORT-001 (R73): o provedor do cliente Supabase saiu do layout raiz para a
// landing pública ser servida no HTML do servidor. Login, cadastro, onboarding,
// consentimento e as páginas legais usam o cliente do navegador, então o grupo
// `(preauth)` monta o provedor no próprio layout.
export default function PreauthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}
