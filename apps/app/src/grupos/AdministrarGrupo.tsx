import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  buscarGrupo,
  excluirGrupo,
  type GrupoReal,
  lerMembrosDoGrupo,
  type MembroDoGrupo,
  removerMembro,
  salvarRegras,
  transferirGrupo,
} from "@/lib/dados/grupos"
import { useNavegacao } from "@/lib/navegacao/react"
import { Pedidos } from "@/src/grupos/Pedidos"
import "./grupo-coluna.css"
import { AreaDeTexto, Avatar, Botao as BotaoPeca } from "@/src/pecas/pecas"

type Confirmacao = { tipo: "remover" | "transferir"; membro: MembroDoGrupo } | { tipo: "excluir" }
// Referências: https://mobbin.com/screens/c83c5c82-8402-4c6a-b21a-4d4ba27ffdfb
// https://mobbin.com/screens/673f3a4e-a32c-4920-a493-3a4dedfaae52
// https://mobbin.com/screens/f382312d-6d37-49a1-a8bc-674636b022de
export function AdministrarGrupo() {
  const { id = "" } = useParams({ strict: false }) as { id?: string }
  const navegacao = useNavegacao()
  const [grupo, setGrupo] = useState<GrupoReal | null>(null)
  const [membros, setMembros] = useState<readonly MembroDoGrupo[] | null>(null)
  const [erroMembros, setErroMembros] = useState(false)
  const [regras, setRegras] = useState("")
  const [erro, setErro] = useState("")
  const [retorno, setRetorno] = useState("")
  const [rodada, setRodada] = useState(0)
  const [rodadaMembros, setRodadaMembros] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    let ativo = true
    setErro("")
    void buscarGrupo(id)
      .then(async (dados) => {
        if (!ativo) return
        setGrupo(dados.grupo)
        setRegras(dados.grupo.regras)
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar a administração. Tente de novo.")
      })
    return () => {
      ativo = false
    }
  }, [id, rodada])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodadaMembros solicita nova leitura
  useEffect(() => {
    let ativo = true
    setMembros(null)
    setErroMembros(false)
    if (!grupo?.admin) return
    void lerMembrosDoGrupo(id)
      .then((lista) => {
        if (ativo) setMembros(lista)
      })
      .catch(() => {
        if (ativo) setErroMembros(true)
      })
    return () => {
      ativo = false
    }
  }, [id, grupo?.admin, rodadaMembros])
  async function executar() {
    if (!confirmacao) return
    setOcupado(true)
    setErro("")
    setRetorno("")
    try {
      if (confirmacao.tipo === "excluir") {
        await excluirGrupo(id)
        sessionStorage.setItem("grupo-excluido", "sim")
        await navegacao.irPara("comunidade")
        return
      }
      if (confirmacao.tipo === "remover") {
        await removerMembro(id, confirmacao.membro.id)
        setMembros((lista) => lista?.filter((m) => m.id !== confirmacao.membro.id) ?? null)
        setRetorno("Membro removido.")
      } else {
        await transferirGrupo(id, confirmacao.membro.id)
        setRetorno("Administração transferida.")
        setRodada((r) => r + 1)
      }
      setConfirmacao(null)
    } catch {
      setErro("Não foi possível concluir. Tente de novo.")
    } finally {
      setOcupado(false)
    }
  }
  if (erro && !grupo)
    return (
      <div role="alert">
        {erro}
        <Botao onClick={() => setRodada((r) => r + 1)}>Tentar de novo</Botao>
      </div>
    )
  if (!grupo) return <p>Carregando…</p>
  if (!grupo.admin)
    return (
      <section>
        <p>Você não administra este grupo.</p>
        <Botao tom="texto" onClick={() => void navegacao.irPara("grupo", { parametros: { id } })}>
          Voltar ao grupo
        </Botao>
      </section>
    )
  return (
    <section className="pc pc-embutido grupo-coluna grupo-administracao grid min-w-0 gap-4">
      <CabecaDePagina titulo={grupo.nome} subtitulo="Administrar grupo" />
      {retorno ? <p role="status">{retorno}</p> : null}
      {erro ? (
        <div role="alert">
          {erro}
          <Botao tom="texto" onClick={() => setRodada((r) => r + 1)}>
            Tentar de novo
          </Botao>
        </div>
      ) : null}
      <Pedidos id={id} />
      <section className="grid gap-2">
        <h2>Membros</h2>
        {erroMembros ? (
          <div role="alert">
            <p>Não foi possível carregar os membros.</p>
            <Botao onClick={() => setRodadaMembros((r) => r + 1)}>Tentar de novo</Botao>
          </div>
        ) : !membros ? (
          <p>Carregando membros…</p>
        ) : (
          membros.map((m) => (
            <div
              key={m.id}
              className="flex min-w-0 flex-wrap items-center gap-3 border-b border-(--border) py-3"
            >
              <Avatar nome={m.nome || "Membro"} />
              <b>{m.nome || "Membro"}</b>
              <span className="rounded-full bg-(--secondary) px-3 py-1 text-sm">
                {m.papel === "owner"
                  ? "Administrador"
                  : m.papel === "moderator"
                    ? "Moderador"
                    : "Membro"}
              </span>
              {m.papel !== "owner" && (grupo.dono || m.papel === "member") ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <BotaoPeca
                      tom="texto"
                      className="ml-auto"
                      aria-label={`Mais ações para ${m.nome || "Membro"}`}
                    >
                      ⋯
                    </BotaoPeca>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {grupo.dono ? (
                      <DropdownMenuItem
                        onSelect={() => setConfirmacao({ tipo: "transferir", membro: m })}
                      >
                        Passar a administração
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      className="text-(--destructive)!"
                      onSelect={() => setConfirmacao({ tipo: "remover", membro: m })}
                    >
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ))
        )}
      </section>
      {grupo.dono ? (
        <section className="grid gap-2">
          <h2>Regras</h2>
          <AreaDeTexto
            id="regras-grupo"
            rotulo="Regras do grupo"
            value={regras}
            onChange={(evento) => setRegras(evento.target.value)}
            aria-describedby="regras-contagem"
            maxLength={600}
          />
          <p id="regras-contagem" className="text-[13px] text-(--muted-foreground)">
            {regras.length}/600 caracteres
          </p>
          <BotaoPeca
            tom="principal"
            className="w-full max-w-80"
            disabled={ocupado || regras === grupo.regras}
            aria-disabled={ocupado || regras === grupo.regras}
            aria-describedby={regras === grupo.regras ? "regras-sem-alteracoes" : undefined}
            onClick={() => {
              setOcupado(true)
              setErro("")
              void salvarRegras(id, regras)
                .then(() => {
                  setGrupo((atual) => (atual ? { ...atual, regras } : atual))
                  setRetorno("Regras salvas.")
                })
                .catch(() => setErro("Não foi possível salvar as regras. Tente de novo."))
                .finally(() => setOcupado(false))
            }}
          >
            Salvar regras
          </BotaoPeca>
          {regras === grupo.regras ? <p id="regras-sem-alteracoes">Nada para salvar.</p> : null}
        </section>
      ) : null}
      {grupo.dono ? (
        <section className="grid gap-2 border-t border-(--border) pt-6">
          <h2>Excluir grupo</h2>
          <p>O grupo deixará de estar disponível para seus membros.</p>
          <BotaoPeca
            tom="contorno"
            className="border-(--destructive)! text-(--destructive)!"
            onClick={() => setConfirmacao({ tipo: "excluir" })}
          >
            Excluir grupo
          </BotaoPeca>
        </section>
      ) : null}
      <Dialog
        open={confirmacao !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !ocupado) setConfirmacao(null)
        }}
      >
        <DialogContent>
          <DialogTitle>
            {confirmacao?.tipo === "excluir"
              ? "Excluir grupo?"
              : confirmacao?.tipo === "transferir"
                ? "Passar a administração?"
                : "Remover membro?"}
          </DialogTitle>
          <DialogDescription>
            {confirmacao?.tipo === "transferir"
              ? "Você deixará de ser dono do grupo."
              : confirmacao?.tipo === "excluir"
                ? "O grupo deixará de estar disponível para seus membros."
                : "Esta pessoa deixará de participar do grupo."}
          </DialogDescription>
          {erro ? <p role="alert">{erro}</p> : null}
          <div className="flex gap-2">
            <Botao tom="texto" disabled={ocupado} onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao tom="contornado" disabled={ocupado} onClick={() => void executar()}>
              Confirmar
            </Botao>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
