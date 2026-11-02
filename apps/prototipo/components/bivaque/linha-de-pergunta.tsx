import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Indicacao } from "@/lib/dados/indicacoes"
import { PERGUNTA } from "@/lib/demo/textos"
import { assuntoDe } from "@/lib/rotulos"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"
import { Pilula } from "./pilula"

// A linha de pergunta do protótipo (`shell/primitives.js`, questionRow): quem
// perguntou, o assunto, o estado e a seta. Aqui é um link de verdade para a
// rota da pergunta.
export function LinhaDePergunta({ indicacao }: { indicacao: Indicacao }) {
  const estado = indicacao.is_resolved
    ? PERGUNTA.resolvida
    : indicacao.reply_count > 0
      ? PERGUNTA.resposta(indicacao.reply_count)
      : PERGUNTA.semResposta

  return (
    <Link
      href={`/comunidade/pergunta/${indicacao.id}`}
      className="flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3.5 transition-colors hover:bg-(--muted)"
    >
      <Avatar className={cn(indicacao.minha && "ring-2 ring-(--brasa)")}>
        <AvatarFallback className="bg-(--surface-high) text-xs font-bold">
          {indicacao.autor.iniciais}
        </AvatarFallback>
      </Avatar>
      <span className="grid min-w-0 grow gap-1">
        <b className="text-[15px] leading-5 font-semibold">{indicacao.title}</b>
        <small className="truncate text-xs text-(--muted-foreground)">
          {indicacao.minha ? "Você" : indicacao.autor.nome} ·{" "}
          {assuntoDe(indicacao.category, indicacao.bairro)}
        </small>
        <span>
          <Pilula tom={indicacao.is_resolved ? "ok" : "neutro"}>{estado}</Pilula>
        </span>
      </span>
      <Icone glifo={ChevronRight} className="size-5 text-(--muted-foreground)" />
    </Link>
  )
}
