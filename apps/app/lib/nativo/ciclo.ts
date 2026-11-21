import { App } from "@capacitor/app"
import { precisaRenovar, renovarSessao } from "./sessao"

export async function iniciarCicloDaSessao(): Promise<void> {
  await App.addListener("appStateChange", ({ isActive }) => {
    if (isActive && precisaRenovar()) void renovarSessao().catch(() => undefined)
  })
  await renovarSessao().catch(() => undefined)
}
