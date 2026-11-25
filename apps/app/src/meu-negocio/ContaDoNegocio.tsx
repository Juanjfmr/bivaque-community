import { type FormEvent, useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { Secao } from "@/components/bivaque/secao"
import {
  type ContaDoNegocio as Conta,
  lerContaDoNegocio,
  salvarContaDoNegocio,
} from "@/lib/dados/prestador"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { Campo, Nota } from "@/src/pecas/pecas"

/**
 * Conta de Meu negócio (TROCA-005): o e-mail de acesso (somente leitura) e o
 * telefone público, opcional e opt-in. O telefone é o único dado daqui que muda
 * a ficha pública; a validação é a do servidor, e a recusa volta como frase.
 * O banco só deixa a conta de prestador gravar o contato da ficha: para a conta
 * de membro o formulário não aparece, em vez de prometer uma escrita recusada.
 */

export function ContaDoNegocio({
  tipoDaConta,
  irParaFicha,
}: {
  readonly tipoDaConta: "membro" | "prestador"
  readonly irParaFicha: () => void
}) {
  const [conta, setConta] = useState<Conta | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [telefone, setTelefone] = useState("")
  const [publico, setPublico] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const controle = new AbortController()
    setErro(null)
    void lerContaDoNegocio({ signal: controle.signal })
      .then((lida) => {
        if (controle.signal.aborted) return
        setConta(lida)
        setTelefone(lida.telefone ?? "")
        setPublico(lida.telefonePublico)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [rodada])

  async function gravar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando) return
    setSalvando(true)
    setMensagem(null)
    setAviso(null)
    try {
      const lida = await salvarContaDoNegocio({
        telefone: telefone.trim() === "" ? null : telefone.trim(),
        telefonePublico: publico,
      })
      setConta(lida)
      setAviso("Conta salva.")
    } catch (falha: unknown) {
      const mensagemDoServidor =
        falha !== null && typeof falha === "object" && "mensagem" in falha
          ? (falha as { mensagem: unknown }).mensagem
          : null
      setMensagem(
        typeof mensagemDoServidor === "string"
          ? mensagemDoServidor
          : "Não foi possível salvar a conta agora. Tente de novo.",
      )
    } finally {
      setSalvando(false)
    }
  }

  if (erro !== null) {
    return <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
  }
  if (conta === null) return <EsqueletoDeLista linhas={2} />

  return (
    <Secao titulo="Conta">
      <div className="grid gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-medium">Acesso</p>
          <p className="text-sm text-(--on-surface-variant)">
            {conta.email ?? "E-mail não disponível"}
          </p>
          <p className="text-[13px] text-(--on-surface-variant)">
            O e-mail de acesso é o da sua conta. Ele não aparece na ficha pública.
          </p>
        </div>

        {!conta.temFicha ? (
          <div className="grid gap-2">
            <Nota>Crie a página do negócio antes de editar a conta.</Nota>
            <div className="flex justify-start">
              <Botao tom="texto" onClick={irParaFicha}>
                Ir para a ficha
              </Botao>
            </div>
          </div>
        ) : tipoDaConta === "membro" ? (
          <Nota>O telefone na ficha pública é das contas de prestador.</Nota>
        ) : (
          <form className="grid gap-3" onSubmit={gravar} aria-busy={salvando} noValidate>
            <Campo
              id="conta-telefone"
              rotulo="Telefone de contato (opcional)"
              type="tel"
              inputMode="tel"
              value={telefone}
              onChange={(evento) => setTelefone(evento.target.value)}
              ajuda="Use DDD e número. Sem telefone, a ficha continua completa."
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={publico}
                onChange={(evento) => setPublico(evento.target.checked)}
              />
              Mostrar meu telefone na ficha pública
            </label>
            {mensagem === null ? null : (
              <p role="alert" className="text-sm text-(--destructive)">
                {mensagem}
              </p>
            )}
            {aviso === null ? null : (
              <p role="status" className="text-sm text-(--primary)">
                {aviso}
              </p>
            )}
            <div className="flex justify-end">
              <Botao type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar conta"}
              </Botao>
            </div>
          </form>
        )}
      </div>
    </Secao>
  )
}
