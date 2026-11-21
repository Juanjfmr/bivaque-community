import { useState } from "react"
import { type GrupoReal, salvarAviso } from "@/lib/dados/grupos"
import { Botao, CampoDeEscolha } from "@/src/pecas/pecas"

// Referência: https://mobbin.com/screens/099e490e-2e1a-4957-9bfb-8aca8597f832
export function ConviteEAvisos({ grupo }: { grupo: GrupoReal }) {
  const [mensagem, setMensagem] = useState("")
  const [link, setLink] = useState("")
  const [nivel, setNivel] = useState("")
  const [ocupado, setOcupado] = useState(false)
  async function convidar() {
    const url = new URL(`/app/grupo/${encodeURIComponent(grupo.id)}`, window.location.origin).href
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: grupo.nome, url })
          return
        } catch (erro) {
          if (erro instanceof Error && erro.name === "AbortError") return
        }
      }
      await navigator.clipboard.writeText(url)
      setMensagem("Link copiado.")
      setLink("")
    } catch {
      setLink(url)
      setMensagem("Não foi possível copiar. Selecione o link abaixo.")
    }
  }
  return (
    <section className="grid gap-2" aria-label="Convite e avisos">
      <Botao tom="contorno" onClick={() => void convidar()}>
        Convidar
      </Botao>
      <CampoDeEscolha
        id="avisos-grupo"
        rotulo="Avisos do grupo"
        opcoes={[
          { valor: "all", rotulo: "Tudo" },
          { valor: "highlights", rotulo: "Destaques" },
          { valor: "none", rotulo: "Nenhum" },
        ]}
        value={nivel}
        disabled={ocupado}
        onChange={(e) => {
          const novo = e.target.value
          if (!novo) return
          setOcupado(true)
          void salvarAviso(grupo.id, novo)
            .then(() => {
              setNivel(novo)
              setMensagem("Avisos atualizados.")
            })
            .catch(() => setMensagem("Não foi possível atualizar os avisos. Tente de novo."))
            .finally(() => setOcupado(false))
        }}
      />
      {mensagem ? <p role="status">{mensagem}</p> : null}
      {link ? (
        <input
          aria-label="Link do grupo"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </section>
  )
}
