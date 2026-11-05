"use client"

import { Botao } from "@/components/bivaque/botao"
import { Icone } from "@/components/bivaque/icone"
import { useNavegacao } from "@/lib/navegacao/react"

/**
 * Os dois estados de acesso que a tela precisa distinguir de "deu erro".
 *
 * Sessão vencida oferece a saída real — entrar de novo, que É o próximo passo.
 * Acesso negado não oferece "Tentar de novo": repetir a mesma chamada com a
 * mesma credencial daria o mesmo não, e um botão que não resolve é mentira.
 */
export function EstadoDeSessaoVencida() {
  const navegacao = useNavegacao()
  return (
    <div
      role="alert"
      data-estado="sessao-vencida"
      className="grid justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) px-5 py-8 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-(--muted)">
        <Icone nome="lock" className="size-6 text-(--on-surface-variant)" />
      </span>
      <h3>Sua sessão venceu</h3>
      <p className="max-w-md text-sm text-(--muted-foreground)">
        Entre de novo para continuar de onde parou.
      </p>
      <Botao onClick={() => void navegacao.irPara("entrar")}>Entrar de novo</Botao>
    </div>
  )
}

export function EstadoNegado({ texto }: { readonly texto: string }) {
  return (
    <div
      role="alert"
      data-estado="negado"
      className="grid justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) px-5 py-8 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-(--muted)">
        <Icone nome="lock" className="size-6 text-(--destructive)" />
      </span>
      <h3>Sem acesso</h3>
      <p className="max-w-md text-sm text-(--muted-foreground)">{texto}</p>
    </div>
  )
}
