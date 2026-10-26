"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  excluirRascunhoDoGrupo,
  guardarEstadoLocal,
  guardarRascunhoDoGrupo,
  lerEstadoLocal,
  lerRascunhosDoGrupo,
  type EstadoDoGrupo,
} from "@/lib/grupos-locais"

export function InteracoesDoGrupo({
  id, cidade, fechado, membro, pendente, admin, sobre, regras, pedidos, children,
}: {
  readonly id: string
  readonly cidade: string
  readonly fechado: boolean
  readonly membro: boolean
  readonly pendente: boolean
  readonly admin: boolean
  readonly sobre: string
  readonly regras: string
  readonly pedidos: readonly { readonly nome: string; readonly nota: string }[]
  readonly children: ReactNode
}) {
  const [estadoLocal, setEstadoLocal] = useState<EstadoDoGrupo | null>(null)
  const [rascunhos, setRascunhos] = useState<string[]>([])
  const [escrevendo, setEscrevendo] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [texto, setTexto] = useState("")
  const [erro, setErro] = useState("")
  useEffect(() => {
    setEstadoLocal(lerEstadoLocal(cidade, id))
    setRascunhos(lerRascunhosDoGrupo(cidade, id))
  }, [cidade, id])

  const estado = estadoLocal ?? (membro ? "membro" : pendente ? "pendente" : "fora")
  const souMembro = estado === "membro"
  const souAdmin = admin && souMembro

  const atualizar = (proximo: EstadoDoGrupo) => {
    if (!guardarEstadoLocal(cidade, id, proximo)) {
      setErro("Não foi possível atualizar esta prévia. Nada foi enviado.")
      return
    }
    setEstadoLocal(proximo)
    setSaindo(false)
    setErro("")
  }

  const salvar = () => {
    const lista = guardarRascunhoDoGrupo(cidade, id, texto)
    if (!lista) {
      setErro("Informe 10 a 2000 caracteres e verifique o armazenamento da sessão.")
      return
    }
    setRascunhos(lista)
    setTexto("")
    setEscrevendo(false)
    setErro("")
  }

  return (
    <div data-grupo-interacoes="sim" className="grid min-w-0 gap-3">
      <section data-controles-grupo="sim" className="grid min-w-0 gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3">
        <p className="text-sm leading-6 text-(--on-surface-variant)">{sobre}</p>
        {souAdmin ? (
          <Etiqueta tom="ok" icone="verified_user">Administrador nesta prévia</Etiqueta>
        ) : estado === "fora" ? (
          <Botao data-acao="grupo-participar" icone={fechado ? "lock" : "group_add"} onClick={() => atualizar(fechado ? "pendente" : "membro")}>
            {fechado ? "Solicitar entrada" : "Participar do grupo"}
          </Botao>
        ) : estado === "pendente" ? (
          <div className="grid gap-2">
            <p data-estado-participacao="pendente" className="text-sm">Solicitação simulada. Nada foi enviado aos administradores.</p>
            <Botao tom="contornado" data-acao="cancelar-solicitacao" onClick={() => atualizar("fora")}>Cancelar solicitação</Botao>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span data-estado-participacao="membro" className="text-sm font-medium">Participando nesta prévia</span>
            <Botao tom="contornado" data-acao="sair-grupo" onClick={() => setSaindo(true)}>Sair do grupo</Botao>
          </div>
        )}
        {erro === "" ? null : <p role="alert" className="text-xs text-(--destructive)">{erro}</p>}
      </section>

      <details data-regras-grupo="sim" className="rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3">
        <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
          <Icone nome="gavel" className="size-5" /> Sobre o grupo e regras
        </summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-(--on-surface-variant)">{regras}</p>
      </details>

      {souAdmin && pedidos.length > 0 ? (
        <details data-pedidos-entrada="sim" className="rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3">
          <summary className="min-h-10 cursor-pointer text-sm font-semibold">Pedidos de entrada ({pedidos.length})</summary>
          <ul className="grid gap-2">
            {pedidos.map((pedido, indice) => (
              <li key={`pedido-${indice}`} className="rounded-xl bg-(--surface-low) p-3 text-sm">
                <b>{pedido.nome}</b>
                <p className="text-xs text-(--on-surface-variant)">{pedido.nota}</p>
              </li>
            ))}
          </ul>
          <small className="mt-2 block text-xs">Aprovar e recusar requerem o servidor; esta lista é ilustrativa.</small>
        </details>
      ) : null}

      {souMembro ? (
        <section data-compositor-grupo="sim" className="grid min-w-0 gap-2 rounded-2xl bg-(--surface-container) p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="text-sm">Publicações do grupo</b>
            <Botao tom="tonal" icone="edit_square" data-acao="escrever-grupo" onClick={() => setEscrevendo(true)}>Escrever</Botao>
          </div>
          {rascunhos.length === 0 ? (
            <small className="text-xs text-(--on-surface-variant)">Crie uma prévia sem publicar para outros membros.</small>
          ) : (
            <div data-rascunhos-grupo="sim" className="grid gap-2">
              <small className="text-xs font-medium">Seus rascunhos — não publicados ({rascunhos.length})</small>
              {rascunhos.map((rascunho, indice) => (
                <article key={`rascunho-${indice}-${rascunho}`} data-rascunho-grupo="sim" className="grid gap-2 rounded-xl bg-(--surface-lowest) p-3">
                  <p className="whitespace-pre-wrap break-words text-sm">{rascunho}</p>
                  <Botao tom="texto" className="justify-self-end" data-acao="excluir-rascunho-grupo" onClick={() => {
                    const lista = excluirRascunhoDoGrupo(cidade, id, indice)
                    if (!lista) { setErro("Não foi possível excluir o rascunho."); return }
                    setRascunhos(lista)
                  }}>Excluir</Botao>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-xl bg-(--surface-low) px-3 py-3 text-sm text-(--on-surface-variant)">
          {fechado ? "O conteúdo dos grupos fechados é reservado aos membros." : "Entre no grupo para escrever. Conheça as regras antes de participar."}
        </p>
      )}

      {souMembro || !fechado ? children : null}

      <Dialog open={saindo} onOpenChange={setSaindo}>
        <DialogContent unstyled data-dialogo="sair-grupo" className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-3 rounded-2xl bg-(--surface-lowest) p-5 shadow-xl">
          <DialogTitle>Sair deste grupo?</DialogTitle>
          <DialogDescription>Esta ação afeta somente a demonstração no seu navegador.</DialogDescription>
          <div className="flex justify-end gap-2">
            <Botao tom="texto" onClick={() => setSaindo(false)}>Cancelar</Botao>
            <Botao tom="contornado" data-acao="confirmar-saida-grupo" onClick={() => atualizar("fora")}>Sair do grupo</Botao>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={escrevendo} onOpenChange={setEscrevendo}>
        <DialogContent unstyled data-dialogo="escrever-grupo" className="fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[90dvh] w-full max-w-xl gap-3 overflow-y-auto rounded-t-2xl bg-(--surface-lowest) p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl">
          <DialogTitle>Escrever no grupo</DialogTitle>
          <DialogDescription>Este rascunho será salvo somente na sua sessão e não ficará visível para outros membros.</DialogDescription>
          <form className="grid gap-3" onSubmit={(evento) => { evento.preventDefault(); salvar() }}>
            <Campo id="texto-grupo" rotulo="Sua publicação" valor={texto} aoMudar={setTexto} area />
            <small className="text-xs text-(--on-surface-variant)">10 a 2000 caracteres, sem dados pessoais sensíveis.</small>
            <div className="flex justify-end gap-2">
              <Botao type="button" tom="texto" onClick={() => setEscrevendo(false)}>Cancelar</Botao>
              <Botao type="submit" data-acao="salvar-rascunho-grupo" disabled={texto.trim().length < 10 || texto.length > 2000}>Salvar rascunho</Botao>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
