import { useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { type GrupoReal, salvarAviso } from "@/lib/dados/grupos"

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
      <Botao tom="contornado" onClick={() => void convidar()}>
        Convidar
      </Botao>
      <label htmlFor="avisos-grupo">Avisos do grupo</label>
      <select
        id="avisos-grupo"
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
      >
        <option value="">Escolha os avisos</option>
        <option value="all">Tudo</option>
        <option value="highlights">Destaques</option>
        <option value="none">Nenhum</option>
      </select>
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
