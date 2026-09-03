// apps/mobile/app/index.tsx
// Rota de entrada do expo-router.
//
// Sem um match para "/", o app abria direto no "Unmatched Route" — provado no
// emulador em 2026-09-03, com o bundle carregando os 1149 módulos sem erro e
// mesmo assim nenhuma tela de produto na frente da pessoa.
//
// O destino NÃO é decisão nova: (tabs)/_layout.tsx já declara Cidade como a
// primeira aba, espelhando a ordem do bottom-nav do apps/web
// (ADR-20260816-shells-e-navegacao, VISUAL_GUIDE §0). Este arquivo implementa
// aquela ordem; trocar a aba de entrada é que seria decisão de produto.
import { Redirect } from "expo-router"

export default function Index() {
  return <Redirect href="/(tabs)/cidade" />
}
