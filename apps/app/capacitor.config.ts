import type { CapacitorConfig } from "@capacitor/cli"

/*
 * Casca de experimento (EXP-CASCA-CAPACITOR): o webview abre o app servido
 * pelo Next do computador, não os arquivos embutidos. Serve para sentir
 * rolagem, teclado e transições num Android real antes da fase 7.
 *
 * O endereço padrão é o loopback do aparelho: com o cabo USB e
 * `adb reverse tcp:3000 tcp:3000`, `localhost:3000` no celular é o Next do
 * computador. Por isso a sessão por cookie e a lista de origens do servidor
 * valem sem mudança. `BIVAQUE_CASCA_URL` troca o endereço na hora do
 * `cap sync`.
 *
 * Isto não é o pacote de loja: o identificador é de experimento e o tráfego
 * sem TLS só existe porque o destino é o loopback. O pacote de loja
 * (LAN-LOJA) embute o build e fala com a API por token.
 */
const endereco = process.env["BIVAQUE_CASCA_URL"] ?? "http://localhost:3000/app/"

const config: CapacitorConfig = {
  appId: "com.bivaque.community.experimento",
  appName: "Bivaque (experimento)",
  webDir: "dist",
  server: {
    url: endereco,
    cleartext: endereco.startsWith("http://"),
  },
}

export default config
