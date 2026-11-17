import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { CATEGORIAS_DO_GUIA, type CategoriaDoGuia, sugerirLugar } from "@/lib/dados/guia"
import { CampoDeEscolha, Folha } from "@/src/pecas/pecas"
import { ROTULO_DA_CATEGORIA } from "./comum"

export function SugerirLugar() {
  const [aberta, setAberta] = useState(false)
  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState<CategoriaDoGuia>("school")
  const [descricao, setDescricao] = useState("")
  const [site, setSite] = useState("")
  const [telefone, setTelefone] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const campoNome = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberta) return
    const quadro = requestAnimationFrame(() => campoNome.current?.focus())
    return () => cancelAnimationFrame(quadro)
  }, [aberta])

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    setSucesso(false)
    try {
      await sugerirLugar({
        nome: nome.trim(),
        categoria,
        descricao: descricao.trim(),
        ...(site.trim() ? { site: site.trim() } : {}),
        ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
      })
      setSucesso(true)
      setNome("")
      setDescricao("")
      setSite("")
      setTelefone("")
    } catch (error) {
      setErro(
        error instanceof FalhaDaApi && error.mensagem
          ? error.mensagem
          : "Não foi possível enviar. Tente novamente.",
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Botao
        tom="contornado"
        data-acao="sugerir-lugar"
        onClick={() => {
          setErro(null)
          setSucesso(false)
          setAberta(true)
        }}
      >
        Sugerir um lugar
      </Botao>
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Sugerir referência">
        <form onSubmit={(evento) => void enviar(evento)} className="grid gap-4">
          <label className="grid gap-1">
            Nome
            <input
              ref={campoNome}
              id="sugestao-nome"
              required
              minLength={2}
              maxLength={120}
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
            />
          </label>
          <CampoDeEscolha
            id="sugestao-categoria"
            rotulo="Categoria"
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value as CategoriaDoGuia)}
            opcoes={CATEGORIAS_DO_GUIA.map((id) => ({
              valor: id,
              rotulo: ROTULO_DA_CATEGORIA[id],
            }))}
          />
          <label className="grid gap-1">
            Por que vale a pena
            <textarea
              id="sugestao-descricao"
              maxLength={500}
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
            />
          </label>
          <label className="grid gap-1">
            Site (opcional)
            <input type="url" value={site} onChange={(evento) => setSite(evento.target.value)} />
          </label>
          <label className="grid gap-1">
            Telefone (opcional)
            <input value={telefone} onChange={(evento) => setTelefone(evento.target.value)} />
          </label>
          {erro ? <p role="alert">{erro}</p> : null}
          {sucesso ? (
            <p role="status" aria-live="polite">
              Sugestão enviada. Ela entra na fila de curadoria do guia.
            </p>
          ) : null}
          <Botao type="submit" tom="preenchido" disabled={enviando || nome.trim().length < 2}>
            {enviando ? "Enviando…" : "Enviar sugestão"}
          </Botao>
        </form>
      </Folha>
    </>
  )
}
