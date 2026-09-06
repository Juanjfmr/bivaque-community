// apps/mobile/app/index.tsx
// Rota de entrada do expo-router.
//
// Sem um match para "/", o app abria direto no "Unmatched Route" — provado no
// emulador em 2026-09-03, com o bundle carregando os 1149 módulos sem erro e
// mesmo assim nenhuma tela de produto na frente da pessoa.
//
// Até 06/09/2026 este arquivo redirecionava para `(tabs)/cidade`. A versão
// autorizada em docs/design/visual-guide-2026-09-06 começa pela entrada: nada
// em `(tabs)` é público, e abrir o conteúdo antes da sessão promete acesso que
// o servidor não concede. O destino agora é a apresentação de boas-vindas.
import { Redirect } from "expo-router"

export default function Index() {
  return <Redirect href="/(auth)/boas-vindas" />
}
