import type { ReactNode } from "react"
import { SupabaseAuthProvider } from "../components/bivaque/supabase-auth-provider"

// PORT-001 (R73): o provedor do cliente Supabase saiu do layout raiz para a
// landing pública ser servida no HTML do servidor. `auth/` tem as páginas de
// retorno do login (confirmação de e-mail e erro do callback), que também usam
// o cliente do navegador.
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}
