import type { CapacitorConfig } from "@capacitor/cli"

/*
 * Casca de experimento (EXP-CASCA-CAPACITOR): serve para sentir rolagem,
 * teclado e transições num Android real antes da fase 7. Dois modos:
 *
 * - **demonstração (padrão):** o APK leva o app embutido (`dist-casca`, build
 *   `--mode casca`) e responde à API com uma gravação da stack local com seed.
 *   Instala e abre, sem servidor, cabo ou login.
 * - **servidor:** com `BIVAQUE_CASCA_URL`, o webview abre o app servido por um
 *   Next (por exemplo `http://localhost:3000/app/` com `adb reverse`), com a
 *   sessão por cookie de verdade.
 *
 * Isto não é o pacote de loja: o identificador é de experimento. O pacote de
 * loja (LAN-LOJA) embute o build de produção e fala com a API por token.
 */
const endereco = process.env["BIVAQUE_CASCA_URL"]

const config: CapacitorConfig = {
  appId: "com.bivaque.community.experimento",
  appName: "Bivaque (experimento)",
  webDir: "dist-casca",
  server:
    endereco === undefined
      ? { appStartPath: "/app/" }
      : { url: endereco, cleartext: endereco.startsWith("http://") },
}

export default config
