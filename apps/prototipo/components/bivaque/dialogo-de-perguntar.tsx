"use client"

import { Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cidadeAtual, fonteDeIndicacoes, type Indicacao } from "@/lib/dados/indicacoes"
import { FALHA_DA_DEMONSTRACAO } from "@/lib/demo/dados"
import { PERGUNTAR } from "@/lib/demo/textos"
import { termosDeBusca } from "@/lib/texto"
import { Icone } from "./icone"
import { LinhaDePergunta } from "./linha-de-pergunta"

// O diálogo de perguntar do protótipo (`features/community/editor.js`, openAsk +
// updateSimilar + submitAsk): o título, o detalhe, as perguntas parecidas que já
// foram resolvidas e o Publicar. O foco volta ao botão que abriu porque quem
// devolve é o Radix — não mexer nisso.
export function DialogoDePerguntar({
  aberto,
  aoMudarAberto,
  aoPublicar,
}: {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  aoPublicar: (indicacao: Indicacao) => void
}) {
  const [titulo, setTitulo] = useState("")
  const [detalhe, setDetalhe] = useState("")
  const [parecidas, setParecidas] = useState<Indicacao[] | null>(null)
  const [aviso, setAviso] = useState("")
  const [publicando, setPublicando] = useState(false)
  const pedidoAtual = useRef(0)

  useEffect(() => {
    if (aberto) return
    // Ao fechar, o próximo "Perguntar" começa limpo.
    pedidoAtual.current += 1
    setTitulo("")
    setDetalhe("")
    setParecidas(null)
    setAviso("")
    setPublicando(false)
  }, [aberto])

  useEffect(() => {
    if (!aberto || termosDeBusca(titulo).length < 1) {
      setParecidas(null)
      return
    }
    const meu = pedidoAtual.current + 1
    pedidoAtual.current = meu
    const relogio = setTimeout(() => {
      void fonteDeIndicacoes()
        .parecidas(titulo, cidadeAtual())
        .then((encontradas) => {
          // Resposta de um texto antigo não sobrescreve a do texto atual.
          if (meu === pedidoAtual.current) setParecidas(encontradas)
        })
        .catch(() => {
          if (meu === pedidoAtual.current) setParecidas(null)
        })
    }, 250)
    return () => clearTimeout(relogio)
  }, [titulo, aberto])

  async function publicar() {
    const limpo = titulo.trim()
    if (limpo.length < 8 || termosDeBusca(limpo).length < 2) {
      setAviso(PERGUNTAR.curta)
      return
    }
    setAviso("")
    setPublicando(true)
    try {
      const nova = await fonteDeIndicacoes().publicar({
        titulo: limpo,
        corpo: detalhe.trim(),
        bairro: null,
      })
      aoPublicar(nova)
    } catch {
      setAviso(FALHA_DA_DEMONSTRACAO)
    } finally {
      setPublicando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg leading-6">{PERGUNTAR.titulo}</DialogTitle>
          <DialogDescription>{PERGUNTAR.nota(cidadeAtual())}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="pergunta-titulo">
              {PERGUNTAR.campoTitulo}
            </label>
            <Input
              id="pergunta-titulo"
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              maxLength={200}
              minLength={8}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="pergunta-detalhe">
              {PERGUNTAR.campoDetalhe}
            </label>
            <Textarea
              id="pergunta-detalhe"
              value={detalhe}
              onChange={(evento) => setDetalhe(evento.target.value)}
              maxLength={2000}
              rows={3}
              aria-describedby="pergunta-detalhe-nota"
            />
            <p id="pergunta-detalhe-nota" className="text-xs text-(--muted-foreground)">
              {PERGUNTAR.campoDetalheNota}
            </p>
          </div>

          {parecidas !== null && (
            <div className="grid gap-2.5">
              {parecidas.length > 0 ? (
                <>
                  <h3 className="text-[15px]">{PERGUNTAR.parecidas}</h3>
                  <div className="grid gap-1 rounded-xl bg-(--surface-low) p-1">
                    {parecidas.map((indicacao) => (
                      <LinhaDePergunta key={indicacao.id} indicacao={indicacao} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-(--muted-foreground)">{PERGUNTAR.parecidasNada}</p>
              )}
            </div>
          )}

          {aviso !== "" && (
            <Alert variant="destructive" id="pergunta-erro">
              <AlertDescription>{aviso}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => aoMudarAberto(false)}>
            {PERGUNTAR.cancelar}
          </Button>
          <Button onClick={() => void publicar()} disabled={publicando}>
            <Icone glifo={Send} />
            {PERGUNTAR.publicar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
