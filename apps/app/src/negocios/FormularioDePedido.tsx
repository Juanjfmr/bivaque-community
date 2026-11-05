import { type FormEvent, useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo, Formulario } from "@/components/bivaque/campos"
import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import { criarPedido } from "@/lib/dados/negocios"
import { mensagemDoPedido, validarPedido } from "./formulario"

export function FormularioDePedido({
  negocioId,
  nome,
  aoFechar,
  aoSalvar,
}: {
  negocioId: string
  nome: string
  aoFechar: () => void
  aoSalvar: (id: string) => void
}) {
  const [descricao, setDescricao] = useState("")
  const [quando, setQuando] = useState("")
  const [chave] = useState(() => crypto.randomUUID())
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const controle = useRef<AbortController | null>(null)
  useEffect(() => () => controle.current?.abort(), [])

  async function gravar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (controle.current !== null) return
    const problema = validarPedido(descricao, quando)
    if (problema !== null) {
      setErro(problema)
      return
    }
    const envio = new AbortController()
    controle.current = envio
    setSalvando(true)
    setErro(null)
    try {
      const gravado = await criarPedido(
        negocioId,
        { descricao, quando, chave },
        { signal: envio.signal },
      )
      if (!envio.signal.aborted) aoSalvar(gravado.id)
    } catch (falha: unknown) {
      if (!envio.signal.aborted) setErro(mensagemDoPedido(falha))
    } finally {
      controle.current = null
      if (!envio.signal.aborted) setSalvando(false)
    }
  }

  return (
    <Sobreposicao
      id="contato-interesse"
      titulo="Pedir orçamento"
      descricao={`Conte para ${nome} o que você precisa.`}
      aoFechar={aoFechar}
    >
      <form onSubmit={(evento) => void gravar(evento)} aria-busy={salvando}>
        <Formulario>
          <Campo
            id="pedido-descricao"
            rotulo="O que você precisa?"
            area
            valor={descricao}
            aoMudar={setDescricao}
            nota={`${descricao.length}/500 caracteres. Inclua o bairro, sem informar seu endereço completo.`}
          />
          <Campo
            id="pedido-quando"
            rotulo="Quando precisa? (opcional)"
            valor={quando}
            aoMudar={setQuando}
            maxLength={120}
          />
          <p className="text-[13px] text-(--on-surface-variant)">
            Valores e pagamento são combinados entre vocês. O Bivaque não intermedeia pagamento nem
            garante o serviço.
          </p>
          {erro === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Botao tom="texto" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Enviando…" : "Enviar pedido"}
            </Botao>
          </div>
        </Formulario>
      </form>
    </Sobreposicao>
  )
}
