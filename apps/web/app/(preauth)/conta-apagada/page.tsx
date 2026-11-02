import type { Metadata } from "next"
import { EntryShell } from "../../components/entry/entry-shell"
import { MaterialIcon } from "../../components/material/material-icon"
import { MaterialOutlinedButton } from "../../components/material/outlined-button"
import "./conta-apagada.css"

// PORT-006 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo item 6:
// depois de pedir a exclusão, a pessoa cai aqui — e não no login. A página é
// pública (apps/web/proxy.ts) porque a sessão já foi revogada pelo próprio
// pedido; exigir sessão para ler "sua conta foi apagada" seria um laço.
//
// Texto do protótipo (`renderAccountDeleted` em support/help.js), palavra por
// palavra. A página não confirma nem nega qual conta foi apagada: não recebe
// parâmetro nenhum, então não serve para descobrir se um e-mail existe.
export const metadata: Metadata = {
  title: "Conta apagada · Bivaque",
}

export default function ContaApagadaPage() {
  return (
    <EntryShell>
      <main>
        <div className="en en-form en-gone">
          <div className="en-gone-in">
            <MaterialIcon name="check_circle" />
            <h1 className="en-h1">Sua conta foi apagada.</h1>
            <p className="en-lead">Obrigado por ter feito parte. Você pode voltar quando quiser.</p>
            <MaterialOutlinedButton href="/">Voltar ao início</MaterialOutlinedButton>
          </div>
        </div>
      </main>
    </EntryShell>
  )
}
