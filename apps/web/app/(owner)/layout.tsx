import type { ReactNode } from "react"
import { SupabaseAuthProvider } from "../components/bivaque/supabase-auth-provider"

// PORT-001 (R73): o provedor do cliente Supabase saiu do layout raiz para a
// landing pública ser servida no HTML do servidor. A administração de
// comunidade monta o provedor aqui; o layout de `communities/[id]/admin`
// continua cuidando do portão de permissão.
export default function OwnerLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}
