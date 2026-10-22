// PORT-001 (R73): adaptador do `md-icon`. Não é um componente cliente: o ícone
// é texto de fonte (Material Symbols Outlined), igual no servidor e no
// cliente. Existe para concentrar o nome da tag e trazer a declaração de tipos
// de apps/web/types/material-web.d.ts para o programa.
//
// O arquivo não se chama `icon.tsx` porque, dentro de `app/`, esse nome é a
// convenção de ícone de metadata do Next e o build o trata como rota.
import type { MaterialIconProperties } from "../../../types/material-web"

type MaterialIconTagProperties = MaterialIconProperties & Readonly<{ name: string }>

// Sem espaço em volta de {name}: o glifo vem da ligadura, e espaço no texto
// quebra a ligadura.
export function MaterialIcon({ name }: MaterialIconTagProperties) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: md-icon é um glifo decorativo, nunca focável; o nome acessível vem do texto ao lado
    <md-icon aria-hidden="true">{name}</md-icon>
  )
}
