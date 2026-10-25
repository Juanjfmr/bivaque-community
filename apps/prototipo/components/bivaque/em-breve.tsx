import { Pilula } from "./pilula"

// As telas que esta jornada não abre: Conversas, Você e a aba Grupos. Mínimas,
// como combinado — o título e o selo.
export function EmBreve({ titulo, selo }: { titulo: string; selo: string }) {
  return (
    <div className="grid justify-items-center gap-3 pt-10 text-center">
      <h1 className="text-[24px]">{titulo}</h1>
      <Pilula className="px-4 py-1.5 text-sm">{selo}</Pilula>
    </div>
  )
}
