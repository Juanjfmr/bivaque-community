import { redirect } from "next/navigation"

// A raiz leva ao Início: as quatro telas principais são rotas de verdade, e
// `/inicio` é a primeira.
export default function Page() {
  redirect("/inicio")
}
