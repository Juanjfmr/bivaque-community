"use client"

import { useEffect, useState } from "react"

import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import { criarEncontro, type Encontro, editarEncontro } from "@/lib/dados/eventos"
import {
  type CampoDoEncontro,
  corpoDoEncontro,
  type ErrosDoEncontro,
  encontroValido,
  errosDoEncontro,
  foiAbortada,
  instanteDoEncontro,
  mensagemDaFalha,
  paraDataEHora,
  type RascunhoDoEncontro,
  rotuloDeDataHora,
} from "@/src/eventos/formulario"
import { AreaDeTexto, Botao, Campo } from "@/src/pecas/pecas"

/**
 * A folha de criar e editar encontro.
 *
 * A mesma folha serve às duas portas porque o corpo é o mesmo: só o alcance
 * muda de lado, e o alcance não está aqui — vem da sessão, no servidor. Em
 * edição o título já vem preenchido e o alcance original não é oferecido, que é
 * a proibição da cláusula R35.
 *
 * Data e hora são dois campos de texto em pt-BR (dd/mm/aaaa e 24 h): o campo
 * nativo de data segue o idioma do navegador e num navegador em inglês mostra
 * mm/dd/yyyy com AM/PM. O erro nasce no campo que o originou, e a ação primária
 * fica desligada enquanto os obrigatórios não fecham.
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
  const [rascunho, setRascunho] = useState<RascunhoDoEncontro>(() => {
    const quando =
      encontro === undefined ? { data: "", hora: "" } : paraDataEHora(encontro.comecaEm)
    return {
      titulo: encontro?.titulo ?? "",
      descricao: encontro?.descricao ?? "",
      data: quando.data,
      hora: quando.hora,
      local: encontro?.local ?? "",
    }
  })
  // O erro de um campo aparece depois que a pessoa passou por ele: não acusa
  // quem ainda não digitou nada, e continua no lugar enquanto não for corrigido.
  const [tocados, setTocados] = useState<ReadonlySet<CampoDoEncontro>>(new Set())
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Fechar a folha cancela a gravação que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])

  const erros: ErrosDoEncontro = errosDoEncontro(rascunho)
  const valido = encontroValido(rascunho)
  const quando = instanteDoEncontro(rascunho)
  const erroDe = (campo: CampoDoEncontro): string | null =>
    tocados.has(campo) ? (erros[campo] ?? null) : null
  const tocar = (campo: CampoDoEncontro): void =>
    setTocados((atual) => (atual.has(campo) ? atual : new Set(atual).add(campo)))
  const mudar = (pedaco: Partial<RascunhoDoEncontro>): void =>
    setRascunho((atual) => ({ ...atual, ...pedaco }))

  async function gravar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando || !valido) return
    const corpo = corpoDoEncontro(rascunho)
    if (corpo === null) return
    setErroDoEnvio(null)
    setSalvando(true)
    try {
      let id: string
      if (encontro === undefined) {
        id = await criarEncontro(corpo, { signal: controle.signal })
      } else {
        await editarEncontro(encontro.id, corpo, { signal: controle.signal })
        id = encontro.id
      }
      aoSalvar(id)
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) {
        // O que a pessoa digitou continua na folha.
        setErroDoEnvio(mensagemDaFalha(falha, editando ? "editar" : "criar"))
      }
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
      <form onSubmit={(evento) => void gravar(evento)} noValidate>
        <div className="pc pc-embutido grid gap-4">
          <Campo
            id="encontro-titulo"
            rotulo="Título"
            value={rascunho.titulo}
            onChange={(evento) => mudar({ titulo: evento.target.value })}
            onBlur={() => tocar("titulo")}
            erro={erroDe("titulo")}
            maxLength={200}
            autoComplete="off"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="encontro-data"
              rotulo="Data"
              value={rascunho.data}
              onChange={(evento) => mudar({ data: evento.target.value })}
              onBlur={() => tocar("data")}
              erro={erroDe("data")}
              ajuda="dia/mês/ano"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              required
            />
            <Campo
              id="encontro-hora"
              rotulo="Hora"
              value={rascunho.hora}
              onChange={(evento) => mudar({ hora: evento.target.value })}
              onBlur={() => tocar("hora")}
              erro={erroDe("hora")}
              ajuda="24 h, como 19:30"
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              required
            />
          </div>
          <p className="pc-apoio" aria-live="polite" data-quando-do-encontro="sim">
            {quando === null ? "" : rotuloDeDataHora(quando)}
          </p>
          <Campo
            id="encontro-local"
            rotulo="Local"
            value={rascunho.local}
            onChange={(evento) => mudar({ local: evento.target.value })}
            onBlur={() => tocar("local")}
            erro={erroDe("local")}
            ajuda="Ponto de referência público. Endereço residencial não vai no encontro."
            maxLength={200}
            autoComplete="off"
          />
          <AreaDeTexto
            id="encontro-descricao"
            rotulo="Sobre o encontro"
            value={rascunho.descricao}
            onChange={(evento) => mudar({ descricao: evento.target.value })}
            onBlur={() => tocar("descricao")}
            erro={erroDe("descricao")}
            rows={4}
          />

          {erroDoEnvio === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erroDoEnvio}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Botao tom="texto" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              tom="principal"
              type="submit"
              disabled={salvando || !valido}
              carregando={salvando}
            >
              {salvando ? "Salvando…" : editando ? "Salvar" : "Criar"}
            </Botao>
          </div>
        </div>
      </form>
    </Sobreposicao>
  )
}
