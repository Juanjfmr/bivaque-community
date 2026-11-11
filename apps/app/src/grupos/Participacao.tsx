import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import { type GrupoReal, mudarParticipacao } from "@/lib/dados/grupos"
import { useSobreposicaoDaEntrada } from "@/lib/navegacao/react"

export function Participacao({
  grupo,
  aoMudar,
}: {
  grupo: GrupoReal
  aoMudar: (grupo: GrupoReal) => void
}) {
  const { aberto: pedindo, aoMudarAberto: setPedindo } = useSobreposicaoDaEntrada("dialogo")
  const { aberto: saindo, aoMudarAberto: setSaindo } = useSobreposicaoDaEntrada("grupo-sair")
  const [motivo, setMotivo] = useState("")
  const [erro, setErro] = useState("")
  const [ocupado, setOcupado] = useState(false)
  // Guarda síncrona para dois cliques antes do próximo commit do React.
  const mudancaPendente = useRef(false)
  const [boasVindas, setBoasVindas] = useState(false)
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])
  async function mudar(entrar: boolean) {
    if (mudancaPendente.current || controle.signal.aborted) return
    mudancaPendente.current = true
    setOcupado(true)
    setErro("")
    try {
      const salvo = await mudarParticipacao(grupo.id, entrar, motivo, { signal: controle.signal })
      if (controle.signal.aborted) return
      aoMudar(salvo)
      setBoasVindas(entrar && salvo.membro)
      setPedindo(false)
      setSaindo(false)
      setMotivo("")
    } catch (falha: unknown) {
      if (!controle.signal.aborted)
        setErro(
          falha instanceof FalhaDaApi && falha.mensagem
            ? falha.mensagem
            : "Não foi possível mudar sua participação. Tente de novo.",
        )
    } finally {
      mudancaPendente.current = false
      if (!controle.signal.aborted) setOcupado(false)
    }
  }
  return (
    <>
      <div
        data-controles-grupo="sim"
        className="grid gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
      >
        <p className="text-sm leading-6 text-(--on-surface-variant)">{grupo.descricao}</p>
        {grupo.admin ? (
          <Etiqueta tom="ok">Administrador</Etiqueta>
        ) : grupo.membro ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span data-estado-participacao="membro">Participando</span>
            <Botao
              tom="contornado"
              data-acao="sair-grupo"
              disabled={ocupado}
              onClick={() => setSaindo(true)}
            >
              Sair do grupo
            </Botao>
          </div>
        ) : grupo.pendente ? (
          <div className="grid gap-2">
            <p data-estado-participacao="pendente">Pedido enviado. Aguardando aprovação.</p>
            <Botao
              tom="contornado"
              data-acao="cancelar-solicitacao"
              disabled={ocupado}
              onClick={() => void mudar(false)}
            >
              Cancelar solicitação
            </Botao>
          </div>
        ) : (
          <Botao
            data-acao="grupo-participar"
            icone={grupo.fechado ? "lock" : "group_add"}
            disabled={ocupado}
            onClick={() => (grupo.fechado ? setPedindo(true) : void mudar(true))}
          >
            {ocupado ? "Enviando…" : grupo.fechado ? "Pedir entrada" : "Participar do grupo"}
          </Botao>
        )}
        {boasVindas ? <p role="status">Boas-vindas ao grupo! Diga olá em uma publicação.</p> : null}
        {erro && !pedindo && !saindo ? (
          <p role="alert" className="text-sm text-(--destructive)">
            {erro}
          </p>
        ) : null}
      </div>
      <Dialog
        open={pedindo}
        onOpenChange={(aberto) => {
          if (!mudancaPendente.current) setPedindo(aberto)
        }}
      >
        <DialogContent data-dialogo="pedir-grupo" aria-busy={ocupado}>
          <DialogTitle>Pedido de entrada</DialogTitle>
          <DialogDescription>
            O motivo é lido só por você e por quem aprova. Não inclua endereço, telefone, CPF ou
            dados de saúde.
          </DialogDescription>
          <Campo
            id="motivo-grupo"
            rotulo="Por que você quer entrar? (opcional)"
            valor={motivo}
            aoMudar={(valor) => {
              if (!mudancaPendente.current) setMotivo(valor)
            }}
            area
            nota={`${motivo.length}/300 caracteres`}
          />
          {erro ? (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Botao tom="texto" disabled={ocupado} onClick={() => setPedindo(false)}>
              Cancelar
            </Botao>
            <Botao
              disabled={ocupado || motivo.trim().length > 300}
              onClick={() => void mudar(true)}
            >
              {ocupado ? "Enviando…" : "Enviar pedido"}
            </Botao>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={saindo}
        onOpenChange={(aberto) => {
          if (!mudancaPendente.current) setSaindo(aberto)
        }}
      >
        <DialogContent data-dialogo="sair-grupo" aria-busy={ocupado}>
          <DialogTitle>Sair deste grupo?</DialogTitle>
          <DialogDescription>
            Você deixará de participar. Para voltar a um grupo fechado, será preciso pedir entrada
            novamente.
          </DialogDescription>
          {erro ? (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Botao tom="texto" disabled={ocupado} onClick={() => setSaindo(false)}>
              Cancelar
            </Botao>
            <Botao
              tom="contornado"
              data-acao="confirmar-saida-grupo"
              disabled={ocupado}
              onClick={() => void mudar(false)}
            >
              Sair do grupo
            </Botao>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
