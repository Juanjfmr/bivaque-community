"use client"

import { useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo, Formulario } from "@/components/bivaque/campos"
import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import {
  criarEncontro,
  type DadosDoEncontro,
  type Encontro,
  editarEncontro,
} from "@/lib/dados/eventos"
import {
  corpoDoEncontro,
  mensagemDaFalha,
  paraCampoDeDataHora,
  validarEncontro,
} from "@/src/eventos/formulario"

/**
 * A folha de criar e editar encontro.
 *
 * A mesma folha serve às duas portas porque o corpo é o mesmo: só o alcance
 * muda de lado, e o alcance não está aqui — vem da sessão, no servidor. Em
 * edição o título já vem preenchido e o alcance original não é oferecido, que é
 * a proibição da cláusula R35.
 *
 * Ao gravar, a tela vai para o detalhe do encontro gravado: o que aparece depois
 * é o que o banco devolveu, não o que o formulário achava que ia gravar.
 */
export function FormularioDeEncontro({
  encontro,
  aoFechar,
  aoSalvar,
}: {
  readonly encontro?: Encontro
  readonly aoFechar: () => void
  readonly aoSalvar: (id: string) => void
}) {
  const editando = encontro !== undefined
  const [titulo, setTitulo] = useState(encontro?.titulo ?? "")
  const [descricao, setDescricao] = useState(encontro?.descricao ?? "")
  const [comecaEm, setComecaEm] = useState(
    encontro === undefined ? "" : paraCampoDeDataHora(encontro.comecaEm),
  )
  const [local, setLocal] = useState(encontro?.local ?? "")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function gravar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando) return
    const dados: DadosDoEncontro = { titulo, descricao, comecaEm, local }
    const problema = validarEncontro(dados)
    if (problema !== null) {
      setErro(problema)
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      const corpo = corpoDoEncontro(dados)
      let id: string
      if (encontro === undefined) {
        id = await criarEncontro(corpo)
      } else {
        await editarEncontro(encontro.id, corpo)
        id = encontro.id
      }
      aoSalvar(id)
    } catch (falha: unknown) {
      setErro(mensagemDaFalha(falha))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sobreposicao
      id="folha"
      titulo={editando ? "Editar encontro" : "Novo encontro"}
      descricao="Quem pode ver é a cidade do encontro: ela vem do seu perfil."
      aoFechar={aoFechar}
    >
      <form onSubmit={(evento) => void gravar(evento)}>
        <Formulario>
          <Campo
            id="encontro-titulo"
            rotulo="Título"
            valor={titulo}
            aoMudar={setTitulo}
            maxLength={200}
            autoComplete="off"
          />
          <Campo
            id="encontro-quando"
            rotulo="Data e hora"
            type="datetime-local"
            valor={comecaEm}
            aoMudar={setComecaEm}
          />
          <Campo
            id="encontro-local"
            rotulo="Local"
            valor={local}
            aoMudar={setLocal}
            maxLength={200}
            nota="Ponto de referência público. Endereço residencial não vai no encontro."
            autoComplete="off"
          />
          <Campo
            id="encontro-descricao"
            rotulo="Sobre o encontro"
            valor={descricao}
            aoMudar={setDescricao}
            area
          />

          {erro === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Botao tom="texto" type="button" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : editando ? "Salvar" : "Criar"}
            </Botao>
          </div>
        </Formulario>
      </form>
    </Sobreposicao>
  )
}
