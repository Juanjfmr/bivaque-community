import { useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Botao, BotaoDeIcone, Folha } from "@/src/pecas/pecas"
import { EU, type Publicacao } from "./dados"
import { MOTIVOS_DA_DENUNCIA, type MotivoDaDenuncia } from "./estado"
import type { PropsDaTela } from "./telas-grupos"

const base = import.meta.env.BASE_URL

type Passo = "acoes" | "denunciar" | "apagar"

/**
 * O "⋯" de toda publicação, como em todo app social: salvar, copiar o link,
 * ocultar e denunciar; quem publicou também apaga. No celular é uma folha que
 * sobe de baixo. Ocultar e denunciar somem com a publicação só para quem fez.
 */
export function MenuDaPublicacao({
  publicacao,
  despachar,
  avisar,
}: {
  publicacao: Publicacao
  despachar: PropsDaTela["despachar"]
  avisar: PropsDaTela["avisar"]
}) {
  const [aberta, setAberta] = useState(false)
  const [passo, setPasso] = useState<Passo>("acoes")
  const [motivo, setMotivo] = useState<MotivoDaDenuncia | null>(null)
  const minha = publicacao.autor === EU.curto

  const fechar = () => {
    setAberta(false)
    setPasso("acoes")
    setMotivo(null)
  }

  const salvar = () => {
    const antes = publicacao.salva
    despachar({ tipo: "salvar", publicacao: publicacao.id, valor: !antes })
    fechar()
    avisar(antes ? "Tirada dos salvos." : "Publicação salva.", () =>
      despachar({ tipo: "salvar", publicacao: publicacao.id, valor: antes }),
    )
  }

  const copiar = async () => {
    const link = `${window.location.origin}${base}publicacao/${publicacao.id}`
    fechar()
    try {
      await navigator.clipboard.writeText(link)
      avisar("Link copiado. É só colar na conversa.")
    } catch {
      avisar("Não deu para copiar o link. Tente de novo.")
    }
  }

  const ocultar = () => {
    despachar({ tipo: "ocultar", publicacao: publicacao.id, valor: true })
    fechar()
    avisar("Publicação oculta. Você não vê mais ela neste grupo.", () =>
      despachar({ tipo: "ocultar", publicacao: publicacao.id, valor: false }),
    )
  }

  const denunciar = () => {
    if (motivo === null) return
    despachar({ tipo: "denunciar", publicacao: publicacao.id, motivo })
    fechar()
    avisar("Denúncia enviada. A moderação analisa, e você não vê mais esta publicação.")
  }

  const apagar = () => {
    despachar({ tipo: "apagar", publicacao: publicacao.id })
    fechar()
    avisar("Publicação apagada.")
  }

  const titulo =
    passo === "denunciar"
      ? "Por que denunciar?"
      : passo === "apagar"
        ? "Apagar a publicação?"
        : `Publicação de ${publicacao.autor}`

  return (
    <>
      <BotaoDeIcone
        nome="more_vert"
        compacto
        rotulo={`Mais opções da publicação de ${publicacao.autor}`}
        aria-haspopup="dialog"
        className="pg-mais"
        onClick={() => setAberta(true)}
      />
      <Folha aberta={aberta} aoFechar={fechar} titulo={titulo}>
        {passo === "acoes" ? (
          <ul className="pg-menu">
            <li>
              <button type="button" className="pg-menu-item" onClick={salvar}>
                <Icone nome={publicacao.salva ? "bookmark_remove" : "bookmark"} />
                {publicacao.salva ? "Tirar dos salvos" : "Salvar"}
              </button>
            </li>
            <li>
              <button type="button" className="pg-menu-item" onClick={copiar}>
                <Icone nome="link" />
                Copiar link
              </button>
            </li>
            {minha ? (
              <li>
                <button type="button" className="pg-menu-item" onClick={() => setPasso("apagar")}>
                  <Icone nome="delete" />
                  Apagar publicação
                </button>
              </li>
            ) : (
              <>
                <li>
                  <button type="button" className="pg-menu-item" onClick={ocultar}>
                    <Icone nome="visibility_off" />
                    Ocultar publicação
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="pg-menu-item"
                    data-perigo="sim"
                    onClick={() => setPasso("denunciar")}
                  >
                    <Icone nome="flag" />
                    Denunciar
                  </button>
                </li>
              </>
            )}
          </ul>
        ) : null}

        {passo === "denunciar" ? (
          <form
            className="pg-denuncia"
            onSubmit={(evento) => {
              evento.preventDefault()
              denunciar()
            }}
          >
            <p className="pc-apoio">
              A moderação vê a denúncia, não quem denunciou. A publicação some para você agora.
            </p>
            <fieldset className="pg-motivos">
              <legend className="sr-only">Motivo</legend>
              {MOTIVOS_DA_DENUNCIA.map((opcao) => (
                <label key={opcao.valor} className="pg-motivo">
                  <input
                    type="radio"
                    name="motivo"
                    value={opcao.valor}
                    checked={motivo === opcao.valor}
                    onChange={() => setMotivo(opcao.valor)}
                  />
                  {opcao.rotulo}
                </label>
              ))}
            </fieldset>
            <Botao type="submit" tom="principal" cheio disabled={motivo === null}>
              Enviar denúncia
            </Botao>
          </form>
        ) : null}

        {passo === "apagar" ? (
          <div className="pg-denuncia">
            <p className="pc-apoio">Ela sai do grupo para todos, com os comentários.</p>
            <Botao tom="principal" cheio onClick={apagar}>
              Apagar
            </Botao>
            <Botao tom="texto" cheio onClick={() => setPasso("acoes")}>
              Voltar
            </Botao>
          </div>
        ) : null}
      </Folha>
    </>
  )
}
