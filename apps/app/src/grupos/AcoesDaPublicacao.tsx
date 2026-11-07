import { useEffect, useRef, useState } from "react"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AcaoDaPublicacao,
  agirNaPublicacao,
  denunciarPublicacao,
  type PublicacaoReal,
} from "@/lib/dados/grupos"
import { useSobreposicaoDaEntrada } from "@/lib/navegacao/react"

export function useAcoesDaPublicacao({
  admin,
  fixada,
  aoMudar,
}: {
  admin: boolean
  fixada: string | null
  aoMudar: (resultado: { publicacao: PublicacaoReal; fixada: string | null }) => void
}) {
  const { aberto, aoMudarAberto } = useSobreposicaoDaEntrada("menu-de-linha")
  const [selecionada, setSelecionada] = useState<PublicacaoReal | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [denunciando, setDenunciando] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [explicacao, setExplicacao] = useState("")
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])

  // A entrada guarda a sobreposição, não a publicação escolhida: uma recarga
  // com o menu aberto volta sem `selecionada`, e a casca deixaria o corpo
  // inerte com um diálogo que não existe. Fecha pela entrada anterior, que
  // guarda rolagem e foco.
  const fechandoSemAlvo = useRef(false)
  useEffect(() => {
    if (!aberto) {
      fechandoSemAlvo.current = false
      return
    }
    if (selecionada !== null || fechandoSemAlvo.current) return
    fechandoSemAlvo.current = true
    aoMudarAberto(false)
  }, [aberto, selecionada, aoMudarAberto])

  async function agir(p: PublicacaoReal, acao: AcaoDaPublicacao, valor: boolean) {
    if (ocupado) return
    setOcupado(true)
    setErro("")
    setAviso("")
    try {
      const salvo = await agirNaPublicacao(p.id, acao, valor, { signal: controle.signal })
      if (controle.signal.aborted) return
      aoMudar(salvo)
      aoMudarAberto(false)
      setAviso(
        acao === "util"
          ? "Útil atualizado."
          : acao === "salvar"
            ? salvo.publicacao.salva
              ? "Publicação salva."
              : "Publicação retirada dos salvos."
            : acao === "fixar"
              ? salvo.fixada === p.id
                ? "Publicação fixada."
                : "Publicação desafixada."
              : salvo.publicacao.oculta
                ? "Publicação oculta. Você pode desfazer em Ocultadas."
                : "Publicação visível novamente.",
      )
    } catch (falha: unknown) {
      if (!controle.signal.aborted)
        setErro(
          falha instanceof FalhaDaApi && falha.mensagem
            ? falha.mensagem
            : "Não foi possível gravar a ação. Tente de novo.",
        )
    } finally {
      if (!controle.signal.aborted) setOcupado(false)
    }
  }
  async function denunciar() {
    if (!selecionada || ocupado || !motivo) return
    setOcupado(true)
    setErro("")
    setAviso("")
    try {
      await denunciarPublicacao(selecionada.id, motivo, explicacao, { signal: controle.signal })
      if (controle.signal.aborted) return
      aoMudarAberto(false)
      setAviso("Denúncia enviada. A moderação vai analisar.")
    } catch (falha: unknown) {
      if (!controle.signal.aborted)
        setErro(
          falha instanceof FalhaDaApi && falha.mensagem
            ? falha.mensagem
            : "Não foi possível enviar a denúncia. Tente de novo.",
        )
    } finally {
      if (!controle.signal.aborted) setOcupado(false)
    }
  }
  return {
    util: (p: PublicacaoReal) => void agir(p, "util", !p.util),
    menu: (p: PublicacaoReal) => (
      <BotaoDeIcone
        nome="more_vert"
        rotulo="Opções da publicação"
        aberto="dialog"
        disabled={ocupado}
        onClick={() => {
          setSelecionada(p)
          setErro("")
          setDenunciando(false)
          setMotivo("")
          setExplicacao("")
          aoMudarAberto(true)
        }}
      />
    ),
    retorno: (
      <>
        {aviso ? <p role="status">{aviso}</p> : null}
        {erro && !aberto ? <p role="alert">{erro}</p> : null}
        <Dialog open={aberto && selecionada !== null} onOpenChange={aoMudarAberto}>
          <DialogContent>
            <DialogTitle>
              {denunciando ? "Denunciar publicação" : "Opções da publicação"}
            </DialogTitle>
            <DialogDescription>
              {denunciando
                ? "O motivo será enviado à moderação. Não inclua dados pessoais."
                : "Salvos e ocultadas são só seus."}
            </DialogDescription>
            {denunciando ? (
              <form
                className="grid gap-3"
                onSubmit={(evento) => {
                  evento.preventDefault()
                  void denunciar()
                }}
              >
                <fieldset className="grid gap-2">
                  <legend>Motivo</legend>
                  {[
                    ["spam", "Spam"],
                    ["conteudo-inadequado", "Conteúdo inadequado"],
                    ["informacao-enganosa", "Informação enganosa"],
                    ["outro", "Outro"],
                  ].map(([valor, rotulo]) => (
                    <label key={valor} className="flex min-h-11 items-center gap-3">
                      <input
                        type="radio"
                        name="motivo-denuncia"
                        value={valor}
                        checked={motivo === valor}
                        onChange={() => setMotivo(valor ?? "")}
                      />
                      {rotulo}
                    </label>
                  ))}
                </fieldset>
                <Campo
                  id="explicacao-denuncia"
                  rotulo="Explicação (opcional)"
                  valor={explicacao}
                  aoMudar={setExplicacao}
                  area
                  nota={`${explicacao.length}/300 caracteres`}
                />
                <Botao
                  type="submit"
                  disabled={ocupado || !motivo || explicacao.trim().length > 300}
                >
                  {ocupado ? "Enviando…" : "Enviar denúncia"}
                </Botao>
                <Botao type="button" tom="texto" onClick={() => setDenunciando(false)}>
                  Voltar às opções
                </Botao>
              </form>
            ) : selecionada ? (
              <div className="grid gap-2">
                <Botao
                  tom="texto"
                  disabled={ocupado}
                  onClick={() => void agir(selecionada, "salvar", !selecionada.salva)}
                >
                  {selecionada.salva ? "Tirar dos salvos" : "Salvar publicação"}
                </Botao>
                {!selecionada.propria ? (
                  <Botao tom="texto" disabled={ocupado} onClick={() => setDenunciando(true)}>
                    Denunciar publicação
                  </Botao>
                ) : null}
                {admin ? (
                  <Botao
                    tom="texto"
                    disabled={ocupado}
                    onClick={() => void agir(selecionada, "fixar", fixada !== selecionada.id)}
                  >
                    {fixada === selecionada.id ? "Desafixar publicação" : "Fixar publicação"}
                  </Botao>
                ) : null}
                <Botao
                  tom="texto"
                  disabled={ocupado}
                  onClick={() => void agir(selecionada, "ocultar", !selecionada.oculta)}
                >
                  {selecionada.oculta ? "Mostrar novamente" : "Ocultar publicação"}
                </Botao>
              </div>
            ) : null}
            {erro ? <p role="alert">{erro}</p> : null}
          </DialogContent>
        </Dialog>
      </>
    ),
  }
}
